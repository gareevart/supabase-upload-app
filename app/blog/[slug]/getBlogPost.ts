import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export interface BlogPostWithAuthor {
  id: string;
  title: string;
  content: string | { html?: string } | any;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  show_featured_image: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  published: boolean | null;
  author_id: string;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

function serviceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Fetch a single published post with its author, server-side.
 * Wrapped in React `cache()` so `generateMetadata` and the page component
 * share a single query within the same request/render pass.
 */
export const getPublishedPost = cache(async (slug: string): Promise<BlogPostWithAuthor | null> => {
  const supabase = serviceClient();

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(
      `id, title, content, excerpt, slug, featured_image, show_featured_image, created_at, updated_at, published, author_id`
    )
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !post) {
    return null;
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('id, name, username, avatar_url')
    .eq('id', post.author_id)
    .single();

  return {
    ...post,
    author: author || { name: null, username: null, avatar_url: null },
  } as BlogPostWithAuthor;
});

/** All published slugs — used by `generateStaticParams` to pre-render at build time. */
export async function getPublishedSlugs(): Promise<string[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('published', true);

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
}
