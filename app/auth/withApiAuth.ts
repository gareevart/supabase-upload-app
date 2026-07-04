import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

function createRequestSupabaseClient(req: NextRequest) {
  return createServerClient<Database>(
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
}

function getUserIdFromAccessToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    ) as { sub?: string; exp?: number };

    if (typeof payload.sub !== 'string') {
      return null;
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}

export const withApiAuth = (handler: (req: NextRequest, user: { id: string }) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    try {
      const authHeader = req.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      let user: { id: string } | null = null;
      let error: { message?: string; code?: string; status?: number } | null = null;

      const supabase = createRequestSupabaseClient(req);

      // Сначала читаем сессию из cookies — без сетевого запроса к Supabase Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user?.id) {
        user = { id: session.user.id };
      }

      // Bearer JWT (редактор, authFetch) — только если cookies-сессии нет
      if (!user && bearerToken && !bearerToken.startsWith('sk_')) {
        const { createClient } = await import('@supabase/supabase-js');
        const remoteClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        try {
          const result = await remoteClient.auth.getUser(bearerToken);
          if (result.data.user?.id) {
            user = { id: result.data.user.id };
          } else {
            error = result.error
              ? { message: result.error.message, code: result.error.code }
              : { message: 'Invalid access token' };
          }
        } catch (authError) {
          console.error('withApiAuth: Auth error with Bearer token:', authError);
          const userId = getUserIdFromAccessToken(bearerToken);
          if (userId) {
            user = { id: userId };
          } else {
            error = authError instanceof Error
              ? { message: authError.message }
              : { message: 'Auth failed' };
          }
        }
      }

      if (!user) {
        error = error || (sessionError
          ? { message: sessionError.message, code: sessionError.code }
          : { message: 'Auth session missing!' });
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
              'Access-Control-Allow-Credentials': 'true',
            },
          }
        );
      }

      const response = await handler(req, { id: user.id });

      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    } catch (err) {
      console.error('Auth middleware error:', {
        error: err,
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined,
      });
      return NextResponse.json(
        { error: 'Authentication failed', details: err instanceof Error ? err.message : undefined },
        { status: 500 }
      );
    }
  };
};
