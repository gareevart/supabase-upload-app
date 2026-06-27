import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';
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
  console.log('[blog-posts] Uploaded featured_image to Yandex', {
    userId,
    size: parsed.buffer.length,
  });
  return url;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

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

      return NextResponse.json(postsWithAuthors);
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
    const show_featured_image = body.show_featured_image !== undefined
      ? body.show_featured_image
      : (url.searchParams.get('show_featured_image') !== 'false');
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

    // Normalize featured_image if it's a data URL
    let normalizedFeaturedImage: string | null | undefined = featured_image;
    try {
      normalizedFeaturedImage = await normalizeFeaturedImage(featured_image, user.id);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 500;
      const message = e instanceof Error ? e.message : 'Failed to normalize featured_image';
      console.error('[blog-posts] Featured image normalization failed', { userId: user.id, message });
      return NextResponse.json({ error: message }, { status });
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
        featured_image: normalizedFeaturedImage ?? null,
        show_featured_image,
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

    // Refresh the statically cached blog list and the new post page.
    revalidatePath('/blog');
    if (data.slug) {
      revalidatePath(`/blog/${data.slug}`);
    }

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
