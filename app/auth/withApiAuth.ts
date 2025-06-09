import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const withApiAuth = (handler: (req: NextRequest, user: { id: string }) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    try {
      // Log all request headers for debugging
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Auth middleware headers:', {
        ...headers,
        timestamp: new Date().toISOString(),
        path: req.nextUrl.pathname,
        method: req.method
      });

      // Get user with automatic token refresh
      const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get: (name: string) => req.cookies.get(name)?.value,
            set: (name: string, value: string, options: CookieOptions) => {
              req.cookies.set({
                name,
                value,
                ...options,
              });
            },
            remove: (name: string, options: CookieOptions) => {
              req.cookies.delete(name);
            },
          },
        }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        const errorDetails = {
          error: error?.message || 'No active session',
          code: error?.code,
          status: error?.status,
          headers: {
            cookie: req.headers.get('cookie'),
            authorization: req.headers.get('authorization'),
            origin: req.headers.get('origin'),
            referer: req.headers.get('referer')
          },
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          method: req.method
        };
        console.error('API auth check failed:', errorDetails);
        
        return NextResponse.json(
          {
            error: 'Unauthorized',
            details: error?.message || 'No active session',
            code: error?.code,
            timestamp: errorDetails.timestamp
          },
          {
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
              'Access-Control-Allow-Credentials': 'true'
            }
          }
        );
      }

      // Verify session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const errorDetails = {
          userId: user?.id,
          timestamp: new Date().toISOString(),
          headers: {
            cookie: req.headers.get('cookie'),
            authorization: req.headers.get('authorization'),
            origin: req.headers.get('origin'),
            referer: req.headers.get('referer')
          },
          path: req.nextUrl.pathname,
          method: req.method
        };
        console.error('Session expired:', errorDetails);
        
        return NextResponse.json(
          {
            error: 'Session expired',
            details: 'Please refresh your session',
            timestamp: errorDetails.timestamp
          },
          {
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
              'Access-Control-Allow-Credentials': 'true'
            }
          }
        );
      }

      const response = await handler(req, { id: user.id });
      
      // Add CORS headers to successful responses
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    } catch (err) {
      console.error('Auth middleware error:', {
        error: err,
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined
      });
      return NextResponse.json(
        { error: 'Authentication failed', details: err instanceof Error ? err.message : undefined },
        { status: 500 }
      );
    }
  };
};