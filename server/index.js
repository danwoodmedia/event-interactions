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

  // Broadcast to A/V tech panel
  io.to(`event:${eventId}:avtech`).emit('stats:update', stats);
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

    // Start queue processor if needed
    startQueueProcessor(eventId);
  });

  // Audience joins an event
  socket.on('join-event', ({ eventId = 'default', role }) => {
    console.log(`${role} ${socket.id} joining event ${eventId}`);
    socket.join(`event:${eventId}:${role}`);
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
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.IO ready for connections');
  console.log('Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
});
