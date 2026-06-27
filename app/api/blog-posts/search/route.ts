import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import {
  extractPlainText,
  extractSearchContext,
  type BlogSearchResult,
} from '@/shared/lib/blog-search';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const MAX_RESULTS = 20;

/**
 * Public blog search. Title/excerpt matching runs in Postgres (ilike); content
 * matching runs here on the server (the `content` column is jsonb, so it can't
 * be filtered with ilike directly). Only the matched, limited results are sent
 * to the browser — previously the client downloaded every published post.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Title / excerpt match — fast, indexable.
    const { data: titleExcerpt, error: teErr } = await supabase
      .from('blog_posts')
      .select('id, title, excerpt, slug, featured_image, created_at, author_id')
      .eq('published', true)
      .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
      .order('created_at', { ascending: false });

    if (teErr) throw teErr;

    const titleExcerptIds = new Set((titleExcerpt || []).map((p) => p.id));

    // 2) Content match — scan server-side. Heavy work stays off the client.
    const { data: allPosts, error: contentErr } = await supabase
      .from('blog_posts')
      .select('id, title, excerpt, content, slug, featured_image, created_at, author_id')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (contentErr) throw contentErr;

    const lowerQ = q.toLowerCase();
    const contentMatches: BlogSearchResult[] = [];
    for (const post of allPosts || []) {
      if (titleExcerptIds.has(post.id)) continue;
      const plain = extractPlainText(post.content);
      if (plain.toLowerCase().includes(lowerQ)) {
        contentMatches.push({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          slug: post.slug,
          featured_image: post.featured_image,
          created_at: post.created_at,
          author_id: post.author_id,
          author: { name: null, username: null, avatar_url: null },
          searchContext: extractSearchContext(plain, q, 3, 5),
        });
      }
    }

    const combined: BlogSearchResult[] = [
      ...(titleExcerpt || []).map((p) => ({
        ...p,
        author: { name: null, username: null, avatar_url: null },
        searchContext: null,
      })),
      ...contentMatches,
    ].slice(0, MAX_RESULTS);

    if (combined.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 3) Attach authors (no FK relationship exists for an embedded join).
    const authorIds = [...new Set(combined.map((p) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', authorIds);

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    const results = combined.map((p) => {
      const author = profilesMap.get(p.author_id);
      return {
        ...p,
        author: author
          ? { name: author.name, username: author.username, avatar_url: author.avatar_url }
          : { name: null, username: null, avatar_url: null },
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in blog search:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
