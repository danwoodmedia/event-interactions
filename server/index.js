import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { supabase } from './lib/supabase.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

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

// Get or create event settings
function getEventSettings(eventId) {
  if (!eventSettings.has(eventId)) {
    eventSettings.set(eventId, {
      emojisEnabled: true,
      maxOnScreen: 30,
      emojiSize: 'medium',
      animationSpeed: 'normal',
      spawnDirection: 'bottom-up',
      spawnPosition: 'wide'
    });
  }
  return eventSettings.get(eventId);
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

// Generate unique poll ID
function generatePollId() {
  return `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique option ID
function generateOptionId() {
  return `opt_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate poll results
function calculatePollResults(pollId) {
  const votes = pollVotes.get(pollId) || new Map();
  const voteCounts = new Map();

  // Count votes per option
  votes.forEach((optionId) => {
    voteCounts.set(optionId, (voteCounts.get(optionId) || 0) + 1);
  });

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

  // Calculate results for each poll
  const pollsWithResults = pollsArray.map(poll => ({
    ...poll,
    results: calculatePollResults(poll.id)
  }));

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
      allowChange: poll.allowChange
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
      options: poll.options,
      status: poll.status,
      showResults: poll.showResults,
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

    // Update stats (display count changed)
    updateStats(eventId);
  });

  // Audience joins an event
  socket.on('join-event', ({ eventId = 'default', role }) => {
    console.log(`${role} ${socket.id} joining event ${eventId}`);
    socket.join(`event:${eventId}:${role}`);

    // Send current settings to A/V tech panels when they join
    if (role === 'avtech') {
      const settings = getEventSettings(eventId);
      socket.emit('settings:sync', settings);

      // Send current polls
      broadcastPollSync(eventId);

      // Also send current stats
      updateStats(eventId);
    }

    // Send current polls to producer when they join
    if (role === 'producer') {
      broadcastPollSync(eventId);
      updateStats(eventId);
    }

    // Send active poll to audience when they join
    if (role === 'audience') {
      const polls = getEventPolls(eventId);
      const livePoll = Array.from(polls.values()).find(p => p.status === 'live');
      if (livePoll) {
        socket.emit('poll:active', {
          id: livePoll.id,
          question: livePoll.question,
          options: livePoll.options,
          allowChange: livePoll.allowChange
        });
      }
    }
  });

  // Audience sends a reaction
  socket.on('reaction:send', ({ emoji, eventId = 'default' }) => {
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

    // Add to queue
    emojiQueues.get(eventId).push({ emoji, socketId: socket.id });

    // Update stats
    const stats = getEventStats(eventId);
    stats.totalReactions++;
    updateStats(eventId);

    // Start queue processor if needed
    startQueueProcessor(eventId);

    console.log(`Reaction queued: ${emoji} from ${socket.id} for event ${eventId}`);
  });

  // A/V Tech: Update settings
  socket.on('settings:update', ({ eventId = 'default', ...newSettings }) => {
    const settings = getEventSettings(eventId);
    Object.assign(settings, newSettings);

    // If maxOnScreen changed, update the config for this event
    if (newSettings.maxOnScreen !== undefined) {
      // This will be used in processEmojiQueue
    }

    // Broadcast settings to all connected A/V tech panels for this event
    io.to(`event:${eventId}:avtech`).emit('settings:sync', settings);

    // Also broadcast to displays so they can adjust size/speed
    io.to(`event:${eventId}:display`).emit('settings:sync', settings);

    console.log(`Settings updated for event ${eventId}:`, newSettings);
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
  socket.on('poll:create', ({ eventId = 'default', question, options, allowChange = false, durationSeconds = null }) => {
    const polls = getEventPolls(eventId);
    const pollId = generatePollId();

    // Create options with IDs
    const pollOptions = options.map((text, index) => ({
      id: generateOptionId(),
      text,
      sortOrder: index
    }));

    const poll = {
      id: pollId,
      eventId,
      question,
      options: pollOptions,
      status: 'ready',
      allowChange,
      showResults: false,
      showOnDisplay: false,
      durationSeconds,
      createdAt: Date.now(),
      openedAt: null,
      closedAt: null
    };

    polls.set(pollId, poll);
    pollVotes.set(pollId, new Map());

    // Sync to producer and A/V tech
    broadcastPollSync(eventId);

    console.log(`Poll created: ${pollId} for event ${eventId}`);
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
  socket.on('poll:delete', ({ eventId = 'default', pollId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && poll.status === 'ready') {
      polls.delete(pollId);
      pollVotes.delete(pollId);

      broadcastPollSync(eventId);
      console.log(`Poll deleted: ${pollId} for event ${eventId}`);
    }
  });

  // A/V Tech sends poll to display (opens voting)
  socket.on('poll:send-to-display', ({ eventId = 'default', pollId }) => {
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
  socket.on('poll:show-results', ({ eventId = 'default', pollId, show }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (poll && (poll.status === 'live' || poll.status === 'closed')) {
      poll.showResults = show;

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

  // Audience votes on a poll
  socket.on('poll:vote', ({ eventId = 'default', pollId, optionId }) => {
    const polls = getEventPolls(eventId);
    const poll = polls.get(pollId);

    if (!poll || poll.status !== 'live') {
      socket.emit('poll:vote-error', { message: 'Poll is not active' });
      return;
    }

    // Check if option exists
    const optionExists = poll.options.some(opt => opt.id === optionId);
    if (!optionExists) {
      socket.emit('poll:vote-error', { message: 'Invalid option' });
      return;
    }

    const votes = pollVotes.get(pollId);
    const existingVote = votes.get(socket.id);

    // Check if changing vote is allowed
    if (existingVote && !poll.allowChange) {
      socket.emit('poll:vote-error', { message: 'Vote already submitted' });
      return;
    }

    // Record vote
    votes.set(socket.id, optionId);

    // Confirm to voter
    socket.emit('poll:vote-confirmed', { pollId, optionId });

    // Broadcast updated results
    const results = calculatePollResults(pollId);
    io.to(`event:${eventId}:avtech`).emit('poll:results', { pollId, results });
    io.to(`event:${eventId}:producer`).emit('poll:results', { pollId, results });

    // If showing results on display, update display too
    if (poll.showResults) {
      broadcastPollToDisplay(eventId, poll);
    }

    console.log(`Vote recorded: ${optionId} for poll ${pollId} from ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.IO ready for connections');
  console.log('Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
});
