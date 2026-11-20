#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';

const endpoint = 'https://gareev.de/api/blog-posts';
const key = process.env.GAREEV_BLOG_API_KEY;
const before = process.env.BEFORE_SHA;
const after = process.env.AFTER_SHA;

if (!/^sk_[a-f0-9]{64}$/.test(key || '')) {
  throw new Error('GAREEV_BLOG_API_KEY is missing or has an invalid format.');
}
if (![before, after].every((sha) => /^[a-f0-9]{40}$/.test(sha || ''))) {
  throw new Error('Valid before and after commit SHAs are required.');
}

// Include cover-only additions so an interrupted run can be retried safely.
const changed = execFileSync('git', [
  'diff', '--name-only', '--diff-filter=ACM', before, after, '--', 'content/briefs',
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const dates = [...new Set(changed.flatMap((file) => {
  const match = file.match(/^content\/briefs\/(\d{4}-\d{2}-\d{2})-infrastructure-design-brief(?:\.md|\.cover\.json|\.cover\.(?:png|jpg|webp))$/);
  return match ? [match[1]] : [];
}))];

if (dates.length === 0) {
  console.log('No infrastructure design briefs changed in this push.');
  process.exit(0);
}

const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const existingResponse = await fetch(`${endpoint}?onlyMine=true`, { headers });
if (!existingResponse.ok) {
  throw new Error(`Could not check existing posts (HTTP ${existingResponse.status}).`);
}
const existing = await existingResponse.json();
if (!Array.isArray(existing)) throw new Error('The blog API did not return a post list.');

for (const date of dates) {
  const file = `content/briefs/${date}-infrastructure-design-brief.md`;
  const slug = `infrastructure-design-brief-${date}`;
  const post = existing.find((post) => post.slug === slug);
  if (post?.published && post.featured_image) {
    console.log(`Already published with cover: ${slug}`);
    continue;
  }

  const markdown = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').trim();
  const match = markdown.match(/^# (Infrastructure Design Brief — [^\n]+)\n+([\s\S]+)$/);
  if (!match) throw new Error(`${file} must start with an Infrastructure Design Brief H1 title.`);
  const [, title, content] = match;
  if (title.length > 100 || content.length > 500_000 || content.includes('genui')) {
    throw new Error(`${file} has an invalid title, size, or chat-only citations.`);
  }
  const metadata = JSON.parse(await readFile(file.replace(/\.md$/, '.cover.json'), 'utf8'));
  const { excerpt, image, prompt } = metadata;
  if (typeof excerpt !== 'string' || !excerpt.trim() || excerpt.length > 500 ||
      typeof prompt !== 'string' || !prompt.includes(excerpt) ||
      typeof image !== 'string' || image !== basename(image) ||
      !image.startsWith(`${date}-infrastructure-design-brief.cover.`)) {
    throw new Error(`${file} needs valid cover metadata with an excerpt, generation prompt containing that excerpt, and a local image filename.`);
  }
  const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[image.split('.').pop()];
  if (!mime) throw new Error('Unsupported cover image format.');
  const bytes = await readFile(join(dirname(file), image));
  const valid = mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length > 2 * 1024 * 1024) {
    throw new Error('Cover must be a valid image no larger than 2 MiB (to fit the API request limit).');
  }
  if (!content.includes('](https://')) throw new Error(`${file} needs direct source links.`);

  // The site's API uploads this data URL to Vercel Blob, then stores its serving URL.
  const payload = {
    title, content: content.trim(), excerpt: excerpt.trim(), slug, published: true,
    featured_image: `data:${mime};base64,${bytes.toString('base64')}`,
    show_featured_image: true,
  };
  const response = await fetch(post ? `${endpoint}/${post.id}` : endpoint, {
    method: post ? 'PUT' : 'POST', headers, body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.published !== true || result.slug !== slug ||
      !result.featured_image || result.featured_image.startsWith('data:')) {
    throw new Error(`Publishing ${file} with cover failed (HTTP ${response.status}): ${result.error || 'unexpected response'}`);
  }
  const coverUrl = new URL(result.featured_image, endpoint).href;
  if (new URL(coverUrl).origin !== new URL(endpoint).origin) {
    throw new Error('The cover was not returned as a site-hosted asset.');
  }
  const check = await fetch(coverUrl);
  const type = check.headers.get('content-type') || '';
  await check.body?.cancel();
  if (!check.ok || !type.startsWith('image/')) {
    throw new Error(`Post saved, but cover verification failed (HTTP ${check.status}).`);
  }
  console.log(`Published with cover: https://gareev.de/blog/${slug} (id ${result.id})`);
  console.log(`Cover: ${coverUrl}`);
}
