import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

/** Admin or editor may manage other users' blog posts (server-side). */
export async function hasElevatedBlogAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile role for blog access:', profileError);
  }

  if (profile?.role === 'admin' || profile?.role === 'editor') {
    return true;
  }

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'editor'])
    .limit(1)
    .maybeSingle();

  if (roleError) {
    console.error('Error fetching user_roles for blog access:', roleError);
    return false;
  }

  return roleRow?.role === 'admin' || roleRow?.role === 'editor';
}

export async function isBlogAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role === 'admin') {
    return true;
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  return roleRow?.role === 'admin';
}