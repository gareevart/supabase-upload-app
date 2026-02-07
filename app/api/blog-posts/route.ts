import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { redisDeleteByPrefix, redisGetJson, redisSetJson } from '@/lib/redis';
import {
  BLOG_POST_ID_PREFIX,
  BLOG_POST_SLUG_PREFIX,
  BLOG_POSTS_LIST_PREFIX,
  buildBlogPostsListKey
} from '@/shared/lib/blog/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const BLOG_POSTS_LIST_TTL_SECONDS = 120;

// Generate a slug from a title
const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

// Generate a unique slug for a blog post
const generateUniqueSlug = async (supabase: any, title: string) => {
  let slug = generateSlug(title || 'blog-post');
  let counter = 1;
  let originalSlug = slug;

  while (true) {
    const { data } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) {
      return slug;
    }

    slug = `${originalSlug}-${counter}`;
    counter++;
  }
};

// GET all blog posts (with filtering options)
export const GET = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const url = new URL(request.url);
    const onlyMine = url.searchParams.get('onlyMine') === 'true';
    const publishedOnly = url.searchParams.get('publishedOnly') === 'true';
    const draftsOnly = url.searchParams.get('draftsOnly') === 'true';
    const inspectSchema = url.searchParams.get('inspectSchema') === 'true';
    const listCacheKey = inspectSchema
      ? null
      : buildBlogPostsListKey({
          userId: user.id,
          onlyMine,
          publishedOnly,
          draftsOnly
        });

    // Use service role client to bypass RLS for authenticated API requests
    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    if (inspectSchema) {
      // Query the information_schema to get table structure
      // Query columns
      const { data: columns, error: columnsError } = await supabase
        .from('blog_posts')
        .select('*')
        .limit(0); // Returns only schema info

      if (columnsError) throw columnsError;

      // Query constraints (using raw SQL)
      const { data: constraints, error: constraintsError } = await supabase
        .rpc('query', {
          query: `
            SELECT
              tc.constraint_name,
              tc.constraint_type,
              kcu.column_name,
              ccu.table_name AS foreign_table,
              ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name = 'blog_posts'
            AND tc.table_schema = 'public'
          `
        });

      if (constraintsError) throw constraintsError;

      // Query triggers (using raw SQL)
      const { data: triggers, error: triggersError } = await supabase
        .rpc('query', {
          query: `
            SELECT
              trigger_name,
              action_timing,
              event_manipulation,
              action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'blog_posts'
            AND event_object_schema = 'public'
          `
        });

      if (triggersError) throw triggersError;

      if (triggersError) throw triggersError;

      return NextResponse.json({
        columns,
        constraints,
        triggers
      });
    }

    if (listCacheKey) {
      const cachedPosts = await redisGetJson<any[]>(listCacheKey);
      if (cachedPosts !== null) {
        return NextResponse.json(cachedPosts);
      }
    }

    let query = supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        excerpt,
        slug,
        featured_image,
        created_at,
        updated_at,
        published,
        author_id
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (onlyMine) {
      query = query.eq('author_id', user.id);
    }

    if (publishedOnly) {
      query = query.eq('published', true);
    } else if (draftsOnly) {
      query = query.eq('published', false);
      // Only allow viewing drafts if they belong to the current user
      query = query.eq('author_id', user.id);
    } else if (!onlyMine) {
      // If not explicitly requesting all posts (including drafts),
      // and not filtering to only the user's posts,
      // then only show published posts
      query = query.eq('published', true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get author information for each post
    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map(post => post.author_id))];

      const { data: authors, error: authorsError } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', authorIds);

      if (authorsError) {
        console.error('Error fetching authors:', authorsError);
        // Continue without author data rather than failing completely
      }

      // Map author data to posts
      const postsWithAuthors = data.map(post => ({
        ...post,
        author: authors?.find(author => author.id === post.author_id) || {
          name: null,
          username: null,
          avatar_url: null
        }
      }));

      if (listCacheKey) {
        await redisSetJson(listCacheKey, postsWithAuthors, BLOG_POSTS_LIST_TTL_SECONDS);
      }

      return NextResponse.json(postsWithAuthors);
    }

    if (listCacheKey) {
      await redisSetJson(listCacheKey, data, BLOG_POSTS_LIST_TTL_SECONDS);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
});

