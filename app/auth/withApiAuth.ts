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
      // Проверяем Authorization header (приоритет над cookies)
      const authHeader = req.headers.get('authorization');
      let user = null;
      let error: { message?: string; code?: string; status?: number } | null = null;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        });

        try {
          const result = await supabase.auth.getUser(token);
          user = result.data.user;
          error = result.error;
        } catch (authError) {
          console.error('withApiAuth: Auth error with Bearer token:', authError);
          error = authError instanceof Error ? { message: authError.message } : { message: 'Auth failed' };
        }
      } else {
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

        try {
          const result = await supabase.auth.getUser();
          user = result.data.user;
          error = result.error;
        } catch (cookieError) {
          console.error('withApiAuth: Cookie validation threw error:', cookieError);
          error = cookieError instanceof Error
            ? { message: cookieError.message, code: 'cookie_error' }
            : { message: 'Unknown cookie error', code: 'cookie_error' };
        }
      }

      if (error || !user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            details: error?.message || 'Auth session missing!',
            code: error?.code,
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