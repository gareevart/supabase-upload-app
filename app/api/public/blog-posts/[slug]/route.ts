import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(
	_request: Request,
	context: { params: Promise<{ slug: string }> }
) {
	try {
		const { slug } = await context.params;

		if (!slug) {
			return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
		}

		const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});

		const { data: post, error: postError } = await supabase
			.from('blog_posts')
			.select(
				`id, title, content, excerpt, slug, featured_image, show_featured_image, created_at, updated_at, published, author_id`
			)
			.eq('slug', slug)
			.eq('published', true)
			.single();

		if (postError || !post) {
			return NextResponse.json({ error: 'Post not found' }, { status: 404 });
		}

		const { data: author, error: authorError } = await supabase
			.from('profiles')
			.select('id, name, username, avatar_url')
			.eq('id', post.author_id)
			.single();

		if (authorError) {
			// Do not fail the whole request if author cannot be fetched
			// Likely RLS or missing profile
			// eslint-disable-next-line no-console
			console.warn('Author fetch error (public blog post):', authorError);
		}

		return NextResponse.json({
			...post,
			author: author || { name: null, username: null, avatar_url: null },
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error in public blog post GET:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


