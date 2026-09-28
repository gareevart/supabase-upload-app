import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';

export const DELETE = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const path = new URL(request.url).searchParams.get('path');

    // Uploaded objects are namespaced as <folder>/<userId>/<filename>.
    // Accept the pathname returned by the upload API, but never allow a user
    // to delete another user's object or an arbitrary Blob pathname.
    const pathParts = path?.split('/') ?? [];
    if (!path || pathParts.length < 3 || pathParts[1] !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this file' }, { status: 403 });
    }

    await del(path);
    return NextResponse.json({ data: { path } });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while deleting file' },
      { status: 500 },
    );
  }
});
