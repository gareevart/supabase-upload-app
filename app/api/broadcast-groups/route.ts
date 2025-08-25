import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/types';

// Create a server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/broadcast-groups - Starting request');
    
    // Create a server-side Supabase client with cookies
    const supabaseServerWithAuth = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    
    // Get user session using server client
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    console.log('Session check:', { hasSession: !!session, sessionError });
    
    if (sessionError || !session) {
      console.log('No session or session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('Profile check:', { profile, profileError, userId: session.user.id });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch user profile',
        details: profileError.message
      }, { status: 500 });
    }

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      console.log('Insufficient permissions:', { role: profile?.role });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all broadcast groups
    console.log('Fetching broadcast groups...');
    const { data: groups, error } = await supabaseServer
      .from('broadcast_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching broadcast groups:', error);
      return NextResponse.json({
        error: 'Failed to fetch groups',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('Found groups:', groups?.length || 0);

    // Get subscriber counts for each group
    const groupsWithCount = await Promise.all(groups.map(async (group) => {
      try {
        if (group.is_default) {
          // For default group, count all active subscribers
          console.log('Counting subscribers for default group...');
          const { count, error: countError } = await supabaseServer
            .from('subscribe')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
          
          if (countError) {
            console.error('Error counting subscribers:', countError);
          }
          
          return {
            ...group,
            subscriber_count: count || 0
          };
        } else {
          // For custom groups, count subscribers in group_subscribers table
          console.log(`Counting subscribers for group ${group.id}...`);
          const { count, error: countError } = await supabaseServer
            .from('group_subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          if (countError) {
            console.error('Error counting group subscribers:', countError);
          }
          
          return {
            ...group,
            subscriber_count: count || 0
          };
        }
      } catch (groupError) {
        console.error('Error processing group:', group.id, groupError);
        return {
          ...group,
          subscriber_count: 0
        };
      }
    }));

    console.log('Returning groups with counts:', groupsWithCount.length);
    return NextResponse.json({ data: groupsWithCount });
  } catch (error) {
    console.error('Error in broadcast-groups GET:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/broadcast-groups - Starting request');
    
    // Create a server-side Supabase client with cookies
    const supabaseServerWithAuth = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    
    // Get user session using server client
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    console.log('Session check:', { hasSession: !!session, sessionError });
    
    if (sessionError || !session) {
      console.log('No session or session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('Profile check:', { profile, profileError, userId: session.user.id });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch user profile',
        details: profileError.message
      }, { status: 500 });
    }

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      console.log('Insufficient permissions:', { role: profile?.role });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, subscriber_ids = [] } = body;
    
    console.log('Request body:', { name, description, subscriber_ids_count: subscriber_ids.length });

    if (!name) {
      console.log('Missing group name');
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create the group
    console.log('Creating broadcast group...');
    const { data: group, error: groupError } = await supabaseServer
      .from('broadcast_groups')
      .insert({
        name,
        description,
        user_id: session.user.id,
        is_default: false
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating broadcast group:', groupError);
      return NextResponse.json({
        error: 'Failed to create group',
        details: groupError.message,
        code: groupError.code
      }, { status: 500 });
    }

    console.log('Group created successfully:', group.id);

    // Add subscribers to the group if provided
    if (subscriber_ids.length > 0) {
      console.log(`Adding ${subscriber_ids.length} subscribers to group...`);
      const groupSubscribers = subscriber_ids.map((subscriber_id: string) => ({
        group_id: group.id,
        subscriber_id
      }));

      const { error: subscribersError } = await supabaseServer
        .from('group_subscribers')
        .insert(groupSubscribers);

      if (subscribersError) {
        console.error('Error adding subscribers to group:', subscribersError);
        // Don't fail the request, just log the error
      } else {
        console.log('Subscribers added successfully');
      }
    }

    console.log('Returning created group');
    return NextResponse.json({ data: group });
  } catch (error) {
    console.error('Error in broadcast-groups POST:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/broadcast-groups - Starting request');
    
    // Create a server-side Supabase client with cookies
    const supabaseServerWithAuth = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    
    // Get user session using server client
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    console.log('Session check:', { hasSession: !!session, sessionError });
    
    if (sessionError || !session) {
      console.log('No session or session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('Profile check:', { profile, profileError, userId: session.user.id });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch user profile',
        details: profileError.message
      }, { status: 500 });
    }

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      console.log('Insufficient permissions:', { role: profile?.role });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { group_ids } = body;

    if (!group_ids || !Array.isArray(group_ids) || group_ids.length === 0) {
      return NextResponse.json({ error: 'group_ids array is required' }, { status: 400 });
    }

    console.log('Deleting groups:', group_ids);

    // Check if any of the groups are default groups (cannot be deleted)
    const { data: defaultGroups, error: defaultCheckError } = await supabaseServer
      .from('broadcast_groups')
      .select('id, name, is_default')
      .in('id', group_ids)
      .eq('is_default', true);

    if (defaultCheckError) {
      console.error('Error checking default groups:', defaultCheckError);
      return NextResponse.json({
        error: 'Failed to check group permissions',
        details: defaultCheckError.message
      }, { status: 500 });
    }

    if (defaultGroups && defaultGroups.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete default groups',
        details: `Default groups cannot be deleted: ${defaultGroups.map(g => g.name).join(', ')}`
      }, { status: 400 });
    }

    // Delete the groups (CASCADE will handle group_subscribers)
    const { error: deleteError } = await supabaseServer
      .from('broadcast_groups')
      .delete()
      .in('id', group_ids);

    if (deleteError) {
      console.error('Error deleting groups:', deleteError);
      return NextResponse.json({
        error: 'Failed to delete groups',
        details: deleteError.message
      }, { status: 500 });
    }

    console.log(`Successfully deleted ${group_ids.length} groups`);
    return NextResponse.json({
      message: 'Groups deleted successfully',
      deleted_count: group_ids.length
    });
  } catch (error) {
    console.error('Error in broadcast-groups DELETE:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}