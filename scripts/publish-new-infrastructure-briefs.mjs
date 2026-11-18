#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

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

const files = execFileSync('git', [
  'diff', '--name-only', '--diff-filter=A', before, after, '--', 'content/briefs',
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  .filter((file) => /^content\/briefs\/\d{4}-\d{2}-\d{2}-infrastructure-design-brief\.md$/.test(file));

if (files.length === 0) {
  console.log('No new infrastructure design briefs in this push.');
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

const existingResponse = await fetch(`${endpoint}?publishedOnly=true`, { headers });
if (!existingResponse.ok) {
  throw new Error(`Could not check existing posts (HTTP ${existingResponse.status}).`);
}
const existing = await existingResponse.json();
if (!Array.isArray(existing)) {
  throw new Error('The blog API did not return a post list.');
}

for (const file of files) {
  const date = file.match(/(\d{4}-\d{2}-\d{2})-infrastructure-design-brief\.md$/)[1];
  const slug = `infrastructure-design-brief-${date}`;
  if (existing.some((post) => post.slug === slug)) {
    console.log(`Already published: ${slug}`);
    continue;
  }

  const markdown = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').trim();
  const match = markdown.match(/^# (Infrastructure Design Brief — [^\n]+)\n+([\s\S]+)$/);
  if (!match) {
    throw new Error(`${file} must start with an Infrastructure Design Brief H1 title.`);
  }
  const [, title, content] = match;
  if (title.length > 100 || content.length > 500_000 || content.includes('genui')) {
    throw new Error(`${file} has an invalid title, size, or chat-only citations.`);
  }
  const excerpt = content.trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ').slice(0, 240);
  if (!excerpt || !content.includes('](https://')) {
    throw new Error(`${file} needs an introduction and direct source links.`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, content: content.trim(), excerpt, slug, published: true }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.published !== true || result.slug !== slug) {
    throw new Error(`Publishing ${file} failed (HTTP ${response.status}): ${result.error || 'unexpected response'}`);
  }
  console.log(`Published: https://gareev.de/blog/${slug} (id ${result.id})`);
}
