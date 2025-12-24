
import { createClient } from '@supabase/supabase-js';

// Helper to read environment variables
const getEnvVar = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
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

// User provided credentials (Default connection)
// Populated from Developer Resources to enable automatic connection
const PROVIDED_URL = 'https://ygnxgcqnfwcecrtjqwnb.supabase.co';
const PROVIDED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbnhnY3FuZndjZWNydGpxd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODAzOTIsImV4cCI6MjA4MjA1NjM5Mn0.ThbIV7hKzY8Za_at7WBclNbScTQT3fMT2RJR2JpQ64A';

// Priority: 1. Environment Variable, 2. LocalStorage, 3. Hardcoded (User provided)
const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL') || getStoredValue('supabase_url') || PROVIDED_URL; 
const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getStoredValue('supabase_key') || PROVIDED_KEY;

// Check if keys are present
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};

// Initialize client (always create if keys exist, logic guards will handle usage)
export const supabase = (SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
