import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';

export const GET = withApiAuth(async (request: NextRequest, _user: { id: string }) => {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'No file path provided' }, { status: 400 });

  try {
    const result = await get(path, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });

    if (!result) return new NextResponse('File not found', { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving private Blob:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
});

export const dynamic = 'force-dynamic';
