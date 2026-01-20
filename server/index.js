import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { supabase } from './lib/supabase.js';
import { verifyToken, extractToken, hasRole, getUserRole } from './lib/auth.js';
import {
  validateQuestion,
  validatePoll,
  validateEmoji,
  validateDisplaySettings,
  isValidEventId
} from './lib/validation.js';
import {
  rateLimitPollCreate,
  rateLimitPollVote,
  rateLimitQASubmit,
  rateLimitSettingsUpdate
} from './lib/rateLimit.js';
import * as db from './lib/db.js';

const app = express();
const server = http.createServer(app);

// CORS configuration - use environment variable for production
const corsOptions = {
  origin: process.env.CLIENT_URL || ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST"],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// ============================================
// Socket.IO Authentication Middleware
// ============================================

// Store authenticated socket sessions: Map<socketId, { userId, role }>
const authenticatedSockets = new Map();

io.use(async (socket, next) => {
  try {
    const token = extractToken(socket);

    // Allow audience and avtech to connect without authentication
    const requestedRole = socket.handshake.auth?.role || 'audience';

    console.log(`[Auth] Socket connection attempt - Role: ${requestedRole}, Has token: ${!!token}`);

    if (requestedRole === 'audience' || requestedRole === 'avtech') {
      // Audience and AVTech don't need JWT authentication
      // AVTech uses password authentication handled separately
      authenticatedSockets.set(socket.id, {
        userId: socket.id, // Use socket ID as anonymous user ID
        role: requestedRole
      });
      console.log(`[Auth] ✓ ${requestedRole} connection allowed without auth`);
      return next();
    }

    // Producer and admin require authentication
    if (!token) {
      console.log('[Auth] ✗ No token provided for producer/admin role');
      return next(new Error('Authentication required for this role'));
    }

    // Verify the token
    const { user, error } = await verifyToken(token);

    if (error || !user) {
      console.log('[Auth] ✗ Token verification failed:', error?.message);
      return next(new Error('Invalid or expired token'));
    }

    console.log(`[Auth] Token verified for user: ${user.id}`);

    // Check if user has the requested role
    const hasPermission = await hasRole(user.id, requestedRole);

    console.log(`[Auth] Permission check - User ID: ${user.id}, Required role: ${requestedRole}, Has permission: ${hasPermission}`);

    if (!hasPermission) {
      // Get actual user role for debugging
      const { role: actualRole } = await getUserRole(user.id);
      console.log(`[Auth] ✗ Insufficient permissions - User role: ${actualRole}, Required: ${requestedRole}`);
      return next(new Error(`Insufficient permissions for role: ${requestedRole}`));
    }

    // Store authenticated session
    authenticatedSockets.set(socket.id, {
      userId: user.id,
      role: requestedRole,
      email: user.email
    });

    console.log(`[Auth] ✓ User authenticated successfully as ${requestedRole}`);
    next();
  } catch (error) {
    console.error('[Auth] Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Helper to get authenticated user from socket
function getAuthUser(socket) {
  return authenticatedSockets.get(socket.id);
}

// Helper to check if socket has required role
function requireRole(socket, requiredRole) {
  const authUser = getAuthUser(socket);
  if (!authUser) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const roleHierarchy = {
    admin: 4,
    producer: 3,
    avtech: 2,
    audience: 1
  };

  const userLevel = roleHierarchy[authUser.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    return {
      authorized: false,
      error: `Insufficient permissions. Required: ${requiredRole}, Current: ${authUser.role}`
    };
  }

  return { authorized: true, user: authUser };
}

// ============================================
// Emoji Queue System Configuration
// ============================================
const EMOJI_CONFIG = {
  maxOnScreen: 30,           // Max emojis displayed at once
  userCooldownMs: 200,       // Min time between user reactions (invisible rate limit)
  surgeThreshold: 20,        // Same emoji count within window to trigger surge
  surgeWindowMs: 2000,       // Time window for surge detection
  queueProcessIntervalMs: 50 // How often to process the queue
};

// ============================================
// In-Memory State (would use Redis in production)
// ============================================

// Track user cooldowns: Map<socketId, lastReactionTime>
const userCooldowns = new Map();

// Track emojis currently on display: Map<eventId, count>
const displayEmojiCounts = new Map();

// Track recent emojis for surge detection: Map<eventId, Array<{emoji, timestamp}>>
const recentEmojis = new Map();

// Emoji queue waiting to be displayed: Map<eventId, Array<{emoji, socketId}>>
const emojiQueues = new Map();

// Event to display mapping: Map<eventId, Set<displaySocketId>>
const eventDisplays = new Map();

// Event settings: Map<eventId, settings>
const eventSettings = new Map();

// Stats tracking: Map<eventId, stats>
const eventStats = new Map();

// ============================================
// Poll System State
// ============================================

// Polls for each event: Map<eventId, Map<pollId, pollData>>
const eventPolls = new Map();

// Votes for each poll: Map<pollId, Map<sessionId, optionId>>
const pollVotes = new Map();

// Timers for auto-closing polls: Map<pollId, timerId>
const pollTimers = new Map();

// Poll bundles for each event: Map<eventId, Map<bundleId, bundleData>>
const eventBundles = new Map();

// ============================================
// Emoji Pack System State
// ============================================

// Emoji packs for each event: Map<eventId, Map<packId, packData>>
const eventEmojiPacks = new Map();

// ============================================
// Q&A System State
// ============================================

// Q&A enabled state per event: Map<eventId, boolean>
const qaEnabled = new Map();

// Questions for each event: Map<eventId, Map<questionId, questionData>>
const eventQuestions = new Map();

// ============================================
// AVTech Password System State
// ============================================

// Event passwords: Map<eventId, password>
const eventPasswords = new Map();

// Default password for all events
const DEFAULT_AVTECH_PASSWORD = '0000';

// Get or initialize password for an event
function getEventPassword(eventId) {
  if (!eventPasswords.has(eventId)) {
    eventPasswords.set(eventId, DEFAULT_AVTECH_PASSWORD);
  }
  return eventPasswords.get(eventId);
}

// ============================================
// Timer/Countdown System State
// ============================================

// Timers for each event: Map<eventId, Map<timerId, timerData>>
const eventTimers = new Map();

// Active timer intervals for broadcasting: Map<timerId, intervalId>
const activeTimerIntervals = new Map();

/*
Timer data structure:
{
  id: string,
  eventId: string,
  name: string,
  type: 'countdown' | 'stopwatch',
  duration: number,        // milliseconds (for countdown)
  startedAt: number,       // Date.now() when started
  pausedAt: number | null,
  pausedElapsed: number,   // ms elapsed when paused
  status: 'ready' | 'running' | 'paused' | 'finished',
  showOnDisplay: boolean,
  position: string,
  size: string,
  createdAt: number
}
*/

// Get or create timers map for an event
function getEventTimers(eventId) {
  if (!eventTimers.has(eventId)) {
    eventTimers.set(eventId, new Map());
  }
  return eventTimers.get(eventId);
}

// Generate unique timer ID
function generateTimerId() {
  return `timer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Calculate elapsed time for a timer
function calculateTimerElapsed(timer) {
  if (timer.status === 'paused' || timer.status === 'ready') {
    return timer.pausedElapsed || 0;
  }
  if (timer.status === 'running') {
    return Date.now() - timer.startedAt + (timer.pausedElapsed || 0);
  }
  if (timer.status === 'finished') {
    return timer.type === 'countdown' ? timer.duration : (timer.pausedElapsed || 0);
  }
  return 0;
}

// Broadcast timer state to producer and AVTech
function broadcastTimerSync(eventId) {
  const timers = getEventTimers(eventId);
  const timersArray = Array.from(timers.values()).map(timer => ({
    ...timer,
    currentElapsed: calculateTimerElapsed(timer)
  }));

  io.to(`event:${eventId}:producer`).emit('timer:sync', timersArray);
  io.to(`event:${eventId}:avtech`).emit('timer:sync', timersArray);
}

// Broadcast all visible timers to display (supports up to 3 simultaneous timers)
function broadcastTimersToDisplay(eventId) {
  const timers = getEventTimers(eventId);
  const showingTimers = Array.from(timers.values())
    .filter(t => t.showOnDisplay)
    .map(timer => {
      const elapsed = calculateTimerElapsed(timer);
      return {
        ...timer,
        currentElapsed: elapsed,
        currentRemaining: timer.type === 'countdown'
          ? Math.max(0, timer.duration - elapsed)
          : elapsed
      };
    });

  io.to(`event:${eventId}:display`).emit('timer:display', {
    timers: showingTimers  // Array of timers (can be empty, 1, 2, or 3)
  });
}

// Finish a timer (when countdown reaches zero)
function finishTimer(eventId, timerId) {
  const timers = getEventTimers(eventId);
  const timer = timers.get(timerId);

  if (timer && timer.status === 'running') {
    timer.status = 'finished';
    timer.pausedElapsed = timer.duration;

    // Clear interval
    if (activeTimerIntervals.has(timerId)) {
      clearInterval(activeTimerIntervals.get(timerId));
      activeTimerIntervals.delete(timerId);
    }

    broadcastTimerSync(eventId);
    broadcastTimersToDisplay(eventId);
  }
}

/*
Question data structure:
{
  id: string,
  eventId: string,
  text: string,
  authorName: string,        // Anonymous or provided name
  status: 'pending' | 'approved' | 'rejected' | 'featured',
  createdAt: number,
  approvedAt: number | null,
  featuredAt: number | null
}
*/

// Active emoji pack per event: Map<eventId, packId>
const activeEmojiPack = new Map();

// Default emoji templates
const DEFAULT_EMOJI_TEMPLATES = {
  'standard': {
    id: 'standard',
    name: 'Standard',
    emojis: ['🔥', '❤️', '😂', '👏', '🎉', '👍', '😮', '🚀', '💯', '🙌', '😍', '🤩'],
    isTemplate: true
  },
  'reactions': {
    id: 'reactions',
    name: 'Reactions',
    emojis: ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🤔'],
    isTemplate: true
  },
  'celebration': {
    id: 'celebration',
    name: 'Celebration',
    emojis: ['🎉', '🎊', '🥳', '🎈', '🎁', '🏆', '⭐', '✨', '💫', '🌟'],
    isTemplate: true
  },
  'sports': {
    id: 'sports',
    name: 'Sports',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏆', '🥇', '🥈', '🥉', '💪', '👊'],
    isTemplate: true
  },
  'music': {
    id: 'music',
    name: 'Music & Entertainment',
    emojis: ['🎵', '🎶', '🎸', '🎹', '🎤', '🎧', '🎷', '🎺', '🥁', '🔥', '💃', '🕺'],
    isTemplate: true
  },
  'love': {
    id: 'love',
    name: 'Love & Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💘'],
    isTemplate: true
  }
};

// Get or create emoji packs for an event
function getEventEmojiPacks(eventId) {
  if (!eventEmojiPacks.has(eventId)) {
    eventEmojiPacks.set(eventId, new Map());
  }
  return eventEmojiPacks.get(eventId);
}

// Get active emoji pack for an event (returns emojis array)
function getActiveEmojis(eventId) {
  const packId = activeEmojiPack.get(eventId);

  // Check custom packs first
  const packs = getEventEmojiPacks(eventId);
  if (packId && packs.has(packId)) {
    return packs.get(packId).emojis;
  }

  // Check templates
  if (packId && DEFAULT_EMOJI_TEMPLATES[packId]) {
    return DEFAULT_EMOJI_TEMPLATES[packId].emojis;
  }

  // Default to standard
  return DEFAULT_EMOJI_TEMPLATES['standard'].emojis;
}

// Generate unique emoji pack ID
function generateEmojiPackId() {
  return `pack_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// Q&A Helper Functions
// ============================================

// Get or create questions map for an event
function getEventQuestions(eventId) {
  if (!eventQuestions.has(eventId)) {
    eventQuestions.set(eventId, new Map());
  }
  return eventQuestions.get(eventId);
}

// Generate unique question ID
function generateQuestionId() {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Check if Q&A is enabled for an event
function isQAEnabled(eventId) {
  return qaEnabled.get(eventId) || false;
}

// Broadcast Q&A state to producer and A/V tech (includes all questions)
function broadcastQASync(eventId) {
  const questions = getEventQuestions(eventId);
  const questionsArray = Array.from(questions.values());
  const enabled = isQAEnabled(eventId);

  const syncData = {
    enabled,
    questions: questionsArray
  };

  io.to(`event:${eventId}:producer`).emit('qa:sync', syncData);
  io.to(`event:${eventId}:avtech`).emit('qa:sync', syncData);
}

// Broadcast Q&A enabled state to audience
function broadcastQAStateToAudience(eventId) {
  const enabled = isQAEnabled(eventId);
  io.to(`event:${eventId}:audience`).emit('qa:state', { enabled });
}

// Broadcast featured question to display
function broadcastFeaturedQuestion(eventId) {
  const questions = getEventQuestions(eventId);
  const featured = Array.from(questions.values()).find(q => q.status === 'featured');
  const settings = getEventSettings(eventId);

  io.to(`event:${eventId}:display`).emit('qa:featured', {
    question: featured || null,
    position: settings.qaPosition,
    size: settings.qaSize
  });
}

// Get or create event settings
function getEventSettings(eventId) {
  if (!eventSettings.has(eventId)) {
    eventSettings.set(eventId, {
      emojisEnabled: true,
      maxOnScreen: 30,
      emojiSize: 'medium',
      animationSpeed: 'normal',
      spawnDirection: 'bottom-up',
      spawnPosition: 'wide',
      pollPosition: 'center',
      pollSize: 'medium',
      qaPosition: 'lower-third',
      qaSize: 'medium',
      timerPosition: 'center',
      timerSize: 'medium',
      timerStyle: 'digital',
      timerColor: '#ffffff'
    });
  }
  // Ensure timerStyle and timerColor exist (for settings created before these were added)
  const settings = eventSettings.get(eventId);
  if (!settings.timerStyle) settings.timerStyle = 'digital';
  if (!settings.timerColor) settings.timerColor = '#ffffff';
  return settings;
}

// Get or create event stats
function getEventStats(eventId) {
  if (!eventStats.has(eventId)) {
    eventStats.set(eventId, {
      totalReactions: 0,
      queueLength: 0,
      activeDisplays: 0
    });
  }
  return eventStats.get(eventId);
}

// Update and broadcast stats
function updateStats(eventId) {
  const stats = getEventStats(eventId);
  const queue = emojiQueues.get(eventId) || [];
  const displays = eventDisplays.get(eventId) || new Set();

  stats.queueLength = queue.length;
  stats.activeDisplays = displays.size;

  // Broadcast to A/V tech panel and producer
  io.to(`event:${eventId}:avtech`).emit('stats:update', stats);
  io.to(`event:${eventId}:producer`).emit('stats:update', stats);
}

// ============================================
// Poll Helper Functions
// ============================================

// Get or create polls map for an event
function getEventPolls(eventId) {
  if (!eventPolls.has(eventId)) {
    eventPolls.set(eventId, new Map());
  }
  return eventPolls.get(eventId);
}

// Get or create bundles map for an event
function getEventBundles(eventId) {
  if (!eventBundles.has(eventId)) {
    eventBundles.set(eventId, new Map());
  }
  return eventBundles.get(eventId);
}

// Generate unique bundle ID
function generateBundleId() {
  return `bundle_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Generate unique poll ID
function generatePollId() {
  return `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique option ID
function generateOptionId() {
  return `opt_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate poll results (supports both single and multi-select)
function calculatePollResults(pollId) {
  const votes = pollVotes.get(pollId) || new Map();
  const voteCounts = new Map();

  // Count votes per option
  votes.forEach((selection) => {
    if (selection instanceof Set) {
      // Multi-select: count each selected option
      selection.forEach(optionId => {
        voteCounts.set(optionId, (voteCounts.get(optionId) || 0) + 1);
      });
    } else {
      // Single select
      voteCounts.set(selection, (voteCounts.get(selection) || 0) + 1);
    }
  });

  // totalVotes = number of voters (not total selections)
  const totalVotes = votes.size;

  return {
    pollId,
    totalVotes,
    voteCounts: Object.fromEntries(voteCounts)
  };
}

// Broadcast poll state to producer and A/V tech
function broadcastPollSync(eventId) {
  const polls = getEventPolls(eventId);
  const pollsArray = Array.from(polls.values());

  console.log(`[BroadcastPollSync] Event: ${eventId}, Polls count: ${pollsArray.length}`);

  // Calculate results for each poll
  const pollsWithResults = pollsArray.map(poll => ({
    ...poll,
    results: calculatePollResults(poll.id)
  }));

  console.log(`[BroadcastPollSync] Broadcasting to rooms: event:${eventId}:producer and event:${eventId}:avtech`);
  io.to(`event:${eventId}:producer`).emit('poll:sync', pollsWithResults);
  io.to(`event:${eventId}:avtech`).emit('poll:sync', pollsWithResults);
}

// Broadcast poll to audience
function broadcastPollToAudience(eventId, poll) {
  if (poll.status === 'live') {
    io.to(`event:${eventId}:audience`).emit('poll:active', {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      allowChange: poll.allowChange,
      allowMultiple: poll.allowMultiple
    });
  } else if (poll.status === 'closed') {
    io.to(`event:${eventId}:audience`).emit('poll:closed', { pollId: poll.id });
  }
}

// Broadcast poll to display
function broadcastPollToDisplay(eventId, poll) {
  const results = calculatePollResults(poll.id);
  io.to(`event:${eventId}:display`).emit('poll:display', {
    poll: poll.showOnDisplay ? {
      id: poll.id,
      question: poll.question,
      options: poll.options,  // Now includes isCorrect field
      status: poll.status,
      showResults: poll.showResults,
      allowMultiple: poll.allowMultiple,
      results: results
    } : null
  });
}

// Close a poll (called by timer or manually)
function closePoll(eventId, pollId) {
  const polls = getEventPolls(eventId);
  const poll = polls.get(pollId);

  if (poll && poll.status === 'live') {
    poll.status = 'closed';
    poll.closedAt = Date.now();
    poll.showOnDisplay = false; // Automatically hide from display when closed

    // Persist status change to database
    db.updatePollStatus(pollId, 'closed').catch(err => {
      console.error('[Poll] DB error closing poll:', err);
    });

    // Clear timer if exists
    if (pollTimers.has(pollId)) {
      clearTimeout(pollTimers.get(pollId));
      pollTimers.delete(pollId);
    }

    // Broadcast updates
    broadcastPollSync(eventId);
    broadcastPollToAudience(eventId, poll);
    broadcastPollToDisplay(eventId, poll);

    console.log(`Poll closed: ${pollId} for event ${eventId}`);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Event Interactions server is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check polls state
app.get('/api/debug/polls', (req, res) => {
  const eventId = req.query.eventId || 'default';
  const polls = getEventPolls(eventId);
  const pollsArray = Array.from(polls.values());

  res.json({
    eventId,
    pollCount: pollsArray.length,
    polls: pollsArray.map(p => ({
      id: p.id,
      question: p.question,
      status: p.status,
      bundleId: p.bundleId,
      optionsCount: p.options?.length
    }))
  });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    // Try to query the organizations table
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      });
    }

    res.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Unexpected error',
      error: err.message
    });
  }
});

// ============================================
// Helper Functions
// ============================================

// Check if user is on cooldown
function isOnCooldown(socketId) {
  const lastTime = userCooldowns.get(socketId);
  if (!lastTime) return false;
  return Date.now() - lastTime < EMOJI_CONFIG.userCooldownMs;
}

// Update user cooldown
function updateCooldown(socketId) {
  userCooldowns.set(socketId, Date.now());
}

// Check for emoji surge (many of same emoji in short time)
function checkForSurge(eventId, emoji) {
  const now = Date.now();
  let recent = recentEmojis.get(eventId) || [];

  // Clean old entries
  recent = recent.filter(r => now - r.timestamp < EMOJI_CONFIG.surgeWindowMs);

  // Add new emoji
  recent.push({ emoji, timestamp: now });
  recentEmojis.set(eventId, recent);

  // Count this emoji in the window
  const sameEmojiCount = recent.filter(r => r.emoji === emoji).length;
  return sameEmojiCount >= EMOJI_CONFIG.surgeThreshold;
}

// Get displays for an event
function getDisplaysForEvent(eventId) {
  return eventDisplays.get(eventId) || new Set();
}

// Send emoji to all displays for an event
function sendEmojiToDisplays(eventId, emoji, isSurge = false) {
  const displays = getDisplaysForEvent(eventId);
  displays.forEach(displaySocketId => {
    io.to(displaySocketId).emit('reaction:display', {
      emoji,
      isSurge,
      timestamp: Date.now()
    });
  });
}

// Process emoji queue for an event
function processEmojiQueue(eventId) {
  const queue = emojiQueues.get(eventId);
  if (!queue || queue.length === 0) return;

  const currentCount = displayEmojiCounts.get(eventId) || 0;
  if (currentCount >= EMOJI_CONFIG.maxOnScreen) return;

  // Take one emoji from queue
  const { emoji } = queue.shift();

  // Check for surge
  const isSurge = checkForSurge(eventId, emoji);

  // Increment display count
  displayEmojiCounts.set(eventId, currentCount + 1);

  // Send to displays
  sendEmojiToDisplays(eventId, emoji, isSurge);

  // Decrement count after animation duration (roughly 4 seconds)
  setTimeout(() => {
    const count = displayEmojiCounts.get(eventId) || 1;
    displayEmojiCounts.set(eventId, Math.max(0, count - 1));
  }, 4000);
}

// Start queue processor for an event
const queueIntervals = new Map();
function startQueueProcessor(eventId) {
  if (queueIntervals.has(eventId)) return;

  const interval = setInterval(() => {
    processEmojiQueue(eventId);
  }, EMOJI_CONFIG.queueProcessIntervalMs);

  queueIntervals.set(eventId, interval);
}

// ============================================
// WebSocket Connection Handling
// ============================================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    userCooldowns.delete(socket.id);

    // Remove authenticated session
    authenticatedSockets.delete(socket.id);

    // Remove from any display rooms
    eventDisplays.forEach((displays, eventId) => {
      if (displays.has(socket.id)) {
        displays.delete(socket.id);
        console.log(`Display ${socket.id} left event ${eventId}`);
      }
    });
  });

  // Display joins an event
  socket.on('join-display', ({ displayId, eventId = 'default' }) => {
    console.log(`Display ${socket.id} joining event ${eventId} (display: ${displayId})`);

    // Add to display set for this event
    if (!eventDisplays.has(eventId)) {
      eventDisplays.set(eventId, new Set());
    }
    eventDisplays.get(eventId).add(socket.id);

    // Join socket room
    socket.join(`event:${eventId}:display`);

    // Send current settings to the display
    const settings = getEventSettings(eventId);
    socket.emit('settings:sync', settings);

    // Send current poll state to display
    const polls = getEventPolls(eventId);
    const visiblePoll = Array.from(polls.values()).find(p => p.showOnDisplay);
    if (visiblePoll) {
      const results = calculatePollResults(visiblePoll.id);
      socket.emit('poll:display', {
        poll: {
          id: visiblePoll.id,
          question: visiblePoll.question,
          options: visiblePoll.options,
          status: visiblePoll.status,
          showResults: visiblePoll.showResults,
          results: results
        }
      });
    }

    // Start queue processor if needed
    startQueueProcessor(eventId);

    // Send featured question if any
    const questions = getEventQuestions(eventId);
    const featured = Array.from(questions.values()).find(q => q.status === 'featured');
    if (featured) {
      socket.emit('qa:featured', { question: featured });
    }

    // Update stats (display count changed)
    updateStats(eventId);
  });

  // Audience joins an event
  socket.on('join-event', ({ eventId = 'default', role }) => {
    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Get authenticated user
    const authUser = getAuthUser(socket);
    if (!authUser) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Verify the requested role matches authenticated role
    if (authUser.role !== role) {
      socket.emit('error', {
        message: `Role mismatch. Authenticated as ${authUser.role}, requested ${role}`
      });
      return;
    }

    console.log(`[JoinEvent] ${role} ${socket.id} (user: ${authUser.userId}) joining event ${eventId}`);
    socket.join(`event:${eventId}:${role}`);
    console.log(`[JoinEvent] ✓ Socket ${socket.id} joined room: event:${eventId}:${role}`);

    // Send current settings to A/V tech panels when they join
    if (role === 'avtech') {
      console.log(`[JoinEvent] Sending initial data to AVTech ${socket.id}`);

      // Use setTimeout to ensure client listeners are ready
      setTimeout(() => {
        // Send settings
        const settings = getEventSettings(eventId);
        socket.emit('settings:sync', settings);

        // Send polls directly to this socket
        const polls = getEventPolls(eventId);
        const pollsArray = Array.from(polls.values());
        const pollsWithResults = pollsArray.map(poll => ({
          ...poll,
          results: calculatePollResults(poll.id)
        }));
        console.log(`[JoinEvent] Sending ${pollsWithResults.length} polls to AVTech`);
        socket.emit('poll:sync', pollsWithResults);

        // Send bundles
        const bundles = getEventBundles(eventId);
        const bundlesArray = Array.from(bundles.values());
        console.log(`[JoinEvent] Sending ${bundlesArray.length} bundles to AVTech:`, bundlesArray.map(b => b.name));
        socket.emit('bundle:sync', bundlesArray);

        // Send emoji packs
        const packs = getEventEmojiPacks(eventId);
        const activePackId = activeEmojiPack.get(eventId) || 'standard';
        socket.emit('emoji-pack:sync', {
          templates: Object.values(DEFAULT_EMOJI_TEMPLATES),
          customPacks: Array.from(packs.values()),
          activePackId
        });

        // Send Q&A state
        const questions = getEventQuestions(eventId);
        socket.emit('qa:sync', {
          enabled: isQAEnabled(eventId),
          questions: Array.from(questions.values())
        });

        // Send timers
        const timers = getEventTimers(eventId);
        const timersArray = Array.from(timers.values()).map(timer => ({
          ...timer,
          currentElapsed: calculateTimerElapsed(timer)
        }));
        console.log(`[JoinEvent] Sending ${timersArray.length} timers to AVTech`);
        socket.emit('timer:sync', timersArray);

        // Also send current stats
        updateStats(eventId);
      }, 50); // Small delay to ensure client listeners are ready
    }

    // Send current polls and bundles to producer when they join
    if (role === 'producer') {
      console.log(`[JoinEvent] Sending initial data to Producer ${socket.id}`);

      // Use setTimeout to ensure client listeners are ready
      setTimeout(() => {
        // Send polls directly to this socket
        const polls = getEventPolls(eventId);
        const pollsArray = Array.from(polls.values());
        const pollsWithResults = pollsArray.map(poll => ({
          ...poll,
          results: calculatePollResults(poll.id)
        }));
        console.log(`[JoinEvent] Sending ${pollsWithResults.length} polls to producer:`, JSON.stringify(pollsWithResults.map(p => ({ id: p.id, question: p.question, bundleId: p.bundleId }))));
        socket.emit('poll:sync', pollsWithResults);

        // Send bundles
        const bundles = getEventBundles(eventId);
        socket.emit('bundle:sync', Array.from(bundles.values()));

        // Send emoji packs
        const packs = getEventEmojiPacks(eventId);
        const activePackId = activeEmojiPack.get(eventId) || 'standard';
        socket.emit('emoji-pack:sync', {
          templates: Object.values(DEFAULT_EMOJI_TEMPLATES),
          customPacks: Array.from(packs.values()),
          activePackId
        });

        // Send Q&A state
        const questions = getEventQuestions(eventId);
        socket.emit('qa:sync', {
          enabled: isQAEnabled(eventId),
          questions: Array.from(questions.values())
        });

        // Send timers
        const timers = getEventTimers(eventId);
        const timersArray = Array.from(timers.values()).map(timer => ({
          ...timer,
          currentElapsed: calculateTimerElapsed(timer)
        }));
        console.log(`[JoinEvent] Sending ${timersArray.length} timers to Producer`);
        socket.emit('timer:sync', timersArray);

        updateStats(eventId);
      }, 50); // Small delay to ensure client listeners are ready
    }

    // Send active poll and emojis to audience when they join
    if (role === 'audience') {
      const polls = getEventPolls(eventId);
      const livePoll = Array.from(polls.values()).find(p => p.status === 'live');
      if (livePoll) {
        socket.emit('poll:active', {
          id: livePoll.id,
          question: livePoll.question,
          options: livePoll.options,
          allowChange: livePoll.allowChange,
          allowMultiple: livePoll.allowMultiple
        });
      }

      // Send active emoji list
      const activeEmojis = getActiveEmojis(eventId);
      socket.emit('emoji:list', activeEmojis);

      // Send Q&A enabled state
      socket.emit('qa:state', { enabled: isQAEnabled(eventId) });
    }
  });

  // Audience sends a reaction
  socket.on('reaction:send', async ({ emoji, eventId = 'default' }) => {
    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Validate emoji
    const validation = validateEmoji({ emoji });
    if (!validation.valid) {
      socket.emit('error', { message: validation.error });
      return;
    }

    // Check if emojis are enabled
    const settings = getEventSettings(eventId);
    if (!settings.emojisEnabled) {
      return; // Silently ignore when disabled
    }

    // Check cooldown (invisible rate limiting)
    if (isOnCooldown(socket.id)) {
      socket.emit('reaction:cooldown');
      return;
    }

    // Update cooldown
    updateCooldown(socket.id);

    // Initialize queue if needed
    if (!emojiQueues.has(eventId)) {
      emojiQueues.set(eventId, []);
    }

    // Add to queue (use sanitized emoji)
    emojiQueues.get(eventId).push({ emoji: validation.sanitized.emoji, socketId: socket.id });

    // Update stats
    const stats = getEventStats(eventId);
    stats.totalReactions++;
    updateStats(eventId);

    // Record reaction to database for analytics (fire and forget)
    db.getOrCreateEvent(eventId).then(({ data: eventData }) => {
      if (eventData?.id) {
        db.recordReaction(eventData.id, validation.sanitized.emoji, socket.id);
      }
    }).catch(() => {}); // Silently ignore DB errors for analytics

    // Start queue processor if needed
    startQueueProcessor(eventId);

    console.log(`Reaction queued: ${validation.sanitized.emoji} from ${socket.id} for event ${eventId}`);
  });

  // Debug: Log ALL incoming events from this socket
  const originalOn = socket.on.bind(socket);
  socket.onAny((eventName, ...args) => {
    console.log(`[Debug] Socket ${socket.id} received event: ${eventName}`, JSON.stringify(args).substring(0, 200));
  });

  // A/V Tech: Update settings
  socket.on('settings:update', ({ eventId = 'default', ...newSettings }) => {
    console.log(`[Settings] Received settings:update from ${socket.id}:`, newSettings);

    // Check authorization - only avtech and producer can update settings
    const authUser = getAuthUser(socket);
    console.log(`[Settings] AuthUser:`, authUser);
    if (!authUser || (authUser.role !== 'avtech' && authUser.role !== 'producer' && authUser.role !== 'admin')) {
      console.log(`[Settings] Authorization failed for ${socket.id}`);
      socket.emit('error', { message: 'Unauthorized: Only A/V Tech or Producer can update settings' });
      return;
    }

    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Rate limit settings updates
    const rateLimit = rateLimitSettingsUpdate(authUser.userId);
    if (!rateLimit.allowed) {
      socket.emit('error', {
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    // Validate settings
    const validation = validateDisplaySettings(newSettings);
    if (!validation.valid) {
      socket.emit('error', { message: validation.error });
      return;
    }

    const settings = getEventSettings(eventId);
    Object.assign(settings, validation.sanitized);

    // If maxOnScreen changed, update the config for this event
    if (validation.sanitized.maxOnScreen !== undefined) {
      // This will be used in processEmojiQueue
    }

    // Broadcast settings to all connected A/V tech panels for this event
    io.to(`event:${eventId}:avtech`).emit('settings:sync', settings);

    // Also broadcast to displays so they can adjust size/speed
    io.to(`event:${eventId}:display`).emit('settings:sync', settings);

    console.log(`[Settings] Updated for event ${eventId}:`, validation.sanitized);
    console.log(`[Settings] Full settings being broadcast:`, JSON.stringify(settings));

    // Log timer style/color updates specifically
    if (validation.sanitized.timerStyle || validation.sanitized.timerColor) {
      console.log(`[Settings] Timer style/color update - style: ${settings.timerStyle}, color: ${settings.timerColor}`);
    }
  });

  // A/V Tech: Clear queue
  socket.on('queue:clear', ({ eventId = 'default' }) => {
    if (emojiQueues.has(eventId)) {
      emojiQueues.set(eventId, []);
      updateStats(eventId);
      console.log(`Queue cleared for event ${eventId}`);
    }
  });

  // A/V Tech: Test emoji (bypasses queue, sends directly)
  socket.on('reaction:test', ({ eventId = 'default', emoji }) => {
    sendEmojiToDisplays(eventId, emoji, false);
    console.log(`Test emoji sent: ${emoji} for event ${eventId}`);
  });

  // A/V Tech: Test surge (sends burst of same emoji with surge effect)
  socket.on('reaction:test-surge', ({ eventId = 'default', emoji }) => {
    // Send multiple emojis rapidly with surge flag
    const burstCount = 8;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        sendEmojiToDisplays(eventId, emoji, true);
      }, i * 100); // Stagger by 100ms
    }
    console.log(`Test surge sent: ${emoji} x${burstCount} for event ${eventId}`);
  });

  // Legacy test event
  socket.on('test', (data) => {
    console.log('Received test event:', data);
    socket.emit('test-response', { received: data, serverTime: new Date().toISOString() });
  });

  // ============================================
  // Poll Socket Events
  // ============================================

  // Producer creates a new poll
  socket.on('poll:create', async ({
    eventId = 'default',
    question,
    options,
    allowChange = false,
    durationSeconds = null,
    allowMultiple = false,
    liveResults = false,
    bundleId = null
  }) => {
    // Check authorization - only producer and admin can create polls
    const authUser = getAuthUser(socket);
    if (!authUser || (authUser.role !== 'producer' && authUser.role !== 'admin')) {
      socket.emit('error', { message: 'Unauthorized: Only Producer can create polls' });
      return;
    }

    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Rate limit poll creation
    const rateLimit = rateLimitPollCreate(authUser.userId);
    if (!rateLimit.allowed) {
      socket.emit('error', {
        message: `Rate limit exceeded. You can create ${rateLimit.retryAfter} more polls in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`
      });
      return;
    }

    // Validate poll data
    const validation = validatePoll({
      question,
      options,
      durationSeconds,
      allowChange,
      allowMultiple
    });

    if (!validation.valid) {
      socket.emit('error', { message: validation.error });
      return;
    }

    // Get or create event in database
    const { data: eventData } = await db.getOrCreateEvent(eventId);
    const dbEventId = eventData?.id;

    // Create poll in database
    let dbPoll = null;
    if (dbEventId) {
      const { data, error } = await db.createPoll(dbEventId, {
        question: validation.sanitized.question,
        options: validation.sanitized.options,
        allowChange: validation.sanitized.allowChange,
        allowMultiple: validation.sanitized.allowMultiple,
        duration: validation.sanitized.durationSeconds
      });

      if (error) {
        console.error('[PollCreate] Database error:', error);
        // Continue with in-memory only if DB fails
      } else {
        dbPoll = data;
      }
    }

    const polls = getEventPolls(eventId);
    const pollId = dbPoll?.id || generatePollId();

    // Create options with IDs using sanitized data (use DB IDs if available)
    const pollOptions = dbPoll?.options
      ? dbPoll.options.map((opt, index) => ({
          id: opt.id,
          text: opt.text,
          sortOrder: opt.sort_order,
          isCorrect: false
        }))
      : validation.sanitized.options.map((text, index) => ({
          id: generateOptionId(),
          text,
          sortOrder: index,
          isCorrect: false
        }));

    // Check if adding to a bundle
    let finalBundleId = null;
    let bundleOrder = null;

    if (bundleId) {
      const bundles = getEventBundles(eventId);
      const bundle = bundles.get(bundleId);
      if (bundle && bundle.status === 'ready') {
        finalBundleId = bundleId;
        bundleOrder = bundle.pollIds.length;

        // Add to bundle in database
        if (dbPoll) {
          await db.addPollToBundle(bundleId, pollId, bundleOrder);
        }
      }
    }

    const poll = {
      id: pollId,
      eventId,
      question: validation.sanitized.question,
      options: pollOptions,
      status: 'ready',
      allowChange: validation.sanitized.allowChange,
      allowMultiple: validation.sanitized.allowMultiple,
      liveResults,
      showResults: false,
      showOnDisplay: false,
      durationSeconds: validation.sanitized.durationSeconds,
      createdAt: Date.now(),
      openedAt: null,
      closedAt: null,
      bundleId: finalBundleId,
      bundleOrder
    };

    polls.set(pollId, poll);
    pollVotes.set(pollId, new Map());

    // If adding to bundle, update the bundle's pollIds
    if (finalBundleId) {
      const bundles = getEventBundles(eventId);
      const bundle = bundles.get(finalBundleId);
      if (bundle) {
        bundle.pollIds.push(pollId);
        broadcastBundleSync(eventId);
      }
    }

    // Sync to producer and A/V tech
    console.log(`[PollCreate] Poll ${pollId} created, broadcasting sync...`);
    console.log(`[PollCreate] Sockets in event:${eventId}:producer room:`, io.sockets.adapter.rooms.get(`event:${eventId}:producer`)?.size || 0);
    broadcastPollSync(eventId);

    console.log(`[PollCreate] ✓ Poll created: ${pollId} for event ${eventId}${finalBundleId ? ` in bundle ${finalBundleId}` : ''}${dbPoll ? ' (persisted to DB)' : ' (in-memory only)'}`);
  });

  // Producer updates a poll (only when status is 'ready')
  socket.on('poll:update', ({ eventId = 'default', pollId, question, options, allowChange, durationSeconds }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && poll.status === 'ready') {
      if (question !== undefined) poll.question = question;
      if (allowChange !== undefined) poll.allowChange = allowChange;
      if (durationSeconds !== undefined) poll.durationSeconds = durationSeconds;

      if (options !== undefined) {
        poll.options = options.map((text, index) => ({
          id: generateOptionId(),
          text,
          sortOrder: index
        }));
        // Clear any existing votes since options changed
        pollVotes.set(pollId, new Map());
      }

      broadcastPollSync(eventId);
      console.log(`Poll updated: ${pollId} for event ${eventId}`);
    }
  });

  // Producer deletes a poll (only when status is 'ready')
  socket.on('poll:delete', async ({ eventId = 'default', pollId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && poll.status === 'ready') {
      // Delete from database
      await db.deletePoll(pollId);

      polls.delete(pollId);
      pollVotes.delete(pollId);

      broadcastPollSync(eventId);
      console.log(`Poll deleted: ${pollId} for event ${eventId}`);
    }
  });

  // A/V Tech sends poll to display (opens voting)
  socket.on('poll:send-to-display', async ({ eventId = 'default', pollId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && poll.status === 'ready') {
      // Check if another poll is already live
      const hasLivePoll = Array.from(polls.values()).some(p => p.status === 'live');
      if (hasLivePoll) {
        socket.emit('poll:error', { message: 'Another poll is already live' });
        return;
      }

      poll.status = 'live';
      poll.showOnDisplay = true;
      poll.openedAt = Date.now();

      // If liveResults is enabled, automatically show results
      if (poll.liveResults) {
        poll.showResults = true;
      }

      // Persist status change to database
      db.updatePollStatus(pollId, 'live').catch(err => {
        console.error('[Poll] DB error updating poll status:', err);
      });

      // Set up auto-close timer if duration specified
      if (poll.durationSeconds) {
        const timerId = setTimeout(() => {
          closePoll(eventId, pollId);
        }, poll.durationSeconds * 1000);
        pollTimers.set(pollId, timerId);
      }

      // Broadcast to all
      broadcastPollSync(eventId);
      broadcastPollToAudience(eventId, poll);
      broadcastPollToDisplay(eventId, poll);

      console.log(`Poll sent to display: ${pollId} for event ${eventId}`);
    }
  });

  // A/V Tech toggles showing results on display
  socket.on('poll:show-results', async ({ eventId = 'default', pollId, show }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && (poll.status === 'live' || poll.status === 'closed')) {
      poll.showResults = show;

      // Persist to database
      db.updatePoll(pollId, { show_results: show }).catch(err => {
        console.error('[Poll] DB error updating show_results:', err);
      });

      broadcastPollSync(eventId);
      broadcastPollToDisplay(eventId, poll);

      console.log(`Poll results ${show ? 'shown' : 'hidden'}: ${pollId} for event ${eventId}`);
    }
  });

  // A/V Tech closes voting on a poll
  socket.on('poll:close', ({ eventId = 'default', pollId }) => {
    closePoll(eventId, pollId);
  });

  // A/V Tech hides poll from display
  socket.on('poll:hide', ({ eventId = 'default', pollId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll) {
      poll.showOnDisplay = false;

      broadcastPollSync(eventId);
      broadcastPollToDisplay(eventId, poll);

      console.log(`Poll hidden from display: ${pollId} for event ${eventId}`);
    }
  });

  // A/V Tech resets a poll back to ready status
  socket.on('poll:reset', async ({ eventId = 'default', pollId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && (poll.status === 'live' || poll.status === 'closed')) {
      // Clear any active timer
      if (pollTimers.has(pollId)) {
        clearTimeout(pollTimers.get(pollId));
        pollTimers.delete(pollId);
      }

      // Reset poll state
      poll.status = 'ready';
      poll.showResults = false;
      poll.showOnDisplay = false;
      poll.openedAt = null;
      poll.closedAt = null;

      // Clear votes in memory
      pollVotes.set(pollId, new Map());

      // Persist reset to database
      db.updatePollStatus(pollId, 'ready', {
        show_results: false,
        opened_at: null,
        closed_at: null
      }).catch(err => {
        console.error('[Poll] DB error resetting poll:', err);
      });

      // Clear votes in database
      db.clearPollVotes(pollId).catch(err => {
        console.error('[Poll] DB error clearing votes:', err);
      });

      // Broadcast updates
      broadcastPollSync(eventId);
      broadcastPollToAudience(eventId, poll);
      broadcastPollToDisplay(eventId, poll);

      console.log(`Poll reset: ${pollId} for event ${eventId}`);
    }
  });

  // Audience votes on a poll (supports single and multi-select)
  socket.on('poll:vote', async ({ eventId = 'default', pollId, optionId, optionIds }) => {
    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('poll:vote-error', { message: 'Invalid event ID' });
      return;
    }

    // Get authenticated user
    const authUser = getAuthUser(socket);
    if (!authUser) {
      socket.emit('poll:vote-error', { message: 'Not authenticated' });
      return;
    }

    // Rate limit voting
    const rateLimit = rateLimitPollVote(authUser.userId);
    if (!rateLimit.allowed) {
      socket.emit('poll:vote-error', {
        message: `Too many votes. Try again in ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (!poll || poll.status !== 'live') {
      socket.emit('poll:vote-error', { message: 'Poll is not active' });
      return;
    }

    const votes = pollVotes.get(pollId);
    const existingVote = votes.get(socket.id);

    // Check if changing vote is allowed (for non-multi-select)
    if (existingVote && !poll.allowChange && !poll.allowMultiple) {
      socket.emit('poll:vote-error', { message: 'Vote already submitted' });
      return;
    }

    if (poll.allowMultiple) {
      // Multi-select: optionIds is an array of selected options
      const selections = new Set(optionIds || [optionId]);

      // Validate all options exist
      const validSelections = [...selections].filter(id =>
        poll.options.some(opt => opt.id === id)
      );

      if (validSelections.length === 0) {
        socket.emit('poll:vote-error', { message: 'No valid options selected' });
        return;
      }

      // Store as Set in memory
      votes.set(socket.id, new Set(validSelections));

      // Persist to database (fire and forget for performance)
      // First clear existing votes for this session, then add new ones
      (async () => {
        try {
          // Clear existing votes for this session on this poll
          await db.clearPollVotes(pollId);

          // Record each selected option
          for (const optId of validSelections) {
            await db.recordVote(pollId, optId, socket.id, true);
          }
        } catch (err) {
          console.error('[Vote] DB error recording multi-select vote:', err);
        }
      })();

      // Confirm to voter
      socket.emit('poll:vote-confirmed', { pollId, optionIds: validSelections });
    } else {
      // Single select (existing logic)
      const optionExists = poll.options.some(opt => opt.id === optionId);
      if (!optionExists) {
        socket.emit('poll:vote-error', { message: 'Invalid option' });
        return;
      }

      // Record vote in memory
      votes.set(socket.id, optionId);

      // Persist to database (async, non-blocking)
      db.recordVote(pollId, optionId, socket.id, false).catch(err => {
        console.error('[Vote] DB error recording vote:', err);
      });

      // Confirm to voter
      socket.emit('poll:vote-confirmed', { pollId, optionId });
    }

    // Broadcast updated results to A/V Tech and Producer
    const results = calculatePollResults(pollId);
    io.to(`event:${eventId}:avtech`).emit('poll:results', { pollId, results });
    io.to(`event:${eventId}:producer`).emit('poll:results', { pollId, results });

    // If liveResults enabled AND poll is on display, always update display
    // If showResults is on, also update display
    if (poll.showOnDisplay && (poll.liveResults || poll.showResults)) {
      broadcastPollToDisplay(eventId, poll);
    }

    console.log(`Vote recorded for poll ${pollId} from ${socket.id}`);
  });

  // ============================================
  // Bundle Socket Events
  // ============================================

  // Broadcast bundle state to producer and A/V tech
  function broadcastBundleSync(eventId) {
    const bundles = getEventBundles(eventId);
    const bundlesArray = Array.from(bundles.values());

    io.to(`event:${eventId}:producer`).emit('bundle:sync', bundlesArray);
    io.to(`event:${eventId}:avtech`).emit('bundle:sync', bundlesArray);
  }

  // Producer creates a new bundle
  socket.on('bundle:create', async ({ eventId = 'default', name }) => {
    const bundles = getEventBundles(eventId);
    const bundleId = generateBundleId();

    const bundle = {
      id: bundleId,
      eventId,
      name,
      pollIds: [],
      currentIndex: -1,
      status: 'ready',
      createdAt: Date.now()
    };

    bundles.set(bundleId, bundle);
    broadcastBundleSync(eventId);

    console.log(`Bundle created: ${bundleId} (${name}) for event ${eventId}`);

    // Note: Bundle persistence is deferred until polls are added
    // This is because the database uses UUIDs while in-memory uses custom IDs
    // Full bundle persistence will be implemented in a future update
  });

  // Producer adds a poll to a bundle
  socket.on('bundle:add-poll', ({ eventId = 'default', bundleId, pollId }) => {
    const bundles = getEventBundles(eventId);
    const bundle = bundles.get(bundleId);
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (bundle && bundle.status === 'ready' && poll && poll.status === 'ready' && !poll.bundleId) {
      poll.bundleId = bundleId;
      poll.bundleOrder = bundle.pollIds.length;
      bundle.pollIds.push(pollId);

      broadcastBundleSync(eventId);
      broadcastPollSync(eventId);

      console.log(`Poll ${pollId} added to bundle ${bundleId}`);
    }
  });

  // Producer removes a poll from a bundle
  socket.on('bundle:remove-poll', ({ eventId = 'default', bundleId, pollId }) => {
    const bundles = getEventBundles(eventId);
    const bundle = bundles.get(bundleId);
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (bundle && bundle.status === 'ready' && poll) {
      // Remove from bundle
      bundle.pollIds = bundle.pollIds.filter(id => id !== pollId);

      // Update poll
      poll.bundleId = null;
      poll.bundleOrder = null;

      // Re-order remaining polls
      bundle.pollIds.forEach((id, index) => {
        const p = polls.get(id);
        if (p) p.bundleOrder = index;
      });

      broadcastBundleSync(eventId);
      broadcastPollSync(eventId);

      console.log(`Poll ${pollId} removed from bundle ${bundleId}`);
    }
  });

  // Producer deletes a bundle
  socket.on('bundle:delete', ({ eventId = 'default', bundleId }) => {
    const bundles = getEventBundles(eventId);
    const bundle = bundles.get(bundleId);
    const polls = getEventPolls(eventId);

    if (bundle && bundle.status === 'ready') {
      // Unlink all polls from bundle
      bundle.pollIds.forEach(pollId => {
        const poll = polls.get(pollId);
        if (poll) {
          poll.bundleId = null;
          poll.bundleOrder = null;
        }
      });

      bundles.delete(bundleId);
      broadcastBundleSync(eventId);
      broadcastPollSync(eventId);

      console.log(`Bundle deleted: ${bundleId}`);
    }
  });

  // A/V Tech starts a bundle (sends first poll to display)
  socket.on('bundle:start', ({ eventId = 'default', bundleId }) => {
    const bundles = getEventBundles(eventId);
    const bundle = bundles.get(bundleId);
    const polls = getEventPolls(eventId);

    if (bundle && bundle.status === 'ready' && bundle.pollIds.length > 0) {
      // Check no other poll is live
      const hasLivePoll = Array.from(polls.values()).some(p => p.status === 'live');
      if (hasLivePoll) {
        socket.emit('bundle:error', { message: 'Another poll is already live' });
        return;
      }

      bundle.status = 'active';
      bundle.currentIndex = 0;

      // Send first poll to display
      const firstPollId = bundle.pollIds[0];
      const firstPoll = polls.get(firstPollId);

      if (firstPoll && firstPoll.status === 'ready') {
        firstPoll.status = 'live';
        firstPoll.showOnDisplay = true;
        firstPoll.openedAt = Date.now();

        // If liveResults is enabled, automatically show results
        if (firstPoll.liveResults) {
          firstPoll.showResults = true;
        }

        // Set up auto-close timer if duration specified
        if (firstPoll.durationSeconds) {
          const timerId = setTimeout(() => {
            closePoll(eventId, firstPollId);
          }, firstPoll.durationSeconds * 1000);
          pollTimers.set(firstPollId, timerId);
        }

        broadcastPollSync(eventId);
        broadcastPollToAudience(eventId, firstPoll);
        broadcastPollToDisplay(eventId, firstPoll);
      }

      broadcastBundleSync(eventId);
      console.log(`Bundle started: ${bundleId}, first poll: ${firstPollId}`);
    }
  });

  // A/V Tech advances to next poll in bundle
  socket.on('bundle:next', ({ eventId = 'default', bundleId }) => {
    const bundles = getEventBundles(eventId);
    const bundle = bundles.get(bundleId);
    const polls = getEventPolls(eventId);

    if (!bundle || bundle.status !== 'active') return;

    // Close current poll
    const currentPollId = bundle.pollIds[bundle.currentIndex];
    const currentPoll = polls.get(currentPollId);

    if (currentPoll && currentPoll.status === 'live') {
      closePoll(eventId, currentPollId);
    }

    // Check if there are more polls
    if (bundle.currentIndex < bundle.pollIds.length - 1) {
      bundle.currentIndex++;
      const nextPollId = bundle.pollIds[bundle.currentIndex];
      const nextPoll = polls.get(nextPollId);

      if (nextPoll && nextPoll.status === 'ready') {
        nextPoll.status = 'live';
        nextPoll.showOnDisplay = true;
        nextPoll.openedAt = Date.now();

        // If liveResults is enabled, automatically show results
        if (nextPoll.liveResults) {
          nextPoll.showResults = true;
        }

        // Set up auto-close timer if duration specified
        if (nextPoll.durationSeconds) {
          const timerId = setTimeout(() => {
            closePoll(eventId, nextPollId);
          }, nextPoll.durationSeconds * 1000);
          pollTimers.set(nextPollId, timerId);
        }

        broadcastPollSync(eventId);
        broadcastPollToAudience(eventId, nextPoll);
        broadcastPollToDisplay(eventId, nextPoll);
      }
    } else {
      // Bundle complete
      bundle.status = 'completed';
    }

    broadcastBundleSync(eventId);
    console.log(`Bundle ${bundleId} advanced to index ${bundle.currentIndex}`);
  });

  // ============================================
  // Emoji Pack Socket Events
  // ============================================

  // Broadcast emoji pack state to producer and audience
  function broadcastEmojiPackSync(eventId) {
    const packs = getEventEmojiPacks(eventId);
    const customPacks = Array.from(packs.values());
    const activePackId = activeEmojiPack.get(eventId) || 'standard';

    const syncData = {
      templates: Object.values(DEFAULT_EMOJI_TEMPLATES),
      customPacks,
      activePackId
    };

    io.to(`event:${eventId}:producer`).emit('emoji-pack:sync', syncData);
    io.to(`event:${eventId}:avtech`).emit('emoji-pack:sync', syncData);

    // Send active emojis to audience
    const activeEmojis = getActiveEmojis(eventId);
    io.to(`event:${eventId}:audience`).emit('emoji:list', activeEmojis);
  }

  // Producer creates a custom emoji pack
  socket.on('emoji-pack:create', async ({ eventId = 'default', name, emojis }) => {
    const packs = getEventEmojiPacks(eventId);

    // Persist to database first to get the UUID
    const { data: eventData } = await db.getOrCreateEvent(eventId);
    let packId = generateEmojiPackId();

    if (eventData?.id) {
      const { data: dbPack, error } = await db.createEmojiPack(eventData.id, name, emojis || []);
      if (dbPack && !error) {
        packId = dbPack.id;
      }
    }

    const pack = {
      id: packId,
      name,
      emojis: emojis || [],
      isTemplate: false,
      createdAt: Date.now()
    };

    packs.set(packId, pack);
    broadcastEmojiPackSync(eventId);

    console.log(`Emoji pack created: ${packId} (${name}) for event ${eventId}`);
  });

  // Producer updates a custom emoji pack
  socket.on('emoji-pack:update', async ({ eventId = 'default', packId, name, emojis }) => {
    const packs = getEventEmojiPacks(eventId);
    const pack = packs.get(packId);

    if (pack && !pack.isTemplate) {
      if (name !== undefined) pack.name = name;
      if (emojis !== undefined) pack.emojis = emojis;

      // Persist to database
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (emojis !== undefined) updates.emojis = emojis;
      await db.updateEmojiPack(packId, updates);

      broadcastEmojiPackSync(eventId);
      console.log(`Emoji pack updated: ${packId}`);
    }
  });

  // Producer deletes a custom emoji pack
  socket.on('emoji-pack:delete', async ({ eventId = 'default', packId }) => {
    const packs = getEventEmojiPacks(eventId);

    if (packs.has(packId)) {
      packs.delete(packId);

      // If this was the active pack, reset to standard
      if (activeEmojiPack.get(eventId) === packId) {
        activeEmojiPack.set(eventId, 'standard');
      }

      // Persist deletion to database
      await db.deleteEmojiPack(packId);

      broadcastEmojiPackSync(eventId);
      console.log(`Emoji pack deleted: ${packId}`);
    }
  });

  // Producer sets active emoji pack
  socket.on('emoji-pack:set-active', async ({ eventId = 'default', packId }) => {
    // Validate pack exists (template or custom)
    const packs = getEventEmojiPacks(eventId);
    if (DEFAULT_EMOJI_TEMPLATES[packId] || packs.has(packId)) {
      activeEmojiPack.set(eventId, packId);
      broadcastEmojiPackSync(eventId);

      // Persist to database (only for custom packs, not templates)
      const { data: eventData } = await db.getOrCreateEvent(eventId);
      if (eventData?.id) {
        // If it's a template, deactivate all custom packs
        // If it's a custom pack, set it as active
        if (DEFAULT_EMOJI_TEMPLATES[packId]) {
          await db.setActiveEmojiPack(eventData.id, null);
        } else {
          await db.setActiveEmojiPack(eventData.id, packId);
        }
      }

      console.log(`Active emoji pack set to: ${packId} for event ${eventId}`);
    }
  });

  // Producer adds a custom emoji (PNG URL) to a pack
  socket.on('emoji-pack:add-custom-emoji', ({ eventId = 'default', packId, emojiUrl }) => {
    const packs = getEventEmojiPacks(eventId);
    const pack = packs.get(packId);

    if (pack && !pack.isTemplate) {
      pack.emojis.push(emojiUrl);
      broadcastEmojiPackSync(eventId);
      console.log(`Custom emoji added to pack ${packId}: ${emojiUrl}`);
    }
  });

  // Producer removes an emoji from a custom pack
  socket.on('emoji-pack:remove-emoji', ({ eventId = 'default', packId, emojiIndex }) => {
    const packs = getEventEmojiPacks(eventId);
    const pack = packs.get(packId);

    if (pack && !pack.isTemplate && emojiIndex >= 0 && emojiIndex < pack.emojis.length) {
      pack.emojis.splice(emojiIndex, 1);
      broadcastEmojiPackSync(eventId);
      console.log(`Emoji removed from pack ${packId} at index ${emojiIndex}`);
    }
  });

  // ============================================
  // Q&A Socket Events
  // ============================================

  // Producer/AVTech enables or disables Q&A
  socket.on('qa:toggle', async ({ eventId = 'default', enabled }) => {
    qaEnabled.set(eventId, enabled);

    // Broadcast to all parties
    broadcastQASync(eventId);
    broadcastQAStateToAudience(eventId);

    // Persist to database
    const { data: eventData } = await db.getOrCreateEvent(eventId);
    if (eventData?.id) {
      await db.updateEventSettings(eventData.id, { qa_enabled: enabled });
    }

    console.log(`Q&A ${enabled ? 'enabled' : 'disabled'} for event ${eventId}`);
  });

  // Audience submits a question
  socket.on('qa:submit', async ({ eventId = 'default', text, authorName = 'Anonymous' }) => {
    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('qa:error', { message: 'Invalid event ID' });
      return;
    }

    // Get authenticated user
    const authUser = getAuthUser(socket);
    if (!authUser) {
      socket.emit('qa:error', { message: 'Not authenticated' });
      return;
    }

    // Rate limit Q&A submissions
    const rateLimit = rateLimitQASubmit(authUser.userId);
    if (!rateLimit.allowed) {
      socket.emit('qa:error', {
        message: `Too many questions. Try again in ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (!isQAEnabled(eventId)) {
      socket.emit('qa:error', { message: 'Q&A is not currently open' });
      return;
    }

    // Validate question data
    const validation = validateQuestion({ text, authorName });
    if (!validation.valid) {
      socket.emit('qa:error', { message: validation.error });
      return;
    }

    // Get or create event in database
    const { data: eventData } = await db.getOrCreateEvent(eventId);
    const dbEventId = eventData?.id;

    // Create question in database
    let dbQuestion = null;
    if (dbEventId) {
      const { data, error } = await db.createQuestion(
        dbEventId,
        validation.sanitized.text,
        validation.sanitized.authorName,
        socket.id
      );
      if (error) {
        console.error('[QA] Database error creating question:', error);
      } else {
        dbQuestion = data;
      }
    }

    const questions = getEventQuestions(eventId);
    const questionId = dbQuestion?.id || generateQuestionId();

    const question = {
      id: questionId,
      eventId,
      text: validation.sanitized.text,
      authorName: validation.sanitized.authorName,
      status: 'pending',
      createdAt: Date.now(),
      approvedAt: null,
      featuredAt: null
    };

    questions.set(questionId, question);

    // Confirm to submitter
    socket.emit('qa:submitted', { questionId });

    // Broadcast to moderators
    broadcastQASync(eventId);

    console.log(`Question submitted: ${questionId} for event ${eventId}${dbQuestion ? ' (persisted to DB)' : ''}`);
  });

  // Producer/AVTech approves a question
  socket.on('qa:approve', async ({ eventId = 'default', questionId }) => {
    const questions = getEventQuestions(eventId);
    const question = questions.get(questionId);

    if (question && question.status === 'pending') {
      question.status = 'approved';
      question.approvedAt = Date.now();

      // Persist to database
      db.updateQuestionStatus(questionId, 'approved').catch(err => {
        console.error('[QA] DB error updating question status:', err);
      });

      broadcastQASync(eventId);
      console.log(`Question approved: ${questionId}`);
    }
  });

  // Producer/AVTech rejects a question
  socket.on('qa:reject', async ({ eventId = 'default', questionId }) => {
    const questions = getEventQuestions(eventId);
    const question = questions.get(questionId);

    if (question && (question.status === 'pending' || question.status === 'approved')) {
      question.status = 'rejected';

      // Persist to database
      db.updateQuestionStatus(questionId, 'rejected').catch(err => {
        console.error('[QA] DB error updating question status:', err);
      });

      broadcastQASync(eventId);
      console.log(`Question rejected: ${questionId}`);
    }
  });

  // Producer/AVTech features a question (shows on display)
  socket.on('qa:feature', async ({ eventId = 'default', questionId }) => {
    const questions = getEventQuestions(eventId);

    // First, unfeature any currently featured question
    for (const [qId, q] of questions) {
      if (q.status === 'featured') {
        q.status = 'approved';
        q.featuredAt = null;
        // Update in database
        db.updateQuestionStatus(qId, 'approved').catch(err => {
          console.error('[QA] DB error unfeaturing question:', err);
        });
      }
    }

    // Feature the selected question
    const question = questions.get(questionId);
    if (question && (question.status === 'approved' || question.status === 'pending')) {
      question.status = 'featured';
      question.featuredAt = Date.now();
      if (!question.approvedAt) {
        question.approvedAt = Date.now();
      }

      // Persist to database
      db.updateQuestionStatus(questionId, 'featured').catch(err => {
        console.error('[QA] DB error featuring question:', err);
      });
    }

    broadcastQASync(eventId);
    broadcastFeaturedQuestion(eventId);
    console.log(`Question featured: ${questionId}`);
  });

  // Producer/AVTech unfeatures a question (hides from display)
  socket.on('qa:unfeature', async ({ eventId = 'default', questionId }) => {
    const questions = getEventQuestions(eventId);
    const question = questions.get(questionId);

    if (question && question.status === 'featured') {
      question.status = 'approved';
      question.featuredAt = null;

      // Persist to database
      db.updateQuestionStatus(questionId, 'approved').catch(err => {
        console.error('[QA] DB error unfeaturing question:', err);
      });

      broadcastQASync(eventId);
      broadcastFeaturedQuestion(eventId);
      console.log(`Question unfeatured: ${questionId}`);
    }
  });

  // Producer/AVTech deletes a question
  socket.on('qa:delete', async ({ eventId = 'default', questionId }) => {
    const questions = getEventQuestions(eventId);
    const question = questions.get(questionId);

    if (question) {
      const wasFeatured = question.status === 'featured';
      questions.delete(questionId);

      // Delete from database
      db.deleteQuestion(questionId).catch(err => {
        console.error('[QA] DB error deleting question:', err);
      });

      broadcastQASync(eventId);
      if (wasFeatured) {
        broadcastFeaturedQuestion(eventId);
      }
      console.log(`Question deleted: ${questionId}`);
    }
  });

  // Producer/AVTech clears all questions
  socket.on('qa:clear-all', async ({ eventId = 'default' }) => {
    const questions = getEventQuestions(eventId);
    questions.clear();

    // Clear from database
    const { data: eventData } = await db.getEvent(eventId);
    if (eventData?.id) {
      db.clearEventQuestions(eventData.id).catch(err => {
        console.error('[QA] DB error clearing questions:', err);
      });
    }

    broadcastQASync(eventId);
    broadcastFeaturedQuestion(eventId);
    console.log(`All questions cleared for event ${eventId}`);
  });

  // ============================================
  // AVTech Password Socket Events
  // ============================================

  // Producer sets AVTech password for their event
  socket.on('avtech:set-password', ({ eventId = 'default', password }) => {
    // Check authorization - only producer can set password
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Validate password (4-20 characters, alphanumeric)
    if (!password || password.length < 4 || password.length > 20) {
      socket.emit('error', { message: 'Password must be 4-20 characters' });
      return;
    }

    // Sanitize password (alphanumeric only)
    const sanitizedPassword = password.replace(/[^a-zA-Z0-9]/g, '');

    if (sanitizedPassword.length < 4) {
      socket.emit('error', { message: 'Password must contain at least 4 alphanumeric characters' });
      return;
    }

    // Store password
    eventPasswords.set(eventId, sanitizedPassword);

    // Broadcast to producer (for sync)
    socket.emit('avtech:password-sync', { password: sanitizedPassword });

    console.log(`AVTech password set for event ${eventId}`);
  });

  // AVTech verifies password before accessing panel
  socket.on('avtech:verify-password', ({ eventId = 'default', password }) => {
    console.log(`[AVTechPassword] Verification request for event: ${eventId}, password: ${password}`);

    // Validate event ID
    if (!isValidEventId(eventId)) {
      console.log(`[AVTechPassword] Invalid event ID: ${eventId}`);
      socket.emit('avtech:password-verified', { success: false });
      return;
    }

    // Get stored password
    const storedPassword = getEventPassword(eventId);
    console.log(`[AVTechPassword] Stored password: ${storedPassword}`);

    // Verify password
    const success = password === storedPassword;

    console.log(`[AVTechPassword] Verification result: ${success ? 'SUCCESS' : 'FAILED'}`);
    socket.emit('avtech:password-verified', { success });

    if (success) {
      console.log(`[AVTechPassword] ✓ AVTech authenticated for event ${eventId}`);
    } else {
      console.log(`[AVTechPassword] ✗ AVTech authentication failed for event ${eventId}`);
    }
  });

  // Producer requests current password (when loading producer panel)
  socket.on('avtech:get-password', ({ eventId = 'default' }) => {
    // Check authorization
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const password = getEventPassword(eventId);
    socket.emit('avtech:password-sync', { password });
  });

  // ============================================
  // Timer/Countdown Socket Events
  // ============================================

  // Producer creates a new timer
  socket.on('timer:create', async ({ eventId = 'default', name, type = 'countdown', durationSeconds = 60 }) => {
    // Check authorization
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    // Validate event ID
    if (!isValidEventId(eventId)) {
      socket.emit('error', { message: 'Invalid event ID' });
      return;
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      socket.emit('error', { message: 'Timer name is required' });
      return;
    }

    // Validate type
    if (type !== 'countdown' && type !== 'stopwatch') {
      socket.emit('error', { message: 'Timer type must be countdown or stopwatch' });
      return;
    }

    // Validate duration for countdown
    if (type === 'countdown' && (durationSeconds < 1 || durationSeconds > 86400)) {
      socket.emit('error', { message: 'Duration must be between 1 second and 24 hours' });
      return;
    }

    const timers = getEventTimers(eventId);
    const settings = eventSettings.get(eventId) || {};

    // Persist to database first to get UUID
    const { data: eventData } = await db.getOrCreateEvent(eventId);
    let timerId = generateTimerId();

    if (eventData?.id) {
      const { data: dbTimer, error } = await db.createTimer(eventData.id, {
        name: name.trim().substring(0, 100),
        type,
        duration: type === 'countdown' ? durationSeconds * 1000 : 0,
        position: settings.timerPosition || settings.pollPosition || 'center',
        size: settings.timerSize || settings.pollSize || 'medium'
      });
      if (dbTimer && !error) {
        timerId = dbTimer.id;
      }
    }

    const timer = {
      id: timerId,
      eventId,
      name: name.trim().substring(0, 100),
      displayText: '',  // Optional text to show on display instead of name
      type,
      duration: type === 'countdown' ? durationSeconds * 1000 : 0,
      startedAt: null,
      pausedAt: null,
      pausedElapsed: 0,
      status: 'ready',
      showOnDisplay: false,
      position: settings.timerPosition || 'center',
      size: settings.timerSize || 'medium',
      style: settings.timerStyle || 'digital',
      color: settings.timerColor || '#ffffff',
      createdAt: Date.now()
    };

    timers.set(timerId, timer);
    broadcastTimerSync(eventId);

    console.log(`[Timer] Created ${type} timer "${name}" for event ${eventId}`);
  });

  // Producer starts a timer
  socket.on('timer:start', async ({ eventId = 'default', timerId }) => {
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    if (timer.status !== 'ready') {
      socket.emit('error', { message: 'Timer can only be started from ready state' });
      return;
    }

    timer.status = 'running';
    timer.startedAt = Date.now();

    // Persist to database
    await db.updateTimer(timerId, {
      status: 'running',
      started_at: new Date().toISOString(),
      paused_elapsed_ms: 0
    });

    // Set interval to broadcast updates every 100ms
    const intervalId = setInterval(() => {
      const elapsed = calculateTimerElapsed(timer);

      // Broadcast tick to avtech and producer panels for live display
      io.to(`event:${eventId}:avtech`).emit('timer:tick', { timerId, elapsed });
      io.to(`event:${eventId}:producer`).emit('timer:tick', { timerId, elapsed });

      if (timer.showOnDisplay) {
        broadcastTimersToDisplay(eventId);
      }

      // Auto-finish countdown when done
      if (timer.type === 'countdown') {
        if (elapsed >= timer.duration) {
          finishTimer(eventId, timerId);
        }
      }
    }, 100);
    activeTimerIntervals.set(timerId, intervalId);

    broadcastTimerSync(eventId);
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Started timer ${timerId} for event ${eventId}`);
  });

  // Producer pauses a timer
  socket.on('timer:pause', async ({ eventId = 'default', timerId }) => {
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    if (timer.status !== 'running') {
      socket.emit('error', { message: 'Only running timers can be paused' });
      return;
    }

    timer.status = 'paused';
    timer.pausedAt = Date.now();
    timer.pausedElapsed = calculateTimerElapsed(timer);

    // Clear update interval
    if (activeTimerIntervals.has(timerId)) {
      clearInterval(activeTimerIntervals.get(timerId));
      activeTimerIntervals.delete(timerId);
    }

    // Persist to database
    await db.updateTimer(timerId, {
      status: 'paused',
      paused_elapsed_ms: timer.pausedElapsed
    });

    broadcastTimerSync(eventId);
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Paused timer ${timerId} for event ${eventId}`);
  });

  // Producer resumes a paused timer
  socket.on('timer:resume', async ({ eventId = 'default', timerId }) => {
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    if (timer.status !== 'paused') {
      socket.emit('error', { message: 'Only paused timers can be resumed' });
      return;
    }

    timer.status = 'running';
    timer.startedAt = Date.now() - timer.pausedElapsed;
    timer.pausedAt = null;

    // Persist to database
    await db.updateTimer(timerId, {
      status: 'running',
      started_at: new Date(timer.startedAt).toISOString()
    });

    // Restart update interval
    const intervalId = setInterval(() => {
      if (timer.showOnDisplay) {
        broadcastTimersToDisplay(eventId);
      }

      // Auto-finish countdown when done
      if (timer.type === 'countdown') {
        const elapsed = calculateTimerElapsed(timer);
        if (elapsed >= timer.duration) {
          finishTimer(eventId, timerId);
        }
      }
    }, 100);
    activeTimerIntervals.set(timerId, intervalId);

    broadcastTimerSync(eventId);
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Resumed timer ${timerId} for event ${eventId}`);
  });

  // Producer resets a timer back to ready state
  socket.on('timer:reset', async ({ eventId = 'default', timerId }) => {
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    // Clear interval if running
    if (activeTimerIntervals.has(timerId)) {
      clearInterval(activeTimerIntervals.get(timerId));
      activeTimerIntervals.delete(timerId);
    }

    timer.status = 'ready';
    timer.startedAt = null;
    timer.pausedAt = null;
    timer.pausedElapsed = 0;

    // Persist to database
    await db.updateTimer(timerId, {
      status: 'ready',
      started_at: null,
      paused_elapsed_ms: 0
    });

    broadcastTimerSync(eventId);
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Reset timer ${timerId} for event ${eventId}`);
  });

  // Producer deletes a timer
  socket.on('timer:delete', async ({ eventId = 'default', timerId }) => {
    const authCheck = requireRole(socket, 'producer');
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error });
      return;
    }

    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    // Clear interval if running
    if (activeTimerIntervals.has(timerId)) {
      clearInterval(activeTimerIntervals.get(timerId));
      activeTimerIntervals.delete(timerId);
    }

    // Hide from display if showing
    if (timer.showOnDisplay) {
      io.to(`event:${eventId}:display`).emit('timer:display', { timer: null });
    }

    timers.delete(timerId);

    // Persist deletion to database
    await db.deleteTimer(timerId);

    broadcastTimerSync(eventId);

    console.log(`[Timer] Deleted timer ${timerId} for event ${eventId}`);
  });

  // AVTech sends a timer to the display
  socket.on('timer:send-to-display', ({ eventId = 'default', timerId }) => {
    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    // Check if we already have 3 timers showing (max limit)
    const showingCount = Array.from(timers.values()).filter(t => t.showOnDisplay).length;
    if (showingCount >= 3 && !timer.showOnDisplay) {
      socket.emit('error', { message: 'Maximum 3 timers can be displayed simultaneously' });
      return;
    }

    timer.showOnDisplay = true;
    broadcastTimerSync(eventId);
    broadcastTimersToDisplay(eventId);

    console.log(`[Timer] Sent timer ${timerId} to display for event ${eventId}`);
  });

  // AVTech hides a timer from the display
  socket.on('timer:hide', ({ eventId = 'default', timerId }) => {
    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    timer.showOnDisplay = false;
    broadcastTimerSync(eventId);
    broadcastTimersToDisplay(eventId);

    console.log(`[Timer] Hid timer ${timerId} from display for event ${eventId}`);
  });

  // AVTech updates per-timer display settings (position, size, style, color)
  socket.on('timer:update-settings', ({ eventId = 'default', timerId, position, size, style, color }) => {
    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    // Validate and update settings
    const VALID_POSITIONS = ['center', 'lower-third', 'bottom-bar', 'top-right', 'top-left', 'bottom-right', 'bottom-left'];
    const VALID_SIZES = ['small', 'medium', 'large'];
    const VALID_STYLES = ['digital', 'minimal', 'circular'];
    const VALID_COLORS = ['#ffffff', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

    if (position !== undefined && VALID_POSITIONS.includes(position)) {
      timer.position = position;
    }
    if (size !== undefined && VALID_SIZES.includes(size)) {
      timer.size = size;
    }
    if (style !== undefined && VALID_STYLES.includes(style)) {
      timer.style = style;
    }
    if (color !== undefined && VALID_COLORS.includes(color)) {
      timer.color = color;
    }

    // Broadcast updated timer to all AVTech panels
    broadcastTimerSync(eventId);

    // If this timer is currently on display, update the display immediately
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Updated settings for timer ${timerId}: position=${timer.position}, size=${timer.size}, style=${timer.style}, color=${timer.color}`);
  });

  // AVTech updates per-timer display text
  socket.on('timer:update-display-text', ({ eventId = 'default', timerId, displayText }) => {
    const timers = getEventTimers(eventId);
    const timer = timers.get(timerId);

    if (!timer) {
      socket.emit('error', { message: 'Timer not found' });
      return;
    }

    // Sanitize: allow empty string, limit to 200 chars
    timer.displayText = (displayText || '').substring(0, 200);

    broadcastTimerSync(eventId);
    if (timer.showOnDisplay) {
      broadcastTimersToDisplay(eventId);
    }

    console.log(`[Timer] Updated displayText for timer ${timerId}: "${timer.displayText}"`);
  });
});

// ============================================
// Server Initialization with State Recovery
// ============================================

/**
 * Initialize server state from database
 * Recovers polls, questions, bundles, and settings from Supabase
 */
async function initializeServerState() {
  console.log('[Init] Starting server state recovery from database...');

  try {
    // Get all live/draft events
    const events = await db.getLiveEvents();
    console.log(`[Init] Found ${events.length} active events to restore`);

    for (const event of events) {
      const eventId = event.slug || event.id;
      console.log(`[Init] Restoring state for event: ${eventId}`);

      // Initialize Maps for this event if needed
      if (!eventPolls.has(eventId)) {
        eventPolls.set(eventId, new Map());
      }
      if (!eventBundles.has(eventId)) {
        eventBundles.set(eventId, new Map());
      }
      if (!eventQuestions.has(eventId)) {
        eventQuestions.set(eventId, new Map());
      }
      if (!eventEmojiPacks.has(eventId)) {
        eventEmojiPacks.set(eventId, new Map());
      }

      // Restore polls with votes
      const polls = await db.getPollsForEvent(event.id);
      const pollsMap = eventPolls.get(eventId);

      for (const poll of polls) {
        // Convert database format to in-memory format
        const pollData = {
          id: poll.id,
          eventId,
          question: poll.question,
          options: poll.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            sortOrder: opt.sort_order,
            isCorrect: poll.correct_option_id === opt.id
          })),
          status: poll.status,
          allowChange: poll.allow_change,
          allowMultiple: poll.allow_multiple,
          showResults: poll.show_results,
          showOnDisplay: false, // Reset display state on restart
          durationSeconds: poll.duration_seconds,
          createdAt: new Date(poll.created_at).getTime(),
          openedAt: poll.opened_at ? new Date(poll.opened_at).getTime() : null,
          closedAt: poll.closed_at ? new Date(poll.closed_at).getTime() : null,
          liveResults: false,
          bundleId: null,
          bundleOrder: null,
          position: poll.position || 'center',
          size: poll.size || 'medium'
        };

        pollsMap.set(poll.id, pollData);

        // Restore votes
        const votesMap = new Map();
        if (poll.votes) {
          if (poll.allow_multiple) {
            // Group votes by session_id for multi-select
            const votesBySession = {};
            for (const vote of poll.votes) {
              if (!votesBySession[vote.session_id]) {
                votesBySession[vote.session_id] = new Set();
              }
              votesBySession[vote.session_id].add(vote.option_id);
            }
            for (const [sessionId, optionIds] of Object.entries(votesBySession)) {
              votesMap.set(sessionId, optionIds);
            }
          } else {
            // Single select - just map session to option
            for (const vote of poll.votes) {
              votesMap.set(vote.session_id, vote.option_id);
            }
          }
        }
        pollVotes.set(poll.id, votesMap);
      }
      console.log(`[Init]   - Restored ${polls.length} polls`);

      // Restore bundles
      const bundles = await db.getBundlesForEvent(event.id);
      const bundlesMap = eventBundles.get(eventId);

      for (const bundle of bundles) {
        const bundleData = {
          id: bundle.id,
          eventId,
          name: bundle.name,
          status: bundle.status,
          currentIndex: bundle.current_index || 0,
          pollIds: (bundle.bundle_polls || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(bp => bp.poll_id),
          createdAt: new Date(bundle.created_at).getTime()
        };
        bundlesMap.set(bundle.id, bundleData);
      }
      console.log(`[Init]   - Restored ${bundles.length} bundles`);

      // Restore questions
      const questions = await db.getQuestionsForEvent(event.id);
      const questionsMap = eventQuestions.get(eventId);

      for (const q of questions) {
        const questionData = {
          id: q.id,
          eventId,
          text: q.text,
          authorName: q.submitter_name || 'Anonymous',
          status: q.status,
          createdAt: new Date(q.created_at).getTime(),
          approvedAt: q.featured_at ? new Date(q.featured_at).getTime() : null,
          featuredAt: q.featured_at ? new Date(q.featured_at).getTime() : null
        };
        questionsMap.set(q.id, questionData);
      }
      console.log(`[Init]   - Restored ${questions.length} questions`);

      // Restore emoji packs
      const emojiPacks = await db.getEmojiPacksForEvent(event.id);
      const packsMap = eventEmojiPacks.get(eventId);

      for (const pack of emojiPacks) {
        const packData = {
          id: pack.id,
          name: pack.name,
          emojis: pack.emojis || [],
          isTemplate: false
        };
        packsMap.set(pack.id, packData);

        if (pack.is_active) {
          activeEmojiPack.set(eventId, pack.id);
        }
      }
      console.log(`[Init]   - Restored ${emojiPacks.length} emoji packs`);

      // Restore timers
      const timers = await db.getTimersForEvent(event.id);
      const timersMap = getEventTimers(eventId);

      for (const timer of timers) {
        const timerData = {
          id: timer.id,
          eventId,
          name: timer.name,
          type: timer.type,
          duration: timer.duration_ms || 0,
          startedAt: timer.started_at ? new Date(timer.started_at).getTime() : null,
          pausedAt: null,
          pausedElapsed: timer.paused_elapsed_ms || 0,
          status: timer.status || 'ready',
          showOnDisplay: timer.show_on_display || false,
          position: timer.position || 'center',
          size: timer.size || 'medium',
          createdAt: new Date(timer.created_at).getTime()
        };
        timersMap.set(timer.id, timerData);
      }
      console.log(`[Init]   - Restored ${timers.length} timers`);

      // Restore event settings
      if (event.event_settings && event.event_settings.length > 0) {
        const settings = event.event_settings[0];
        eventSettings.set(eventId, {
          emojisEnabled: settings.emoji_enabled !== false,
          maxOnScreen: settings.emoji_max_on_screen || 30,
          emojiSize: settings.emoji_size || 'medium',
          animationSpeed: settings.emoji_speed || 'normal',
          spawnDirection: settings.emoji_spawn_direction || 'bottom-up',
          spawnPosition: settings.emoji_spawn_position || 'wide',
          pollPosition: settings.poll_position || 'center',
          pollSize: settings.poll_size || 'medium'
        });

        // Restore Q&A enabled state
        qaEnabled.set(eventId, settings.qa_enabled !== false);
      }

      // Restore AVTech password
      if (event.avtech_password) {
        eventPasswords.set(eventId, event.avtech_password);
      }
    }

    console.log('[Init] ✓ Server state recovery complete');
  } catch (error) {
    console.error('[Init] ✗ Error during state recovery:', error);
    console.log('[Init] Server will continue with empty state');
  }
}

const PORT = process.env.PORT || 3001;

// Initialize state from database before starting server
initializeServerState().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Socket.IO ready for connections');
    console.log('Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
  });
}).catch(error => {
  console.error('Failed to initialize server:', error);
  // Start anyway with empty state
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (with initialization error)`);
  });
});
