import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';
import type { Database } from '@/lib/types';

const responseHeaders = { 'Cache-Control': 'private, no-store' };

export const GET = withApiAuth(async (request, user) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Blog drafts are unavailable' }, { status: 503 });
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const params = request.nextUrl.searchParams;
  const existsOnly = params.get('exists') === 'true';
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });
  }

  let query = supabase
    .from('blog_posts')
    .select('id, title, excerpt, slug, featured_image, created_at, author_id, published', existsOnly ? {} : { count: 'exact' })
    .eq('published', false);
  if (profile?.role !== 'admin') {
    query = query.eq('author_id', user.id);
  }

  const offset = (page - 1) * pageSize;
  const { data, count, error } = existsOnly
    ? await query.limit(1)
    : await query.order('created_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1);
  if (error) throw error;

  if (existsOnly) {
    return NextResponse.json({ hasDrafts: data.length > 0 }, { headers: responseHeaders });
  }

  const posts = data.map((post) => ({
    ...post,
    author: { name: null, username: null, avatar_url: null },
  }));
  return NextResponse.json(
    { posts, totalCount: count ?? 0, page, pageSize },
    { headers: responseHeaders },
  );
});
