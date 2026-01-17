import { supabase } from './supabase'

// Sign in with magic link (email)
export async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  })
  return { data, error }
}

// Sign in with OAuth provider (Google, Microsoft, etc.)
export async function signInWithOAuth(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  })
  return { data, error }
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// Get current user
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return subscription
}
