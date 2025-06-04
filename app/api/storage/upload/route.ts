import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Yandex Cloud Object Storage configuration
// Public bucket for unauthenticated uploads
const BUCKET_NAME = 'public-gareevde';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://storage.yandexcloud.net';

// Create S3 client for Yandex Cloud
const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.BUCKET_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'profiles';
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.log('Blocked unauthorized upload attempt');
      return NextResponse.json(
        { error: 'Для загрузки файлов необходимо авторизоваться' },
        { status: 401 }
      );
    }

    console.log('Upload request:', { folder, userId });

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    // Generate file path for authorized user
    const filePath = `${folder}/${userId}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      CacheControl: '3600',
      Metadata: userId ? { userId } : undefined,
    });

    await s3Client.send(command);

    // Generate and return public URL with cache buster
    const publicUrl = `https://storage.yandexcloud.net/${BUCKET_NAME}/${filePath}?${Date.now()}`;
    return NextResponse.json({
      data: {
        path: filePath,
        publicUrl: publicUrl,
        directUrl: publicUrl
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred during upload' },
      { status: 500 }
    );
  }
}
