import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export const GET = withApiAuth(async (request: NextRequest, _user: { id: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while generating URL' },
      { status: 500 }
    );
  }
});
