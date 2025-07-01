import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use cookies for session storage to ensure proper authentication with API routes
    storageKey: 'supabase-auth',
    flowType: 'pkce',
    // Keep localStorage for backward compatibility
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          // Try to get from cookies first
          const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
          if (match) return match[2];
          // Fall back to localStorage
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          // Set in both cookies and localStorage
          document.cookie = `${key}=${value}; path=/; max-age=2592000; SameSite=Lax; secure`;
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          // Remove from both cookies and localStorage
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure`;
          localStorage.removeItem(key);
        }
      }
    }
  }
});
