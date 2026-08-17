#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://gareev.de/api/blog-posts';
const MAX_CONTENT_LENGTH = 500_000;

function printUsage(exitCode = 0) {
  const message = `
Publish a post to gareev.de.

Usage:
  GAREEV_BLOG_API_KEY=sk_... npm run publish:blog -- --title "Post title" --file ./post.md [options]

Required:
  --title <text>              Post title.
  --file <path>               UTF-8 Markdown or HTML file to use as post content.

Optional:
  --draft                     Create an unpublished draft (default).
  --publish                   Publish immediately. Use deliberately.
  --excerpt <text>            Short post summary.
  --slug <slug>               URL slug using lowercase letters, numbers, and hyphens.
  --featured-image <url>      Public URL of the featured image.
  --hide-featured-image       Hide the featured image on the post page.
  --endpoint <url>            Override the API URL (default: ${DEFAULT_ENDPOINT}).
  --dry-run                   Validate and print a redacted request without publishing.
  --help                      Show this help.

Environment:
  GAREEV_BLOG_API_KEY         A gareev.de API key (required except with --dry-run).
  GAREEV_BLOG_API_URL         Optional default endpoint override.
`;
  console.log(message.trim());
  process.exit(exitCode);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readArgs(argv) {
  const result = {
    title: undefined,
    file: undefined,
    excerpt: undefined,
    slug: undefined,
    featuredImage: undefined,
    endpoint: process.env.GAREEV_BLOG_API_URL || DEFAULT_ENDPOINT,
    published: false,
    showFeaturedImage: true,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === '--help' || argument === '-h') printUsage();
    if (argument === '--draft') {
      result.published = false;
      continue;
    }
    if (argument === '--publish') {
      result.published = true;
      continue;
    }
    if (argument === '--hide-featured-image') {
      result.showFeaturedImage = false;
      continue;
    }
    if (argument === '--dry-run') {
      result.dryRun = true;
      continue;
    }

    const options = {
      '--title': 'title',
      '--file': 'file',
      '--excerpt': 'excerpt',
      '--slug': 'slug',
      '--featured-image': 'featuredImage',
      '--endpoint': 'endpoint',
    };

    if (argument in options) {
      if (!next || next.startsWith('--')) {
        fail(`${argument} requires a value.`);
      }
      result[options[argument]] = next;
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${argument}`);
  }

  return result;
}

function validateInput(options, content) {
  if (!options.title?.trim()) fail('--title is required.');
  if (options.title.trim().length > 100) fail('--title must contain 100 characters or fewer.');
  if (!content.trim()) fail('--file must contain post content.');
  if (content.length > MAX_CONTENT_LENGTH) {
    fail(`Post content exceeds the ${MAX_CONTENT_LENGTH.toLocaleString()} character API limit.`);
  }
  if (options.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) {
    fail('--slug may contain only lowercase letters, numbers, and single hyphens between words.');
  }
  try {
    new URL(options.endpoint);
  } catch {
    fail('--endpoint must be a valid URL.');
  }
}

async function main() {
  const options = readArgs(process.argv.slice(2));
  if (!options.file) fail('--file is required.');

  let content;
  try {
    content = await readFile(options.file, 'utf8');
  } catch (error) {
    fail(`Cannot read ${options.file}: ${error instanceof Error ? error.message : String(error)}`);
  }

  validateInput(options, content);

  const payload = {
    title: options.title.trim(),
    content,
    published: options.published,
    show_featured_image: options.showFeaturedImage,
    ...(options.excerpt ? { excerpt: options.excerpt } : {}),
    ...(options.slug ? { slug: options.slug } : {}),
    ...(options.featuredImage ? { featured_image: options.featuredImage } : {}),
  };

  if (options.dryRun) {
    console.log(JSON.stringify({
      endpoint: options.endpoint,
      method: 'POST',
      authorization: 'Bearer [redacted]',
      payload: {
        ...payload,
        content: `[${content.length} characters from ${options.file}]`,
      },
    }, null, 2));
    return;
  }

  const apiKey = process.env.GAREEV_BLOG_API_KEY?.trim();
  if (!apiKey) {
    fail('GAREEV_BLOG_API_KEY is required. Export it in your terminal or load it from a local, ignored .env file.');
  }
  if (!/^sk_[a-f0-9]{64}$/.test(apiKey)) {
    fail('GAREEV_BLOG_API_KEY does not have the expected sk_ key format.');
  }

  let response;
  try {
    response = await fetch(options.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    fail(`Could not reach gareev.de: ${error instanceof Error ? error.message : String(error)}`);
  }

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { error: responseText.slice(0, 500) };
  }

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`;
    fail(`Publishing failed (${response.status}): ${message}`);
  }

  console.log(JSON.stringify({
    ok: true,
    id: data.id,
    title: data.title,
    slug: data.slug,
    published: data.published,
    created_at: data.created_at,
  }, null, 2));
}

void main();
