import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { redisDeleteByPrefix, redisGetJson, redisSetJson } from '@/lib/redis';
import {
  BLOG_POST_ID_PREFIX,
  BLOG_POST_SLUG_PREFIX,
  BLOG_POSTS_LIST_PREFIX,
  buildBlogPostIdKey
} from '@/shared/lib/blog/cache';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ---------- Featured image data-URL normalization helpers ----------
const BUCKET_NAME = 'public-gareevde';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://storage.yandexcloud.net';
const BUCKET_KEY_ID = process.env.BUCKET_KEY_ID || '';
const BUCKET_SECRET_KEY = process.env.BUCKET_SECRET_KEY || '';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: ENDPOINT_URL,
  credentials: {
    accessKeyId: BUCKET_KEY_ID,
    secretAccessKey: BUCKET_SECRET_KEY,
  },
});

function detectDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function extFromMime(mime: string): string | null {
  const type = mime.replace(/^image\//, '').toLowerCase();
  if (type === 'jpeg') return 'jpg';
  if (['jpg', 'png', 'webp', 'gif'].includes(type)) return type;
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; ext: string; buffer: Buffer } | null {
  try {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    const ext = extFromMime(mime);
    if (!ext) return null;
    const buffer = Buffer.from(base64, 'base64');
    return { mime, ext, buffer };
  } catch {
    return null;
  }
}

async function uploadToYandex(params: { buffer: Buffer; mime: string; userId: string; ext: string; folder?: string }) {
  if (!BUCKET_KEY_ID || !BUCKET_SECRET_KEY) {
    throw new Error('Storage credentials are not configured');
  }
  const { buffer, mime, userId, ext, folder = 'featured' } = params;
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `${folder}/${userId}/${ts}-${rand}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: '3600',
    ACL: 'public-read',
  });

  await s3Client.send(command);

  const url = `https://${BUCKET_NAME}.storage.yandexcloud.net/${key}?${ts}`;
  return { url, path: key };
}

async function normalizeFeaturedImage(featuredImage: any, userId: string): Promise<string | null | undefined> {
  if (!featuredImage) return featuredImage; // null/undefined passthrough
  if (typeof featuredImage !== 'string') return featuredImage;
  if (/^https?:\/\//i.test(featuredImage)) return featuredImage; // already a URL
  if (!detectDataUrl(featuredImage)) return featuredImage; // unknown format -> leave as-is

  const parsed = parseDataUrl(featuredImage);
  if (!parsed) {
    throw Object.assign(new Error('Invalid featured_image data URL'), { status: 400 });
  }
  if (parsed.buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('featured_image exceeds 10MB limit'), { status: 413 });
  }

  const { url } = await uploadToYandex({
    buffer: parsed.buffer,
    mime: parsed.mime,
    ext: parsed.ext,
    userId,
  });
  console.log('[blog-posts:id] Uploaded featured_image to Yandex', {
    userId,
    size: parsed.buffer.length,
  });
  return url;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const BLOG_POST_TTL_SECONDS = 300;

const canManagePost = async (userId: string) => {
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return false;
  }

  return profile?.role === 'admin' || profile?.role === 'editor';
};

// GET a single blog post by ID
export const GET = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }

    const cacheKey = buildBlogPostIdKey({ id, userId: user.id });
    const cachedPost = await redisGetJson<any>(cacheKey);
    if (cachedPost !== null) {
      return NextResponse.json(cachedPost);
    }

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

    // First check if the post exists
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if the post is published or if the user is the author
    if (!data.published && data.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this unpublished blog post' },
        { status: 403 }
      );
    }

    // Get author information
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('name, username, avatar_url')
      .eq('id', data.author_id)
      .single();

    if (authorError) {
      console.error('Error fetching author:', authorError);
      // Continue without author data rather than failing completely
    }

    const postWithAuthor = {
      ...data,
      author: author || {
        name: null,
        username: null,
        avatar_url: null
      }
    };

    await redisSetJson(cacheKey, postWithAuthor, BLOG_POST_TTL_SECONDS);

    return NextResponse.json(postWithAuthor);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
});

