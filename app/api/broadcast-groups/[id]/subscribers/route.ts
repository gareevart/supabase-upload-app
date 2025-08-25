import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/types';

// Create a server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - получить подписчиков группы
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET /api/broadcast-groups/[id]/subscribers - Starting request');
    
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
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const groupId = params.id;

    // Get subscribers for this group
    const { data: subscribers, error } = await supabaseServer
      .from('subscribe')
      .select(`
        *,
        group_subscribers!inner(group_id)
      `)
      .eq('group_subscribers.group_id', groupId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching group subscribers:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch subscribers', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ data: subscribers });
  } catch (error) {
    console.error('Error in GET group subscribers:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - добавить подписчиков в группу
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /api/broadcast-groups/[id]/subscribers - Starting request');
    
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
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const groupId = params.id;
    const body = await request.json();
    const { emails, subscriber_ids } = body;

    console.log('Request body:', { emails: emails?.length, subscriber_ids: subscriber_ids?.length });

    let subscriberIdsToAdd: string[] = [];

    // If emails are provided, find or create subscribers
    if (emails && Array.isArray(emails) && emails.length > 0) {
      for (const email of emails) {
        // Check if subscriber exists
        let { data: existingSubscriber, error: findError } = await supabaseServer
          .from('subscribe')
          .select('id')
          .eq('email', email)
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error finding subscriber:', findError);
          continue;
        }

        if (existingSubscriber) {
          subscriberIdsToAdd.push(existingSubscriber.id);
        } else {
          // Create new subscriber
          const { data: newSubscriber, error: createError } = await supabaseServer
            .from('subscribe')
            .insert({
              email,
              is_active: true
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating subscriber:', createError);
            continue;
          }

          if (newSubscriber) {
            subscriberIdsToAdd.push(newSubscriber.id);
          }
        }
      }
    }

    // If subscriber_ids are provided directly
    if (subscriber_ids && Array.isArray(subscriber_ids)) {
      subscriberIdsToAdd.push(...subscriber_ids);
    }

    if (subscriberIdsToAdd.length === 0) {
      return NextResponse.json({ error: 'No valid subscribers to add' }, { status: 400 });
    }

    // Add subscribers to group
    const groupSubscribers = subscriberIdsToAdd.map(subscriber_id => ({
      group_id: groupId,
      subscriber_id
    }));

    const { error: insertError } = await supabaseServer
      .from('group_subscribers')
      .insert(groupSubscribers);

    if (insertError) {
      console.error('Error adding subscribers to group:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add subscribers to group', 
        details: insertError.message 
      }, { status: 500 });
    }

    console.log(`Added ${subscriberIdsToAdd.length} subscribers to group ${groupId}`);
    return NextResponse.json({ 
      message: 'Subscribers added successfully',
      added_count: subscriberIdsToAdd.length 
    });
  } catch (error) {
    console.error('Error in POST group subscribers:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - удалить подписчиков из группы
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE /api/broadcast-groups/[id]/subscribers - Starting request');
    
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
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabaseServerWithAuth.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const groupId = params.id;
    const body = await request.json();
    const { subscriber_ids } = body;

    if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
      return NextResponse.json({ error: 'subscriber_ids array is required' }, { status: 400 });
    }

    // Remove subscribers from group
    const { error: deleteError } = await supabaseServer
      .from('group_subscribers')
      .delete()
      .eq('group_id', groupId)
      .in('subscriber_id', subscriber_ids);

    if (deleteError) {
      console.error('Error removing subscribers from group:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove subscribers from group', 
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log(`Removed ${subscriber_ids.length} subscribers from group ${groupId}`);
    return NextResponse.json({ 
      message: 'Subscribers removed successfully',
      removed_count: subscriber_ids.length 
    });
  } catch (error) {
    console.error('Error in DELETE group subscribers:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}