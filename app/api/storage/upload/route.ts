import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') as string) || 'profiles';
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Для загрузки файлов необходимо авторизоваться' },
        { status: 401 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const fileName = `${crypto.randomUUID()}${extension}`;
    const path = `${folder}/${userId}/${fileName}`;
    const blob = await put(path, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || 'application/octet-stream',
      cacheControlMaxAge: 3600,
    });

    return NextResponse.json({
      data: {
        path: blob.pathname,
        publicUrl: blob.url,
        directUrl: blob.url,
        url: blob.url,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred during upload' },
      { status: 500 },
    );
  }
}
