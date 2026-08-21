import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';

export const GET = withApiAuth(async (request: NextRequest, _user: { id: string }) => {
  try {
    const path = new URL(request.url).searchParams.get('path');
    if (!path) return NextResponse.json({ error: 'No file path provided' }, { status: 400 });

    let cursor: string | undefined;
    do {
      const page = await list({ prefix: path, cursor, limit: 1000 });
      const blob = page.blobs.find((item) => item.pathname === path);
      if (blob) return NextResponse.json({ url: blob.url });
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error) {
    console.error('Error generating URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while generating URL' },
      { status: 500 },
    );
  }
});
