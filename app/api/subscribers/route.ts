import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/subscribers - Starting request');
    
    // Create server client with cookies for authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { hasSession: !!session, error: sessionError });
    
    if (sessionError || !session) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const active_only = searchParams.get('active_only') === 'true';
    const group_id = searchParams.get('group_id');

    let query = supabaseServer.from('subscribe').select('*');

    if (active_only) {
      query = query.eq('is_active', true);
    }

    if (group_id) {
      // Get subscribers for specific group
      query = supabaseServer
        .from('subscribe')
        .select(`
          *,
          group_subscribers!inner(group_id)
        `)
        .eq('group_subscribers.group_id', group_id);
      
      if (active_only) {
        query = query.eq('is_active', true);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscribers:', error);
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    return NextResponse.json({ data: subscribers });
  } catch (error) {
    console.error('Error in subscribers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/subscribers - Starting request');
    
    // Create server client with cookies for authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { hasSession: !!session, error: sessionError });
    
    if (sessionError || !session) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or editor role
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Create the subscriber
    const { data: subscriber, error: subscriberError } = await supabaseServer
      .from('subscribe')
      .insert({
        email,
        name,
        is_active: true
      })
      .select()
      .single();

    if (subscriberError) {
      if (subscriberError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
      console.error('Error creating subscriber:', subscriberError);
      return NextResponse.json({ error: 'Failed to create subscriber' }, { status: 500 });
    }

    return NextResponse.json({ data: subscriber });
  } catch (error) {
    console.error('Error in subscribers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}