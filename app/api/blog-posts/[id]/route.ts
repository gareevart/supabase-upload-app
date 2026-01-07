import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

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
      .select('author_id')
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

    // Check if the user is the author
    if (existingPost.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this blog post' },
        { status: 403 }
      );
    }

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

    // Update the blog post
    const updateData: any = {
      title,
      content,
      slug,
      updated_at: new Date().toISOString()
    };

    // Only include optional fields if they are provided
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featured_image !== undefined) updateData.featured_image = featured_image;
    if (published !== undefined) updateData.published = published;

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Trigger embedding sync (handles both publishing and unpublishing)
    import('@/lib/blog-sync').then(({ syncBlogPostEmbeddings }) => {
      syncBlogPostEmbeddings(data.id);
    }).catch(err => console.error('Failed to trigger sync:', err));

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
      .select('author_id')
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

    // Check if the user is the author
    if (existingPost.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this blog post' },
        { status: 403 }
      );
    }

    // Delete the blog post
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (error) {
      throw error;
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