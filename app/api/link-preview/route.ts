import { NextRequest, NextResponse } from 'next/server';

const MAX_HTML_SIZE = 1_000_000;
const FETCH_TIMEOUT_MS = 5_000;

function getMeta(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    'i',
  );
  const match = html.match(pattern);
  return (match?.[1] ?? match?.[2])?.trim() || null;
}

function getTitle(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) return NextResponse.json({ preview: null }, { status: 400 });

  let url: URL;
  try {
    url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
  } catch {
    return NextResponse.json({ preview: null }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogLinkPreview/1.0)' },
      redirect: 'follow',
    });
    if (!response.ok) return NextResponse.json({ preview: null });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return NextResponse.json({ preview: null });

    const reader = response.body?.getReader();
    if (!reader) return NextResponse.json({ preview: null });
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < MAX_HTML_SIZE) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }

    const image = getMeta(html, 'og:image');
    if (!image) return NextResponse.json({ preview: null });

    return NextResponse.json({
      preview: {
        url: url.toString(),
        image: new URL(image, url).toString(),
        title: getMeta(html, 'og:title') ?? getTitle(html) ?? url.hostname,
        description: getMeta(html, 'og:description'),
        hostname: url.hostname,
      },
    });
  } catch {
    return NextResponse.json({ preview: null });
  } finally {
    clearTimeout(timeout);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
