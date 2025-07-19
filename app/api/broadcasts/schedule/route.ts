import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// POST handler to schedule a broadcast
export const POST = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const { id, scheduled_for } = body;
    
    // Validate required fields
    if (!id || !scheduled_for) {
      return NextResponse.json(
        { error: 'Missing required fields: id, scheduled_for' },
        { status: 400 }
      );
    }
    
    // Validate scheduled_for is in the future
    const scheduledDate = new Date(scheduled_for);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }
    
    // Create a new supabase client for this request
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove: (name: string, options: CookieOptions) => {
            request.cookies.delete(name);
          },
        },
      }
    );
    
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // Check if user has admin or editor role
    if (!profile || !profile.role || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Requires admin or editor role' },
        { status: 403 }
      );
    }
    
    // Get the broadcast
    const { data: broadcast, error: fetchError } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }
    
    // Check if broadcast is already sent
    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot schedule a broadcast that has already been sent' },
        { status: 400 }
      );
    }
    
    // Update broadcast status to scheduled
    const { data, error: updateError } = await supabase
      .from('sent_mails')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledDate.toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to schedule broadcast' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        scheduled_for: data.scheduled_for
      }
    });
    
  } catch (error) {
    console.error('Error in POST /api/broadcasts/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE handler to cancel a scheduled broadcast
export const DELETE = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }
    
    // Create a new supabase client for this request
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove: (name: string, options: CookieOptions) => {
            request.cookies.delete(name);
          },
        },
      }
    );
    
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // Check if user has admin or editor role
    if (!profile || !profile.role || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Requires admin or editor role' },
        { status: 403 }
      );
    }
    
    // Get the broadcast
    const { data: broadcast, error: fetchError } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }
    
    // Check if broadcast is scheduled
    if (broadcast.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot cancel a broadcast that is not scheduled' },
        { status: 400 }
      );
    }
    
    // Update broadcast status to draft
    const { error: updateError } = await supabase
      .from('sent_mails')
      .update({
        status: 'draft',
        scheduled_for: null
      })
      .eq('id', id);
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel scheduled broadcast' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Broadcast scheduling cancelled'
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/broadcasts/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});