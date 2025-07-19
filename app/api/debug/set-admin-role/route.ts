import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// GET handler to check and set admin role
export const GET = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
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
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Log profile query results for debugging
    console.log('User ID:', user.id);
    console.log('Profile query result:', { profile, profileError });
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }
    
    // If profile doesn't exist, create it with admin role
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          role: 'admin'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user profile', details: insertError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Created new profile with admin role',
        profile: newProfile
      });
    }
    
    // If profile exists but doesn't have a role, set it to admin
    if (!profile.role) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile', details: updateError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Updated profile with admin role',
        profile: updatedProfile
      });
    }
    
    // If profile already has a role, return it
    return NextResponse.json({
      success: true,
      message: 'Profile already has a role',
      profile
    });
    
  } catch (error) {
    console.error('Error in GET /api/debug/set-admin-role:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});