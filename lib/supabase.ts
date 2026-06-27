import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Client-side Supabase client with cookie-based session storage
// This ensures that the session is accessible to server-side API routes
// Cast: @supabase/ssr overloads + newer @supabase/supabase-js generics break .from() inference.
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
) as unknown as SupabaseClient<Database>;
