import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Create Supabase client with service role key for server-side operations
// This bypasses Row Level Security and has full database access
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// For operations that need to respect RLS (when acting on behalf of a user)
export const createUserClient = (accessToken) => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
};
