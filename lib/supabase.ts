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
    storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
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
          const cookieSettings = [
            `${key}=${value}`,
            'path=/',
            `domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN || window.location.hostname}`,
            'max-age=2592000', // 30 days
            'SameSite=Lax',
            process.env.NODE_ENV === 'production' ? 'secure' : ''
          ].filter(Boolean).join('; ');
          document.cookie = cookieSettings;
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          // Remove from both cookies and localStorage
          document.cookie = `${key}=; path=/; domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN || window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure`;
          localStorage.removeItem(key);
        }
      }
    }
  }
});
