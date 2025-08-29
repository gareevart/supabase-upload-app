import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { tiptapToHtml } from '@/app/utils/tiptapToHtml';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// GET single broadcast
export const GET = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    // Extract id from URL path parameter
    const id = request.nextUrl.pathname.split('/').pop();
    
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
        {
          error: 'Forbidden',
          message: 'Requires admin or editor role',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Fetch the broadcast - ensuring user owns it or is admin
    const { data, error } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)  // Only allow users to access their own broadcasts
      .single();

    if (error) {
      console.error('Error fetching broadcast:', error);
      return NextResponse.json(
        { error: 'Failed to fetch broadcast', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
    
  } catch (error) {
    console.error('Error in GET /api/broadcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT update broadcast
export const PUT = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    // Extract id from URL path parameter
    const id = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    const { subject, content, recipients, status, scheduled_for } = body;

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

    // Update the broadcast - ensuring user owns it
    const { data, error } = await supabase
      .from('sent_mails')
      .update({
        subject,
        content,
        content_html: tiptapToHtml(content),
        recipients,
        status,
        scheduled_for,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)  // Only allow updates to user's own broadcasts
      .select()
      .single();

    if (error) {
      console.error('Error updating broadcast:', error);
      return NextResponse.json(
        { error: 'Failed to update broadcast', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error in PUT /api/broadcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE broadcast
export const DELETE = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    // Extract id from URL path parameter
    const id = request.nextUrl.pathname.split('/').pop();
    console.log('DELETE broadcast - ID extracted:', id);
    console.log('DELETE broadcast - User ID:', user.id);

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

    console.log('DELETE broadcast - User profile:', profile);

    // Check if user has admin or editor role
    if (!profile || !profile.role || !['admin', 'editor'].includes(profile.role)) {
      console.error('DELETE broadcast - Forbidden: User role check failed');
      return NextResponse.json(
        { error: 'Forbidden: Requires admin or editor role' },
        { status: 403 }
      );
    }

    // Check if broadcast exists and user owns it before deletion
    const { data: existingBroadcast, error: fetchError } = await supabase
      .from('sent_mails')
      .select('id, subject, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)  // Ensure user owns this broadcast
      .single();

    console.log('DELETE broadcast - Existing broadcast:', existingBroadcast);

    if (fetchError) {
      console.error('DELETE broadcast - Error fetching broadcast before deletion:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Broadcast not found' },
          { status: 404 }
        );
      }
    }

    if (!existingBroadcast) {
      console.error('DELETE broadcast - Broadcast not found');
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    // Delete the broadcast - ensuring user owns it
    console.log('DELETE broadcast - Executing deletion query');
    const { error } = await supabase
      .from('sent_mails')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);  // Only delete user's own broadcasts

    if (error) {
      console.error('DELETE broadcast - Error during deletion:', error);
      return NextResponse.json(
        { error: 'Failed to delete broadcast', details: error.message },
        { status: 500 }
      );
    }

    console.log('DELETE broadcast - Deletion successful');

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully'
    });

  } catch (error) {
    console.error('DELETE broadcast - Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});