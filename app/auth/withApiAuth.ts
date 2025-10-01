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
      // Enhanced debug logging
      console.log('Auth middleware request details:', {
        url: req.url,
        method: req.method,
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(req.headers.entries()),
        cookies: req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        }
      });

      // Проверяем Authorization header (приоритет над cookies)
      const authHeader = req.headers.get('authorization');
      let user = null;
      let error = null;

      console.log('withApiAuth: Authorization header:', authHeader ? 'Present' : 'Missing');

      if (authHeader?.startsWith('Bearer ')) {
        // Используем токен из Authorization header
        const token = authHeader.substring(7);
        console.log('withApiAuth: Using Bearer token, length:', token.length);
        console.log('withApiAuth: Token prefix:', token.substring(0, 50) + '...');
        console.log('withApiAuth: Supabase URL:', supabaseUrl);
        console.log('withApiAuth: Supabase Anon Key prefix:', supabaseAnonKey.substring(0, 20) + '...');
        
        // Используем обычный createClient и передаем токен напрямую в getUser()
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
        
        console.log('withApiAuth: About to call supabase.auth.getUser(token)');
        try {
          // Передаем токен напрямую в getUser() - это правильный способ
          const result = await supabase.auth.getUser(token);
          user = result.data.user;
          error = result.error;
          console.log('withApiAuth: getUser(token) completed successfully');
        } catch (getUserError) {
          console.error('withApiAuth: getUser(token) threw an error:', getUserError);
          error = getUserError;
        }
        
        console.log('withApiAuth: Token validation result:', {
          hasUser: !!user,
          userId: user?.id,
          error: error?.message,
          errorCode: error?.code,
          errorStatus: error?.status,
          fullError: error,
        });
      } else {
        console.log('withApiAuth: No Bearer token, trying cookies');
        // Fallback к cookies
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
        const result = await supabase.auth.getUser();
        user = result.data.user;
        error = result.error;
        
        console.log('withApiAuth: Cookie validation result:', {
          hasUser: !!user,
          userId: user?.id,
          error: error?.message,
        });
      }
      
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