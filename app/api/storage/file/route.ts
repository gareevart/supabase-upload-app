import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { isPublicBlogAssetPath } from '@/lib/blobUrl';

const PRIVATE_CACHE_CONTROL = 'private, no-cache';
const PUBLIC_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

async function serveBlob(request: NextRequest, isPublic: boolean) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'No file path provided' }, { status: 400 });

  const cacheControl = isPublic ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL;

  try {
    const result = await get(path, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });

    if (!result) return new NextResponse('File not found', { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': cacheControl },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        ETag: result.blob.etag,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Error serving private Blob:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

const serveAuthenticatedBlob = withApiAuth(async (request: NextRequest) => serveBlob(request, false));

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'No file path provided' }, { status: 400 });

  if (isPublicBlogAssetPath(path)) {
    return serveBlob(request, true);
  }

  return serveAuthenticatedBlob(request);
}

export const dynamic = 'force-dynamic';