// PUT (update) a blog post
export const PUT = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }

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

    // Check if the post exists and if the user is the author
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('author_id, slug')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const previousSlug = existingPost.slug;

    // Check if the user is the author or has elevated role
    const isAuthor = existingPost.author_id === user.id;
    if (!isAuthor) {
      const isAdminOrEditor = await canManagePost(user.id);
      if (!isAdminOrEditor) {
        return NextResponse.json(
          { error: 'Unauthorized to update this blog post' },
          { status: 403 }
        );
      }
    }

    const updateClient = isAuthor
      ? supabase
      : createClient<Database>(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

    // Parse the request body
    const { title, content, excerpt, slug, featured_image, published } = await request.json();

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

    if (!slug?.trim()) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain lowercase letters, numbers and hyphens' },
        { status: 400 }
      );
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      return NextResponse.json(
        { error: 'Slug cannot start or end with a hyphen' },
        { status: 400 }
      );
    }

    // Check if the slug is already in use by another post
    const { data: slugCheck, error: slugError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
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

    // Normalize featured_image if provided and it is a data URL
    let normalizedFeatured: string | null | undefined = featured_image;
    if (featured_image !== undefined) {
      try {
        normalizedFeatured = await normalizeFeaturedImage(featured_image, user.id);
      } catch (e: any) {
        const status = typeof e?.status === 'number' ? e.status : 500;
        const message = e instanceof Error ? e.message : 'Failed to normalize featured_image';
        console.error('[blog-posts:id] Featured image normalization failed', { userId: user.id, message });
        return NextResponse.json({ error: message }, { status });
      }
    }

    // Update the blog post
    const updateData: any = {
      title,
      content,
      slug,
      updated_at: new Date().toISOString()
    };

    // Only include optional fields if they are provided
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featured_image !== undefined) updateData.featured_image = normalizedFeatured ?? null;
    if (published !== undefined) updateData.published = published;

    const { data, error } = await updateClient
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .eq('author_id', existingPost.author_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Trigger embedding sync (handles both publishing and unpublishing)
    import('@/lib/blog-sync').then(({ syncBlogPostEmbeddings }) => {
      syncBlogPostEmbeddings(data.id);
    }).catch(err => console.error('Failed to trigger sync:', err));

    await redisDeleteByPrefix(BLOG_POSTS_LIST_PREFIX);
    await redisDeleteByPrefix(`${BLOG_POST_ID_PREFIX}${id}:`);
    if (previousSlug) {
      await redisDeleteByPrefix(`${BLOG_POST_SLUG_PREFIX}${previousSlug}`);
    }
    if (data.slug && data.slug !== previousSlug) {
      await redisDeleteByPrefix(`${BLOG_POST_SLUG_PREFIX}${data.slug}`);
    }

    return NextResponse.json(data);
  } catch (err) {
    const error = err as { code?: string, message?: string };
    const errorMessage = error.code === '23505'
      ? 'A blog post with this slug already exists'
      : error.message || 'Failed to update blog post';

    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: error.code === '23505' ? 409 : 500 }
    );
  }
});

// DELETE a blog post
export const DELETE = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }

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

    // Check if the post exists and if the user is the author
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('author_id, slug')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author or has elevated role
    const isAuthor = existingPost.author_id === user.id;
    if (!isAuthor) {
      const isAdminOrEditor = await canManagePost(user.id);
      if (!isAdminOrEditor) {
        return NextResponse.json(
          { error: 'Unauthorized to delete this blog post' },
          { status: 403 }
        );
      }
    }

    const deleteClient = isAuthor
      ? supabase
      : createClient<Database>(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

    // Delete the blog post
    const { error } = await deleteClient
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .eq('author_id', existingPost.author_id);

    if (error) {
      throw error;
    }

    await redisDeleteByPrefix(BLOG_POSTS_LIST_PREFIX);
    await redisDeleteByPrefix(`${BLOG_POST_ID_PREFIX}${id}:`);
    if (existingPost.slug) {
      await redisDeleteByPrefix(`${BLOG_POST_SLUG_PREFIX}${existingPost.slug}`);
    }

    return NextResponse.json(
      { message: 'Blog post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
});
