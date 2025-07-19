import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { resend } from '@/lib/resend';
import { tiptapToHtml } from '@/app/utils/tiptapToHtml';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// GET all broadcasts (with filtering options)
export const GET = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    // Log request details for debugging
    console.log('GET /api/broadcasts request:', {
      userId: user.id,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    console.log('API request details:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.cookies.getAll(),
      query: { status, limit, offset }
    });
    
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // Log profile query results for debugging
    console.log('User ID:', user.id);
    console.log('Profile query result:', { profile, profileError });
    
    // Check if user has admin or editor role
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }
    
    if (!profile || !profile.role) {
      console.error('User profile not found or missing role:', { profile });
      return NextResponse.json(
        { error: 'User profile not found or missing role' },
        { status: 403 }
      );
    }
    
    if (!['admin', 'editor'].includes(profile.role)) {
      console.error('Insufficient permissions. User role:', profile.role);
      return NextResponse.json(
        { error: 'Forbidden: Requires admin or editor role' },
        { status: 403 }
      );
    }
    
    // Build query
    let query = supabase
      .from('sent_mails')
      .select('*', { count: 'exact' });
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    console.log('Executing Supabase query on sent_mails table');
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching broadcasts:', error);
      
      // Check if the error is related to the table not existing
      if (error.message.includes('relation "public.sent_mails" does not exist')) {
        return NextResponse.json(
          {
            error: 'The sent_mails table does not exist',
            details: 'Please run the migration to create the sent_mails table',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      
      // Check if the error is related to permissions
      if (error.message.includes('permission denied')) {
        return NextResponse.json(
          {
            error: 'Permission denied for sent_mails table',
            details: 'Please check your RLS policies',
            code: 'PERMISSION_DENIED'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch broadcasts', details: error.message },
        { status: 500 }
      );
    }
    
    // If no data is returned but no error occurred, return an empty array
    if (!data) {
      console.log('No broadcasts found, returning empty array');
      return NextResponse.json({
        data: [],
        count: 0,
        pagination: {
          offset,
          limit,
          hasMore: false
        }
      });
    }
    
    // Log successful query for debugging
    console.log('Successfully fetched broadcasts:', { count, offset, limit });
    
    return NextResponse.json({
      data,
      count,
      pagination: {
        offset,
        limit,
        hasMore: count ? offset + limit < count : false
      }
    });
    
  } catch (error) {
    console.error('Error in GET /api/broadcasts:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// POST handler to create a new broadcast (draft)
export const POST = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const { subject, content, recipients, scheduled_for } = body;
    
    // Validate required fields
    if (!subject || !content || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, content, recipients' },
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
    
    // Determine status based on scheduled_for
    const status = scheduled_for ? 'scheduled' : 'draft';
    
    // Insert new broadcast
    const { data, error } = await supabase
      .from('sent_mails')
      .insert({
        user_id: user.id,
        subject,
        content,
        content_html: tiptapToHtml(content),
        recipients,
        total_recipients: recipients.length,
        status,
        scheduled_for: scheduled_for || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating broadcast:', error);
      
      // Check if the error is related to the table not existing
      if (error.message.includes('relation "public.sent_mails" does not exist')) {
        return NextResponse.json(
          {
            error: 'The sent_mails table does not exist',
            details: 'Please run the migration to create the sent_mails table',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      
      // Check if the error is related to permissions
      if (error.message.includes('permission denied')) {
        return NextResponse.json(
          {
            error: 'Permission denied for sent_mails table',
            details: 'Please check your RLS policies',
            code: 'PERMISSION_DENIED'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        {
          error: 'Failed to create broadcast',
          details: error.message,
          code: 'CREATE_ERROR'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
    
  } catch (error) {
    console.error('Error in POST /api/broadcasts:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});