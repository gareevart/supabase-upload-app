/**
 * Migrates blog_posts.content from TipTap JSON to Markdown.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-markdown.ts [--dry-run] [--limit N]
 *
 * Safe to run multiple times — skips posts that are already Markdown
 * (content that does not parse as a TipTap { type: "doc" } object).
 *
 * IMPORTANT: Take a database backup before running in production.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeTipTapContent } from '../lib/tiptapConverter';
import { convertTipTapToMarkdown } from '../lib/tiptapToMarkdown';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const LIMIT = Number(process.env.LIMIT || process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '1000');
const PAGE_SIZE = 50;

const supabase = createClient(supabaseUrl, serviceKey);

function isTipTapJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed.type === 'doc' && Array.isArray(parsed.content);
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Limit: ${LIMIT} posts\n`);

  let offset = 0;
  let totalProcessed = 0;
  let totalConverted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  while (totalProcessed < LIMIT) {
    const batchSize = Math.min(PAGE_SIZE, LIMIT - totalProcessed);
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, content')
      .not('content', 'is', null)
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch posts:', error.message);
      process.exit(1);
    }

    if (!posts || posts.length === 0) {
      console.log('No more posts to process.');
      break;
    }

    for (const post of posts) {
      totalProcessed++;
      const { id, title, content } = post;

      if (!content || !isTipTapJson(content)) {
        console.log(`  SKIP  [${id}] "${title}" — already Markdown or empty`);
        totalSkipped++;
        continue;
      }

      try {
        const normalized = normalizeTipTapContent(content);
        const markdown = convertTipTapToMarkdown(normalized);

        if (DRY_RUN) {
          console.log(`  DRY   [${id}] "${title}"`);
          console.log(`        → ${markdown.slice(0, 120).replace(/\n/g, '↵')}…`);
        } else {
          const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ content: markdown })
            .eq('id', id);

          if (updateError) {
            console.error(`  ERROR [${id}] "${title}": ${updateError.message}`);
            totalErrors++;
            continue;
          }

          console.log(`  OK    [${id}] "${title}"`);
        }
        totalConverted++;
      } catch (err) {
        console.error(`  ERROR [${id}] "${title}":`, err);
        totalErrors++;
      }
    }

    offset += posts.length;
    if (posts.length < batchSize) break;
  }

  console.log(`\n--- Done ---`);
  console.log(`Processed : ${totalProcessed}`);
  console.log(`Converted : ${totalConverted}`);
  console.log(`Skipped   : ${totalSkipped}`);
  console.log(`Errors    : ${totalErrors}`);
  if (DRY_RUN) console.log('\n(Dry run — no changes were written to the database)');
}

main();
