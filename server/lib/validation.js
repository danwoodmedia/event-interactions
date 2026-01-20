/**
 * Input validation utilities for socket events
 * Prevents injection attacks, memory exhaustion, and malicious input
 */

// Validation limits per PRD Section 5.1.2 and 10.2
export const LIMITS = {
  // Q&A
  QUESTION_TEXT_MAX: 280,
  AUTHOR_NAME_MAX: 100,

  // Polls
  POLL_QUESTION_MAX: 500,
  POLL_OPTIONS_MIN: 2,
  POLL_OPTIONS_MAX: 6,
  POLL_OPTION_TEXT_MAX: 100,
  POLL_DURATION_MIN: 5,
  POLL_DURATION_MAX: 3600, // 1 hour

  // Event IDs and identifiers
  EVENT_ID_MAX: 100,
  EMOJI_MAX_LENGTH: 10,

  // Display settings
  MAX_ON_SCREEN_MIN: 5,
  MAX_ON_SCREEN_MAX: 100,
  EMOJI_DURATION_MIN: 1000,
  EMOJI_DURATION_MAX: 10000,
  USER_COOLDOWN_MIN: 100,
  USER_COOLDOWN_MAX: 10000
};

/**
 * Sanitize string input by trimming and removing potentially harmful characters
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength) {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate Q&A question submission
 * @param {object} data - Question data
 * @returns {object} { valid: boolean, error: string|null, sanitized: object }
 */
export function validateQuestion(data) {
  const { text, authorName } = data;

  // Validate text exists
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Question text is required', sanitized: null };
  }

  // Sanitize and validate text length
  const sanitizedText = sanitizeString(text, LIMITS.QUESTION_TEXT_MAX);
  if (sanitizedText.length === 0) {
    return { valid: false, error: 'Question cannot be empty', sanitized: null };
  }

  // Sanitize author name
  const sanitizedAuthor = authorName
    ? sanitizeString(authorName, LIMITS.AUTHOR_NAME_MAX)
    : 'Anonymous';

  return {
    valid: true,
    error: null,
    sanitized: {
      text: sanitizedText,
      authorName: sanitizedAuthor
    }
  };
}

/**
 * Validate poll creation
 * @param {object} data - Poll data
 * @returns {object} { valid: boolean, error: string|null, sanitized: object }
 */
export function validatePoll(data) {
  const { question, options, durationSeconds, allowChange, allowMultiple } = data;

  // Validate question
  if (!question || typeof question !== 'string') {
    return { valid: false, error: 'Poll question is required', sanitized: null };
  }

  const sanitizedQuestion = sanitizeString(question, LIMITS.POLL_QUESTION_MAX);
  if (sanitizedQuestion.length === 0) {
    return { valid: false, error: 'Poll question cannot be empty', sanitized: null };
  }

  // Validate options array
  if (!Array.isArray(options)) {
    return { valid: false, error: 'Poll options must be an array', sanitized: null };
  }

  if (options.length < LIMITS.POLL_OPTIONS_MIN || options.length > LIMITS.POLL_OPTIONS_MAX) {
    return {
      valid: false,
      error: `Poll must have between ${LIMITS.POLL_OPTIONS_MIN} and ${LIMITS.POLL_OPTIONS_MAX} options`,
      sanitized: null
    };
  }

  // Sanitize and validate each option
  const sanitizedOptions = [];
  for (const option of options) {
    if (typeof option !== 'string') {
      return { valid: false, error: 'All poll options must be strings', sanitized: null };
    }

    const sanitizedOption = sanitizeString(option, LIMITS.POLL_OPTION_TEXT_MAX);
    if (sanitizedOption.length === 0) {
      return { valid: false, error: 'Poll options cannot be empty', sanitized: null };
    }

    sanitizedOptions.push(sanitizedOption);
  }

  // Check for duplicate options
  const uniqueOptions = new Set(sanitizedOptions);
  if (uniqueOptions.size !== sanitizedOptions.length) {
    return { valid: false, error: 'Poll options must be unique', sanitized: null };
  }

  // Validate duration if provided
  let sanitizedDuration = null;
  if (durationSeconds !== undefined && durationSeconds !== null) {
    const duration = parseInt(durationSeconds, 10);
    if (isNaN(duration) || duration < LIMITS.POLL_DURATION_MIN || duration > LIMITS.POLL_DURATION_MAX) {
      return {
        valid: false,
        error: `Duration must be between ${LIMITS.POLL_DURATION_MIN} and ${LIMITS.POLL_DURATION_MAX} seconds`,
        sanitized: null
      };
    }
    sanitizedDuration = duration;
  }

  return {
    valid: true,
    error: null,
    sanitized: {
      question: sanitizedQuestion,
      options: sanitizedOptions,
      durationSeconds: sanitizedDuration,
      allowChange: Boolean(allowChange),
      allowMultiple: Boolean(allowMultiple)
    }
  };
}

