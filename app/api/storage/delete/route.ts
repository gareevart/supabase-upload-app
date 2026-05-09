import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { withApiAuth } from '@/app/auth/withApiAuth';

const BUCKET_NAME = 'public-gareevde';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://storage.yandexcloud.net';

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.BUCKET_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_KEY || '',
  },
});

export const DELETE = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path || !path.startsWith(`profiles/${user.id}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await s3Client.send(command);

    return NextResponse.json({ data: { path } });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while deleting file' },
      { status: 500 }
    );
  }
});
