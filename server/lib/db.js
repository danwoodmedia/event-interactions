/**
 * Database Helper Module
 *
 * Provides functions for persisting and retrieving data from Supabase.
 * Used alongside in-memory Maps for real-time performance.
 */

import { supabase } from './supabase.js';

// ============================================
// EVENT OPERATIONS
// ============================================

/**
 * Get event by ID or slug
 */
export async function getEvent(eventIdOrSlug) {
  // Try by slug first (for 'default' and other string slugs)
  let { data, error } = await supabase
    .from('events')
    .select('*, event_settings(*)')
    .eq('slug', eventIdOrSlug)
    .single();

  // If not found by slug, try by UUID
  if (error && error.code === 'PGRST116') {
    const result = await supabase
      .from('events')
      .select('*, event_settings(*)')
      .eq('id', eventIdOrSlug)
      .single();
    data = result.data;
    error = result.error;
  }

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching event:', error);
  }

  return { data, error };
}

/**
 * Get all live events (for server startup recovery)
 */
export async function getLiveEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, event_settings(*)')
    .in('status', ['live', 'draft']);

  if (error) {
    console.error('Error fetching live events:', error);
    return [];
  }

  return data || [];
}

/**
 * Update event settings
 */
export async function updateEventSettings(eventId, settings) {
  const { data, error } = await supabase
    .from('event_settings')
    .upsert({
      event_id: eventId,
      ...settings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'event_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating event settings:', error);
  }

  return { data, error };
}

// ============================================
// POLL OPERATIONS
// ============================================

/**
 * Create a new poll with options
 */
export async function createPoll(eventId, pollData) {
  const { question, options, allowChange, allowMultiple, duration, correctOptionIndex } = pollData;

  // Insert poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      event_id: eventId,
      question,
      status: 'ready',
      allow_change: allowChange || false,
      allow_multiple: allowMultiple || false,
      duration_seconds: duration || null,
      position: pollData.position || 'center',
      size: pollData.size || 'medium'
    })
    .select()
    .single();

  if (pollError) {
    console.error('Error creating poll:', pollError);
    return { data: null, error: pollError };
  }

  // Insert options
  const optionsToInsert = options.map((text, index) => ({
    poll_id: poll.id,
    text,
    sort_order: index
  }));

  const { data: pollOptions, error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionsToInsert)
    .select();

  if (optionsError) {
    console.error('Error creating poll options:', optionsError);
    // Rollback poll creation
    await supabase.from('polls').delete().eq('id', poll.id);
    return { data: null, error: optionsError };
  }

  // Update correct option ID if specified
  if (correctOptionIndex !== undefined && pollOptions[correctOptionIndex]) {
    await supabase
      .from('polls')
      .update({ correct_option_id: pollOptions[correctOptionIndex].id })
      .eq('id', poll.id);
    poll.correct_option_id = pollOptions[correctOptionIndex].id;
  }

  return {
    data: {
      ...poll,
      options: pollOptions
    },
    error: null
  };
}

/**
 * Update poll status (ready -> live -> closed)
 */
export async function updatePollStatus(pollId, status, additionalFields = {}) {
  const updates = {
    status,
    ...additionalFields,
    updated_at: new Date().toISOString()
  };

  if (status === 'live') {
    updates.opened_at = new Date().toISOString();
  } else if (status === 'closed') {
    updates.closed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('polls')
    .update(updates)
    .eq('id', pollId)
    .select()
    .single();

  if (error) {
    console.error('Error updating poll status:', error);
  }

  return { data, error };
}

/**
 * Update poll settings (show_results, position, size)
 */
export async function updatePoll(pollId, updates) {
  const { data, error } = await supabase
    .from('polls')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', pollId)
    .select()
    .single();

  if (error) {
    console.error('Error updating poll:', error);
  }

  return { data, error };
}

/**
 * Delete a poll (cascades to options and votes)
 */
export async function deletePoll(pollId) {
  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (error) {
    console.error('Error deleting poll:', error);
  }

  return { error };
}

/**
 * Get all polls for an event with options and vote counts
 */
export async function getPollsForEvent(eventId) {
  const { data: polls, error } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options (
        id,
        text,
        sort_order
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching polls:', error);
    return [];
  }

  // Get vote counts for each poll
  for (const poll of polls) {
    const { data: votes } = await supabase
      .from('poll_votes')
      .select('option_id, session_id')
      .eq('poll_id', poll.id);

    poll.votes = votes || [];
    poll.options = poll.poll_options || [];
    delete poll.poll_options;
  }

  return polls;
}

/**
 * Get votes for a poll
 */
export async function getVotesForPoll(pollId) {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId);

  if (error) {
    console.error('Error fetching votes:', error);
    return [];
  }

  return data || [];
}

