import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || 'profiles/';
    const userId = request.headers.get('x-user-id');

    if (prefix.startsWith('profiles/') && !prefix.startsWith('profiles/public/') && !userId) {
      return NextResponse.json({ error: 'Unauthorized access - login required' }, { status: 401 });
    }

    const blobs = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const data = blobs
      .filter((blob) => !startDate || new Date(blob.uploadedAt) >= new Date(startDate))
      .filter((blob) => !endDate || new Date(blob.uploadedAt) <= new Date(endDate))
      .map((blob) => ({
        name: blob.pathname.replace(prefix, ''),
        pathname: blob.pathname,
        id: blob.etag,
        metadata: { size: blob.size },
        created_at: blob.uploadedAt.toISOString(),
        url: `/api/storage/file?path=${encodeURIComponent(blob.pathname)}`,
      }))
      .filter((file) => file.name && !file.name.endsWith('/'));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while listing files' },
      { status: 500 },
    );
  }
}
