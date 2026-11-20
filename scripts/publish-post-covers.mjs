#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

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

const changed = execFileSync('git', [
  'diff', '--name-only', '--diff-filter=ACM', before, after, '--', 'content/post-covers',
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const slugs = [...new Set(changed.flatMap((file) => {
  const match = file.match(/^content\/post-covers\/([a-z0-9-]+)\.cover\.(?:json|png|jpg|webp)$/);
  return match ? [match[1]] : [];
}))];

if (slugs.length === 0) {
  console.log('No post covers changed in this push.');
  process.exit(0);
}

const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const listResponse = await fetch(`${endpoint}?onlyMine=true`, { headers });
if (!listResponse.ok) throw new Error(`Could not check existing posts (HTTP ${listResponse.status}).`);
const posts = await listResponse.json();
if (!Array.isArray(posts)) throw new Error('The blog API did not return a post list.');

for (const slug of slugs) {
  const stem = `content/post-covers/${slug}.cover`;
  const jsonPath = `${stem}.json`;
  const metadata = JSON.parse(await readFile(jsonPath, 'utf8'));
  const { image, excerpt, prompt } = metadata;

  if (metadata.slug !== slug || typeof excerpt !== 'string' || !excerpt.trim() ||
      excerpt.length > 500 || typeof prompt !== 'string' || !prompt.includes(excerpt) ||
      typeof image !== 'string' || image !== basename(image) ||
      !image.startsWith(`${slug}.cover.`)) {
    throw new Error(`${jsonPath} needs a matching slug, excerpt, image filename, and prompt containing the excerpt.`);
  }

  const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[image.split('.').pop()];
  if (!mime) throw new Error('Unsupported cover image format.');

  const imagePath = join(dirname(jsonPath), image);
  if (!changed.includes(imagePath)) {
    throw new Error(`The cover image ${imagePath} must be included in the same push as its metadata.`);
  }

  const bytes = await readFile(imagePath);
  const valid = mime === 'image/png'
    ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mime === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';

  if (!valid || bytes.length > 2 * 1024 * 1024) {
    throw new Error('Cover must be a valid image no larger than 2 MiB.');
  }

  const post = posts.find((item) => item.slug === slug);
  if (!post?.published) throw new Error(`Published post not found for slug: ${slug}`);

  const detailResponse = await fetch(`${endpoint}/${post.id}`, { headers });
  if (!detailResponse.ok) {
    throw new Error(`Could not read post ${slug} (HTTP ${detailResponse.status}).`);
  }
  const existing = await detailResponse.json();
  if (existing.slug !== slug || !existing.title || typeof existing.content !== 'string') {
    throw new Error(`Post ${slug} is missing fields required for a safe update.`);
  }

  const payload = {
    title: existing.title,
    content: existing.content,
    slug: existing.slug,
    published: true,
    show_featured_image: true,
    featured_image: `data:${mime};base64,${bytes.toString('base64')}`,
    ...(existing.excerpt !== null && existing.excerpt !== undefined ? { excerpt: existing.excerpt } : {}),
  };

  const response = await fetch(`${endpoint}/${post.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.published !== true || result.slug !== slug ||
      !result.featured_image || result.featured_image.startsWith('data:')) {
    throw new Error(`Updating cover for ${slug} failed (HTTP ${response.status}): ${result.error || 'unexpected response'}`);
  }

  const coverUrl = new URL(result.featured_image, endpoint).href;
  if (new URL(coverUrl).origin !== new URL(endpoint).origin) {
    throw new Error('The cover was not returned as a site-hosted asset.');
  }

  const check = await fetch(coverUrl);
  const type = check.headers.get('content-type') || '';
  await check.body?.cancel();
  if (!check.ok || !type.startsWith('image/')) {
    throw new Error(`Post updated, but cover verification failed (HTTP ${check.status}).`);
  }

  console.log(`Updated published post cover: https://gareev.de/blog/${slug} (id ${result.id})`);
  console.log(`Cover: ${coverUrl}`);
}