// ============================================
// VOTE OPERATIONS
// ============================================

/**
 * Record a vote (handles both single-select and multi-select)
 * For single-select: removes existing vote first
 * For multi-select: adds to existing votes
 */
export async function recordVote(pollId, optionId, sessionId, isMultiSelect = false) {
  if (!isMultiSelect) {
    // Single-select: delete any existing vote for this session
    await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('session_id', sessionId);
  }

  // Insert the new vote
  const { data, error } = await supabase
    .from('poll_votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      session_id: sessionId
    })
    .select()
    .single();

  if (error) {
    // Ignore duplicate vote error for multi-select (same option voted twice)
    if (error.code === '23505') {
      return { data: null, error: null, duplicate: true };
    }
    console.error('Error recording vote:', error);
  }

  return { data, error };
}

/**
 * Remove a vote (for multi-select toggle off)
 */
export async function removeVote(pollId, optionId, sessionId) {
  const { error } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('option_id', optionId)
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error removing vote:', error);
  }

  return { error };
}

/**
 * Clear all votes for a poll (for poll reset)
 */
export async function clearPollVotes(pollId) {
  const { error } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId);

  if (error) {
    console.error('Error clearing poll votes:', error);
  }

  return { error };
}

// ============================================
// Q&A OPERATIONS
// ============================================

/**
 * Create a new question
 */
export async function createQuestion(eventId, text, authorName, sessionId) {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      event_id: eventId,
      text,
      submitter_name: authorName || 'Anonymous',
      session_id: sessionId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating question:', error);
  }

  return { data, error };
}

/**
 * Update question status
 */
export async function updateQuestionStatus(questionId, status) {
  const updates = { status };

  if (status === 'featured') {
    updates.featured_at = new Date().toISOString();
  } else if (status === 'answered') {
    updates.answered_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating question status:', error);
  }

  return { data, error };
}

/**
 * Get all questions for an event
 */
export async function getQuestionsForEvent(eventId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    console.error('Error deleting question:', error);
  }

  return { error };
}

/**
 * Clear all questions for an event
 */
export async function clearEventQuestions(eventId) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('event_id', eventId);

  if (error) {
    console.error('Error clearing questions:', error);
  }

  return { error };
}

// ============================================
// BUNDLE OPERATIONS
// ============================================

/**
 * Create a poll bundle
 */
