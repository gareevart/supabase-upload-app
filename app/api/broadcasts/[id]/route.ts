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

    // Fetch the broadcast
    const { data, error } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('id', id)
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

    // Update the broadcast
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

    // Delete the broadcast
    const { error } = await supabase
      .from('sent_mails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting broadcast:', error);
      return NextResponse.json(
        { error: 'Failed to delete broadcast', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/broadcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});