// POST (create) a new blog post
export const POST = withAuth(async (request: NextRequest, user: { id: string }) => {
  let body: any;
  try {
    // Try to parse JSON body first, fallback to URL parameters
    const contentType = request.headers.get('content-type');
    const url = new URL(request.url);

    if (contentType && contentType.includes('application/json')) {
      // Parse JSON body
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      } else {
        body = {};
      }
    } else {
      // Use URL parameters as fallback
      body = {};
    }

    // Get data from body or URL parameters
    const title = body.title || url.searchParams.get('title');
    const content = body.content || url.searchParams.get('content');
    const excerpt = body.excerpt || url.searchParams.get('excerpt');
    const slug = body.slug || url.searchParams.get('slug');
    const featured_image = body.featured_image || url.searchParams.get('featured_image');
    const published = body.published !== undefined ? body.published :
      (url.searchParams.get('published') === 'true');
    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.length > 100) {
      return NextResponse.json(
        { error: 'Title must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate content
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    // Check content size
    const contentSize = content.length;
    if (contentSize > 500000) { // 500KB limit for blog content
      return NextResponse.json(
        {
          error: 'Content is too large',
          details: `Max size is 500,000 characters (received ${contentSize})`
        },
        { status: 400 }
      );
    }

    // Create a service role client for creating posts (bypasses RLS)
    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate a slug if not provided
    let finalSlug = slug?.trim();
    if (!finalSlug) {
      finalSlug = await generateUniqueSlug(supabase, title);
    } else {
      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(finalSlug)) {
        return NextResponse.json(
          { error: 'Slug can only contain lowercase letters, numbers and hyphens' },
          { status: 400 }
        );
      }

      if (finalSlug.startsWith('-') || finalSlug.endsWith('-')) {
        return NextResponse.json(
          { error: 'Slug cannot start or end with a hyphen' },
          { status: 400 }
        );
      }

      // Check if slug is already in use
      const { data: slugCheck, error: slugError } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (slugError && slugError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw slugError;
      }

      if (slugCheck) {
        return NextResponse.json(
          { error: 'Slug is already in use by another blog post' },
          { status: 409 }
        );
      }
    }

    // Create the blog post
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        content,
        slug: finalSlug,
        excerpt,
        featured_image,
        published,
        author_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Trigger embedding sync if published
    if (data.published) {
      // We don't await this to keep the API responsive, 
      // it will run in the background (Edge Runtime/Next.js keeps it alive for a bit)
      // Or if we want to be sure, we can await or use a background job.
      // For now, let's just trigger it.
      import('@/lib/blog-sync').then(({ syncBlogPostEmbeddings }) => {
        syncBlogPostEmbeddings(data.id);
      }).catch(err => console.error('Failed to trigger sync:', err));
    }

    await redisDeleteByPrefix(BLOG_POSTS_LIST_PREFIX);
    await redisDeleteByPrefix(`${BLOG_POST_ID_PREFIX}${data.id}:`);
    await redisDeleteByPrefix(`${BLOG_POST_SLUG_PREFIX}${data.slug}`);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const error = err as { code?: string, message?: string };
    let errorMessage = 'Failed to create blog post';
    let statusCode = 500;

    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'A blog post with this slug already exists';
      statusCode = 409;
    }

    console.error('Error creating blog post:', {
      error,
      user: user?.id,
      timestamp: new Date().toISOString(),
      requestBody: body,
      supabaseError: error instanceof Error ? error.message : undefined,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
    });
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : undefined,
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
});