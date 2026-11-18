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

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
};

export const withApiAuth = (handler: (req: NextRequest, user: { id: string }) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const client = createRequestSupabaseClient(req);
    let userId: string;
    try {
      // Preserve cookie precedence for callers that send both credentials.
      let result = await client.auth.getUser();
      const authorization = req.headers.get('authorization');
      if (!result.data.user && authorization?.startsWith('Bearer ') && !authorization.startsWith('Bearer sk_')) {
        result = await client.auth.getUser(authorization.slice(7));
      }
      if (result.error || !result.data.user) {
        const unavailable = result.error && (result.error.status === 0 || (result.error.status ?? 0) >= 500);
        return NextResponse.json(
          { error: unavailable ? 'Authentication service unavailable' : 'Unauthorized' },
          { status: unavailable ? 503 : 401, headers: corsHeaders },
        );
      }
      userId = result.data.user.id;
    } catch {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503, headers: corsHeaders });
    }

    try {
      const response = await handler(req, { id: userId });
      for (const [name, value] of Object.entries(corsHeaders)) response.headers.set(name, value);
      return response;
    } catch (error) {
      console.error('API handler failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
  };
};
