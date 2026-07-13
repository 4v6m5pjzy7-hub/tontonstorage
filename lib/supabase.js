import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service-role key.
let cached = null;

export function getSupabase() {
  if (cached) return cached;
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
