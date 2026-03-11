import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { withAuth } from '@/app/auth/withApiKeyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const isAdminOrEditor = async (userId: string) => {
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin' || profile?.role === 'editor';
};

export const PUT = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const allowed = await isAdminOrEditor(user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = new URL(request.url).pathname.split('/').pop();
    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    const { title, content, excerpt, slug, featured_image, published, is_homepage } = await request.json();

    if (!title?.trim() || !content?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Title, content and slug are required' }, { status: 400 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (is_homepage) {
      await (supabase as any)
        .from('static_pages')
        .update({ is_homepage: false, updated_at: new Date().toISOString() })
        .eq('is_homepage', true)
        .neq('id', id);
    }

    const { data, error } = await (supabase as any)
      .from('static_pages')
      .update({
        title,
        content,
        excerpt,
        slug,
        featured_image,
        published: !!published,
        is_homepage: !!is_homepage,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating static page:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update static page' }, { status: 500 });
  }
});
