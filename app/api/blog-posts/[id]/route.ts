import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { put } from '@vercel/blob';
import { isBlogAdmin } from '@/shared/lib/blog/elevatedBlogAccess';

// ---------- Featured image data-URL normalization helpers ----------
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

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

/** Stores a featured image in Vercel Blob. Blog covers are public via the `/api/storage/file` route. */
async function uploadFeaturedImage(params: { buffer: Buffer; mime: string; userId: string; ext: string }) {
  const { buffer, mime, userId, ext } = params;
  const key = `featured/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await put(key, buffer, {
    access: 'private',
    addRandomSuffix: false,
    contentType: mime,
    cacheControlMaxAge: 3600,
  });

  return { url: `/api/storage/file?path=${encodeURIComponent(key)}`, path: key };
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

  const { url } = await uploadFeaturedImage({
    buffer: parsed.buffer,
    mime: parsed.mime,
    ext: parsed.ext,
    userId,
  });
  console.log('[blog-posts:id] Uploaded featured_image to Vercel Blob', {
    userId,
    size: parsed.buffer.length,
  });
  return url;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

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

    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient
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

    const isAuthor = data.author_id === user.id;
    if (!data.published && !isAuthor) {
      const allowed = await isBlogAdmin(adminClient, user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Unauthorized to view this unpublished blog post' },
          { status: 403 }
        );
      }
    }

    // Get author information
    const { data: author, error: authorError } = await adminClient
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

    // withAuth has already authenticated either the session or the API key.
    // API keys do not establish a Supabase cookie session. Use the server client
    // here and enforce author/admin/editor authorization below before any write.
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if the post exists and if the user is the author
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('author_id, slug, published, title, excerpt')
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
      const canManage = await isBlogAdmin(supabase, user.id);
      if (!canManage) {
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
    const { title, content, excerpt, slug, featured_image, published, show_featured_image } = await request.json();

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
    if (show_featured_image !== undefined) updateData.show_featured_image = show_featured_image;
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

    // Refresh the statically cached blog list and post pages. Revalidate both
    // the new slug and the previous one in case the slug changed.
    revalidatePath('/blog');
    if (data.slug) {
      revalidatePath(`/blog/${data.slug}`);
    }
    if (previousSlug && previousSlug !== data.slug) {
      revalidatePath(`/blog/${previousSlug}`);
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
      const deleteAdminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const canManage = await isBlogAdmin(deleteAdminClient, user.id);
      if (!canManage) {
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

    // Refresh the statically cached blog list and the removed post page.
    revalidatePath('/blog');
    if (existingPost.slug) {
      revalidatePath(`/blog/${existingPost.slug}`);
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
