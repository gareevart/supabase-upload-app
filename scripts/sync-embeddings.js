const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // fallback to .env if present
const { createClient } = require('@supabase/supabase-js');

async function getEmbeddings(text, type = 'DOC') {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER || 'b1gb5lrqp1jr1tmamu2t';
  if (!apiKey) throw new Error('YANDEX_API_KEY is not defined');
  const model = type === 'QUERY' ? 'text-search-query' : 'text-search-doc';
  const modelUri = `emb://${folderId}/${model}/latest`;
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Api-Key ${apiKey}` },
    body: JSON.stringify({ modelUri, text })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Yandex API error: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.embedding;
}

function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    if (content.length > 200 && !content.includes(' ')) return '';
    try { return extractText(JSON.parse(content)); } catch { return content; }
  }
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (!b || typeof b !== 'object') return '';
        if (b.type === 'image') return (b.alt || '').trim();
        return (b.content || '').toString();
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // fallback for legacy tiptap
  let text = '';
  if (content.type === 'text') {
    const val = content.text || '';
    if (val.length < 500 || val.includes(' ')) text += val;
  }
  if (Array.isArray(content.content)) {
    content.content.forEach((c) => (text += extractText(c) + ' '));
  }
  return text.trim();
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id,title,content,published')
    .eq('published', true);
  if (error) throw error;
  if (!posts || posts.length === 0) {
    console.log('No published posts to sync.');
    return;
  }

  console.log(`Reindexing ${posts.length} published posts...`);
  for (const post of posts) {
    console.log(`\n— ${post.id} :: ${post.title}`);
    await supabase.from('blog_post_embeddings').delete().eq('post_id', post.id);
    const textContent = extractText(post.content);
    const fullText = `${post.title}. ${textContent}`.trim();
    if (!fullText) { console.log('  skip: empty text'); continue; }
    const chunks = fullText.match(/.{1,2000}/g) || [];
    console.log(`  chunks: ${chunks.length}`);
    for (const [i, chunk] of chunks.entries()) {
      try {
        const embedding = await getEmbeddings(chunk, 'DOC');
        const { error: insErr } = await supabase
          .from('blog_post_embeddings')
          .insert({ post_id: post.id, content: chunk, embedding });
        if (insErr) throw insErr;
        console.log(`    ✓ chunk ${i + 1}/${chunks.length}`);
      } catch (e) {
        console.error(`    ✗ chunk ${i + 1}:`, e.message || e);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
