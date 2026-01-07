import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBlogPostEmbeddings } from '@/lib/blog-sync';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: 'SUPABASE_SERVICE_ROLE_KEY is not defined' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get all published blog posts
        const { data: posts, error: fetchError } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('published', true);

        if (fetchError) {
            throw fetchError;
        }

        if (!posts || posts.length === 0) {
            return NextResponse.json({ message: 'No posts to sync' });
        }

        console.log(`Starting bulk sync for ${posts.length} posts...`);

        // Process sequentially to avoid heavy rate limits across many posts
        for (const post of posts) {
            await syncBlogPostEmbeddings(post.id);
        }

        return NextResponse.json({
            success: true,
            processed: posts.length
        });

    } catch (error) {
        console.error('Bulk sync error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
