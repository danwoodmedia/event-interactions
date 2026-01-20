import { supabase } from './supabase.js';

/**
 * Verify a JWT token from Supabase Auth
 * @param {string} token - JWT access token
 * @returns {Promise<{user: object|null, error: Error|null}>}
 */
export async function verifyToken(token) {
  try {
    if (!token) {
      return { user: null, error: new Error('No token provided') };
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { user: null, error };
    }

    if (!user) {
      return { user: null, error: new Error('Invalid token') };
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Get user role from database or metadata
 * For now, we'll use user metadata. In production, query org_memberships table
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{role: string|null, error: Error|null}>}
 */
export async function getUserRole(userId, eventId = 'default') {
  try {
    // TODO: Query org_memberships table once we have event->organization mapping
    // For now, return a default role based on user metadata
    console.log(`[getUserRole] Fetching role for user: ${userId}`);

    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      console.log(`[getUserRole] Error fetching user:`, error.message);
      return { role: null, error };
    }

    if (!user) {
      console.log(`[getUserRole] User not found: ${userId}`);
      return { role: null, error: new Error('User not found') };
    }

    // Check user_metadata for role (set during signup)
    const role = user?.user_metadata?.role || 'audience';
    console.log(`[getUserRole] User ${userId} has role: ${role}`);

    return { role, error: null };
  } catch (error) {
    console.log(`[getUserRole] Exception:`, error.message);
    return { role: null, error };
  }
}

/**
 * Validate that a user has permission for a specific role
 * @param {string} userId - User ID
 * @param {string} requiredRole - Required role ('producer', 'avtech', 'admin')
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>}
 */
export async function hasRole(userId, requiredRole, eventId = 'default') {
  const { role, error } = await getUserRole(userId, eventId);

  if (error || !role) {
    return false;
  }

  // Role hierarchy: admin > producer > avtech > audience
  const roleHierarchy = {
    admin: 4,
    producer: 3,
    avtech: 2,
    audience: 1
  };

  const userLevel = roleHierarchy[role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Extract token from Socket.IO handshake
 * Supports both query params and auth header
 * @param {object} socket - Socket.IO socket
 * @returns {string|null}
 */
export function extractToken(socket) {
  // Try to get token from auth query parameter
  const queryToken = socket.handshake.auth?.token;
  if (queryToken) {
    return queryToken;
  }

  // Try to get token from Authorization header
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
