import { createClient } from '@supabase/supabase-js';
import { getEmbeddings } from './yandex';


export function extractTextFromContent(content: any): string {
    if (!content) return '';

    if (typeof content === 'string') {
        if (content.length > 200 && !content.includes(' ')) return '';
        return content
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[(.+?)\]\(.*?\)/g, '$1')
            .replace(/[*_`~>]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    return '';
}

/**
 * Synchronizes embeddings for a single blog post.
 * If the post is not published, it will remove existing embeddings.
 */
export async function syncBlogPostEmbeddings(postId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables, cannot sync embeddings');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the post details
    const { data: post, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title, content, published')
        .eq('id', postId)
        .single();

    if (fetchError || !post) {
        console.error(`Error fetching post ${postId} for sync:`, fetchError);
        return;
    }

    // Always clear existing embeddings first
    await supabase
        .from('blog_post_embeddings')
        .delete()
        .eq('post_id', postId);

    // If not published, we just stop here (effectively removing it from search)
    if (!post.published) {
        console.log(`Post ${postId} is not published, embeddings cleared.`);
        return;
    }

    // Extract text
    const textContent = extractTextFromContent(post.content);
    const fullText = `${post.title}. ${textContent}`;

    if (!fullText.trim()) {
        console.log(`Post ${postId} has no meaningful text, skipping embeddings.`);
        return;
    }

    // Chunking
    const chunks = fullText.match(/.{1,2000}/g) || [];

    console.log(`Syncing ${chunks.length} chunks for post ${postId}...`);

    for (const chunk of chunks) {
        try {
            const embedding = await getEmbeddings(chunk, 'DOC');

            await supabase.from('blog_post_embeddings').insert({
                post_id: post.id,
                content: chunk,
                embedding
            });

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            console.error(`Failed to embed chunk for post ${postId}:`, e);
        }
    }

    console.log(`Successfully synced post ${postId}`);
}
