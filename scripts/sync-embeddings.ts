import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { syncBlogPostEmbeddings } from '../lib/blog-sync';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, published')
    .eq('published', true);

  if (error) {
    console.error('Failed to fetch posts:', error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('No published posts to sync.');
    return;
  }

  console.log(`Reindexing ${posts.length} published posts...`);
  for (const post of posts) {
    console.log(`\n— Sync: ${post.id} :: ${post.title}`);
    await syncBlogPostEmbeddings(post.id);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

