
import { createClient } from '@supabase/supabase-js';

// Helper to read environment variables
const getEnvVar = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-expect-error: import.meta is not defined in all environments
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-expect-error: import.meta.env is not defined in all environments
    return import.meta.env[key];
  }
  return '';
};

// Helper to read from LocalStorage (for UI-based configuration)
const getStoredValue = (key: string) => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || '';
  }
  return '';
};

// No hardcoded fallback credentials here on purpose. This file used to embed the
// project's real Supabase URL and anon key directly in source - and therefore in the
// public GitHub repo. Anon keys are only safe to expose when RLS policies are correct
// (which we've since audited and hardened), but hardcoding one as a silent fallback
// meant anyone who cloned the repo connected to the real database by default, with no
// visibility that that was even happening. Credentials now come exclusively from
// environment variables or the runtime-configured value below - if neither is present,
// isSupabaseConfigured() correctly reports false instead of silently using a secret.

// Priority: 1. Environment Variable, 2. LocalStorage (runtime-configured connection)
const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL') || getStoredValue('supabase_url');
const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getStoredValue('supabase_key');

// Check if keys are present
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};

// Initialize client (always create if keys exist, logic guards will handle usage)
export const supabase = (SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