/**
 * Validate emoji reaction
 * @param {object} data - Emoji data
 * @returns {object} { valid: boolean, error: string|null, sanitized: object }
 */
export function validateEmoji(data) {
  const { emoji } = data;

  if (!emoji || typeof emoji !== 'string') {
    return { valid: false, error: 'Emoji is required', sanitized: null };
  }

  // Validate emoji is not too long (prevent abuse)
  if (emoji.length > LIMITS.EMOJI_MAX_LENGTH) {
    return { valid: false, error: 'Invalid emoji', sanitized: null };
  }

  return {
    valid: true,
    error: null,
    sanitized: { emoji }
  };
}

/**
 * Validate display settings update
 * @param {object} data - Settings data
 * @returns {object} { valid: boolean, error: string|null, sanitized: object }
 */
export function validateDisplaySettings(data) {
  const sanitized = {};

  // Valid enum values
  const VALID_EMOJI_SIZES = ['small', 'medium', 'large'];
  const VALID_ANIMATION_SPEEDS = ['slow', 'normal', 'fast'];
  const VALID_SPAWN_DIRECTIONS = ['bottom-up', 'top-down'];
  const VALID_SPAWN_POSITIONS = ['left', 'wide', 'right'];
  const VALID_POLL_POSITIONS = ['center', 'lower-third', 'bottom-bar', 'top-right', 'top-left', 'bottom-right', 'bottom-left'];
  const VALID_POLL_SIZES = ['small', 'medium', 'large'];
  const VALID_QA_POSITIONS = ['center', 'lower-third', 'bottom-bar', 'top-right', 'top-left', 'bottom-right', 'bottom-left'];
  const VALID_QA_SIZES = ['small', 'medium', 'large'];
  const VALID_TIMER_POSITIONS = ['center', 'lower-third', 'bottom-bar', 'top-right', 'top-left', 'bottom-right', 'bottom-left'];
  const VALID_TIMER_SIZES = ['small', 'medium', 'large'];
  const VALID_TIMER_STYLES = ['digital', 'minimal', 'circular'];
  const VALID_TIMER_COLORS = ['#ffffff', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

  // Validate maxOnScreen
  if (data.maxOnScreen !== undefined) {
    const max = parseInt(data.maxOnScreen, 10);
    if (isNaN(max) || max < LIMITS.MAX_ON_SCREEN_MIN || max > LIMITS.MAX_ON_SCREEN_MAX) {
      return {
        valid: false,
        error: `maxOnScreen must be between ${LIMITS.MAX_ON_SCREEN_MIN} and ${LIMITS.MAX_ON_SCREEN_MAX}`,
        sanitized: null
      };
    }
    sanitized.maxOnScreen = max;
  }

  // Validate duration
  if (data.duration !== undefined) {
    const duration = parseInt(data.duration, 10);
    if (isNaN(duration) || duration < LIMITS.EMOJI_DURATION_MIN || duration > LIMITS.EMOJI_DURATION_MAX) {
      return {
        valid: false,
        error: `Duration must be between ${LIMITS.EMOJI_DURATION_MIN} and ${LIMITS.EMOJI_DURATION_MAX}ms`,
        sanitized: null
      };
    }
    sanitized.duration = duration;
  }

  // Validate userCooldown
  if (data.userCooldown !== undefined) {
    const cooldown = parseInt(data.userCooldown, 10);
    if (isNaN(cooldown) || cooldown < LIMITS.USER_COOLDOWN_MIN || cooldown > LIMITS.USER_COOLDOWN_MAX) {
      return {
        valid: false,
        error: `User cooldown must be between ${LIMITS.USER_COOLDOWN_MIN} and ${LIMITS.USER_COOLDOWN_MAX}ms`,
        sanitized: null
      };
    }
    sanitized.userCooldown = cooldown;
  }

  // Validate boolean fields
  if (data.surgeEnabled !== undefined) {
    sanitized.surgeEnabled = Boolean(data.surgeEnabled);
  }

  if (data.emojisEnabled !== undefined) {
    sanitized.emojisEnabled = Boolean(data.emojisEnabled);
  }

  // Validate emojiSize
  if (data.emojiSize !== undefined) {
    if (!VALID_EMOJI_SIZES.includes(data.emojiSize)) {
      return {
        valid: false,
        error: `emojiSize must be one of: ${VALID_EMOJI_SIZES.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.emojiSize = data.emojiSize;
  }

  // Validate animationSpeed
  if (data.animationSpeed !== undefined) {
    if (!VALID_ANIMATION_SPEEDS.includes(data.animationSpeed)) {
      return {
        valid: false,
        error: `animationSpeed must be one of: ${VALID_ANIMATION_SPEEDS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.animationSpeed = data.animationSpeed;
  }

  // Validate spawnDirection
  if (data.spawnDirection !== undefined) {
    if (!VALID_SPAWN_DIRECTIONS.includes(data.spawnDirection)) {
      return {
        valid: false,
        error: `spawnDirection must be one of: ${VALID_SPAWN_DIRECTIONS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.spawnDirection = data.spawnDirection;
  }

  // Validate spawnPosition
  if (data.spawnPosition !== undefined) {
    if (!VALID_SPAWN_POSITIONS.includes(data.spawnPosition)) {
      return {
        valid: false,
        error: `spawnPosition must be one of: ${VALID_SPAWN_POSITIONS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.spawnPosition = data.spawnPosition;
  }

  // Validate pollPosition
  if (data.pollPosition !== undefined) {
    if (!VALID_POLL_POSITIONS.includes(data.pollPosition)) {
      return {
        valid: false,
        error: `pollPosition must be one of: ${VALID_POLL_POSITIONS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.pollPosition = data.pollPosition;
  }

  // Validate pollSize
  if (data.pollSize !== undefined) {
    if (!VALID_POLL_SIZES.includes(data.pollSize)) {
      return {
        valid: false,
        error: `pollSize must be one of: ${VALID_POLL_SIZES.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.pollSize = data.pollSize;
  }

  // Validate qaPosition
  if (data.qaPosition !== undefined) {
    if (!VALID_QA_POSITIONS.includes(data.qaPosition)) {
      return {
        valid: false,
        error: `qaPosition must be one of: ${VALID_QA_POSITIONS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.qaPosition = data.qaPosition;
  }

  // Validate qaSize
  if (data.qaSize !== undefined) {
    if (!VALID_QA_SIZES.includes(data.qaSize)) {
      return {
        valid: false,
        error: `qaSize must be one of: ${VALID_QA_SIZES.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.qaSize = data.qaSize;
  }

  // Validate timerPosition
  if (data.timerPosition !== undefined) {
    if (!VALID_TIMER_POSITIONS.includes(data.timerPosition)) {
      return {
        valid: false,
        error: `timerPosition must be one of: ${VALID_TIMER_POSITIONS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.timerPosition = data.timerPosition;
  }

  // Validate timerSize
  if (data.timerSize !== undefined) {
    if (!VALID_TIMER_SIZES.includes(data.timerSize)) {
      return {
        valid: false,
        error: `timerSize must be one of: ${VALID_TIMER_SIZES.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.timerSize = data.timerSize;
  }

  // Validate timerStyle
  if (data.timerStyle !== undefined) {
    if (!VALID_TIMER_STYLES.includes(data.timerStyle)) {
      return {
        valid: false,
        error: `timerStyle must be one of: ${VALID_TIMER_STYLES.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.timerStyle = data.timerStyle;
  }

  // Validate timerColor
  if (data.timerColor !== undefined) {
    if (!VALID_TIMER_COLORS.includes(data.timerColor)) {
      return {
        valid: false,
        error: `timerColor must be one of: ${VALID_TIMER_COLORS.join(', ')}`,
        sanitized: null
      };
    }
    sanitized.timerColor = data.timerColor;
  }

  return {
    valid: true,
    error: null,
    sanitized
  };
}

/**
 * Validate event ID format
 * @param {string} eventId - Event ID
 * @returns {boolean}
 */
export function isValidEventId(eventId) {
  if (!eventId || typeof eventId !== 'string') {
    return false;
  }

  if (eventId.length > LIMITS.EVENT_ID_MAX) {
    return false;
  }

  // Allow alphanumeric, hyphens, and underscores
  const eventIdRegex = /^[a-zA-Z0-9_-]+$/;
  return eventIdRegex.test(eventId);
}
