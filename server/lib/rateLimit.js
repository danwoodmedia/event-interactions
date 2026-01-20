/**
 * Rate limiting utilities for Socket.IO events
 * Prevents spam and abuse
 */

// Rate limit configurations (requests per time window)
export const RATE_LIMITS = {
  // Poll operations (per user)
  POLL_CREATE: { max: 100, window: 3600000 }, // 100 polls per hour (reasonable for a producer managing an event)
  POLL_VOTE: { max: 200, window: 60000 }, // 200 votes per minute (allows rapid voting on multiple polls)

  // Q&A operations (per user)
  QA_SUBMIT: { max: 20, window: 60000 }, // 20 questions per minute (prevents spam but allows active participation)
  QA_UPVOTE: { max: 100, window: 60000 }, // 100 upvotes per minute (allows upvoting many questions)

  // Settings changes (per user)
  SETTINGS_UPDATE: { max: 50, window: 60000 } // 50 updates per minute (allows rapid A/V adjustments during setup)
};

/**
 * In-memory rate limit tracker
 * Structure: Map<key, { count: number, resetAt: timestamp }>
 */
const rateLimitStore = new Map();

/**
 * Clean up expired rate limit entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request is rate limited
 * @param {string} key - Unique key for this rate limit (e.g., `poll:create:${userId}`)
 * @param {object} config - Rate limit config { max, window }
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function checkRateLimit(key, config) {
  const now = Date.now();
  const data = rateLimitStore.get(key);

  // No existing entry or window expired
  if (!data || data.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.window
    });
    return { allowed: true, retryAfter: null };
  }

  // Within window - check if limit exceeded
  if (data.count >= config.max) {
    const retryAfter = Math.ceil((data.resetAt - now) / 1000); // seconds
    return { allowed: false, retryAfter };
  }

  // Increment count
  data.count++;
  return { allowed: true, retryAfter: null };
}

/**
 * Rate limit middleware for poll creation
 * @param {string} userId - User ID
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function rateLimitPollCreate(userId) {
  return checkRateLimit(`poll:create:${userId}`, RATE_LIMITS.POLL_CREATE);
}

/**
 * Rate limit middleware for poll voting
 * @param {string} userId - User ID
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function rateLimitPollVote(userId) {
  return checkRateLimit(`poll:vote:${userId}`, RATE_LIMITS.POLL_VOTE);
}

/**
 * Rate limit middleware for Q&A submission
 * @param {string} userId - User ID
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function rateLimitQASubmit(userId) {
  return checkRateLimit(`qa:submit:${userId}`, RATE_LIMITS.QA_SUBMIT);
}

/**
 * Rate limit middleware for Q&A upvoting
 * @param {string} userId - User ID
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function rateLimitQAUpvote(userId) {
  return checkRateLimit(`qa:upvote:${userId}`, RATE_LIMITS.QA_UPVOTE);
}

/**
 * Rate limit middleware for settings updates
 * @param {string} userId - User ID
 * @returns {object} { allowed: boolean, retryAfter: number|null }
 */
export function rateLimitSettingsUpdate(userId) {
  return checkRateLimit(`settings:update:${userId}`, RATE_LIMITS.SETTINGS_UPDATE);
}

/**
 * Reset rate limits for a specific user (useful for testing or admin actions)
 * @param {string} userId - User ID
 * @param {string} action - Action type (e.g., 'poll:create')
 */
export function resetRateLimit(userId, action) {
  const key = `${action}:${userId}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status for debugging
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @returns {object|null} Current rate limit data
 */
export function getRateLimitStatus(userId, action) {
  const key = `${action}:${userId}`;
  const data = rateLimitStore.get(key);

  if (!data) {
    return null;
  }

  return {
    count: data.count,
    resetAt: data.resetAt,
    resetIn: Math.ceil((data.resetAt - Date.now()) / 1000)
  };
}