export async function createBundle(eventId, name) {
  const { data, error } = await supabase
    .from('poll_bundles')
    .insert({
      event_id: eventId,
      name,
      status: 'ready'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bundle:', error);
  }

  return { data, error };
}

/**
 * Delete a bundle
 */
export async function deleteBundle(bundleId) {
  const { error } = await supabase
    .from('poll_bundles')
    .delete()
    .eq('id', bundleId);

  if (error) {
    console.error('Error deleting bundle:', error);
  }

  return { error };
}

/**
 * Add poll to bundle
 */
export async function addPollToBundle(bundleId, pollId, sortOrder) {
  const { data, error } = await supabase
    .from('bundle_polls')
    .insert({
      bundle_id: bundleId,
      poll_id: pollId,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding poll to bundle:', error);
  }

  return { data, error };
}

/**
 * Remove poll from bundle
 */
export async function removePollFromBundle(bundleId, pollId) {
  const { error } = await supabase
    .from('bundle_polls')
    .delete()
    .eq('bundle_id', bundleId)
    .eq('poll_id', pollId);

  if (error) {
    console.error('Error removing poll from bundle:', error);
  }

  return { error };
}

/**
 * Update bundle status
 */
export async function updateBundleStatus(bundleId, status, currentIndex = null) {
  const updates = { status };
  if (currentIndex !== null) {
    updates.current_index = currentIndex;
  }

  const { data, error } = await supabase
    .from('poll_bundles')
    .update(updates)
    .eq('id', bundleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle status:', error);
  }

  return { data, error };
}

/**
 * Get all bundles for an event with their polls
 */
export async function getBundlesForEvent(eventId) {
  const { data: bundles, error } = await supabase
    .from('poll_bundles')
    .select(`
      *,
      bundle_polls (
        poll_id,
        sort_order
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bundles:', error);
    return [];
  }

  return bundles || [];
}

// ============================================
// EMOJI PACK OPERATIONS
// ============================================

/**
 * Create an emoji pack
 */
export async function createEmojiPack(eventId, name, emojis) {
  const { data, error } = await supabase
    .from('emoji_packs')
    .insert({
      event_id: eventId,
      name,
      emojis,
      is_active: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating emoji pack:', error);
  }

  return { data, error };
}

/**
 * Update an emoji pack
 */
export async function updateEmojiPack(packId, updates) {
  const { data, error } = await supabase
    .from('emoji_packs')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', packId)
    .select()
    .single();

  if (error) {
    console.error('Error updating emoji pack:', error);
  }

  return { data, error };
}

/**
 * Delete an emoji pack
 */
export async function deleteEmojiPack(packId) {
  const { error } = await supabase
    .from('emoji_packs')
    .delete()
    .eq('id', packId);

  if (error) {
    console.error('Error deleting emoji pack:', error);
  }

  return { error };
}

/**
 * Get all emoji packs for an event
 */
export async function getEmojiPacksForEvent(eventId) {
  const { data, error } = await supabase
    .from('emoji_packs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching emoji packs:', error);
    return [];
  }

  return data || [];
}

/**
 * Set active emoji pack (deactivates others)
 */
export async function setActiveEmojiPack(eventId, packId) {
  // Deactivate all packs for this event
  await supabase
    .from('emoji_packs')
    .update({ is_active: false })
    .eq('event_id', eventId);

  // Activate the selected pack
  if (packId) {
    await supabase
      .from('emoji_packs')
      .update({ is_active: true })
      .eq('id', packId);
  }

  return { error: null };
}

// ============================================
// REACTION OPERATIONS (Analytics)
// ============================================

/**
 * Record a reaction (async, non-blocking for real-time performance)
 * This is for analytics purposes only, not for real-time queue
 */
export async function recordReaction(eventId, emoji, sessionId) {
  // Fire and forget - don't await
  supabase
    .from('reactions')
    .insert({
      event_id: eventId,
      emoji,
      session_id: sessionId
    })
    .then(({ error }) => {
      if (error) {
        console.error('Error recording reaction:', error);
      }
    });
}

/**
 * Get reaction stats for an event
 */
export async function getReactionStats(eventId) {
  const { data, error } = await supabase
    .from('reactions')
    .select('emoji')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching reaction stats:', error);
    return { total: 0, byEmoji: {} };
  }

  const byEmoji = {};
  (data || []).forEach(({ emoji }) => {
    byEmoji[emoji] = (byEmoji[emoji] || 0) + 1;
  });

  return {
    total: data?.length || 0,
    byEmoji
  };
}

// ============================================
// TIMER OPERATIONS
// ============================================

/**
 * Create a new timer
 */
export async function createTimer(eventId, timerData) {
  const { name, type, duration, position, size } = timerData;

  const { data, error } = await supabase
    .from('timers')
    .insert({
      event_id: eventId,
      name,
      type,
      duration_ms: duration || 0,
      status: 'ready',
      paused_elapsed_ms: 0,
      show_on_display: false,
      position: position || 'center',
      size: size || 'medium'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating timer:', error);
  }

  return { data, error };
}

/**
 * Update timer status and timing fields
 */
export async function updateTimer(timerId, updates) {
  const { data, error } = await supabase
    .from('timers')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', timerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating timer:', error);
  }

  return { data, error };
}

/**
 * Delete a timer
 */
export async function deleteTimer(timerId) {
  const { error } = await supabase
    .from('timers')
    .delete()
    .eq('id', timerId);

  if (error) {
    console.error('Error deleting timer:', error);
  }

  return { error };
}

/**
 * Get all timers for an event
 */
export async function getTimersForEvent(eventId) {
  const { data, error } = await supabase
    .from('timers')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching timers:', error);
    return [];
  }

  return data || [];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Resolve event ID from slug or UUID
 * Returns the UUID event ID
 */
export async function resolveEventId(eventIdOrSlug) {
  // Check if it's already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(eventIdOrSlug)) {
    return eventIdOrSlug;
  }

  // Look up by slug
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('slug', eventIdOrSlug)
    .single();

  return data?.id || null;
}

/**
 * Get or create event by slug
 * Used for the 'default' event that may not exist yet
 */
export async function getOrCreateEvent(slug) {
  // Try to get existing event
  let { data: event } = await supabase
    .from('events')
    .select('*, event_settings(*)')
    .eq('slug', slug)
    .single();

  if (event) {
    return { data: event, error: null };
  }

  // Create default organization if needed
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Default Organization')
    .single();

  let orgId = org?.id;
  if (!orgId) {
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: 'Default Organization' })
      .select()
      .single();
    orgId = newOrg?.id;
  }

  // Create the event
  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      organization_id: orgId,
      name: slug === 'default' ? 'Default Event' : slug,
      slug,
      status: 'live'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { data: null, error };
  }

  // Create event settings
  await supabase
    .from('event_settings')
    .insert({ event_id: newEvent.id });

  return { data: newEvent, error: null };
}
