'use client';

import { isSupabaseConfigured } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Get the current active session (from local storage fallback)
 */
export const getLocalSession = () => {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('neet_session');
  if (session) {
    try {
      const parsed = JSON.parse(session);

      // When Supabase is configured, only accept real UUID-backed sessions.
      // Demo sessions are cleared so the app reads real database-backed data.
      if (isSupabaseConfigured() && (!parsed?.id || !UUID_REGEX.test(parsed.id))) {
        localStorage.removeItem('neet_session');
        return null;
      }

      return parsed;
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Save active session
 */
export const setLocalSession = (user) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('neet_session', JSON.stringify(user));
  } else {
    localStorage.removeItem('neet_session');
  }
};

/**
 * Wipe session and redirect to login
 */
export const logoutSession = async (supabaseClient) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('neet_session');
  
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('Supabase logout skipped:', e.message);
    }
  }
  
  // Clean up localStorage exam attempts state
  localStorage.removeItem('active_test_responses');
  
  window.location.href = '/auth';
};
