import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Yandex Cloud Object Storage configuration
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

export async function GET(request: NextRequest) {
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

    // Generate a pre-signed URL that expires in 7 days (604800 seconds)
    const url = await getSignedUrl(s3Client, command, { 
      expiresIn: 604800,
    });

    // Return URL with CORS headers
    const response = NextResponse.json({ url });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Error generating URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred while generating URL' },
      { status: 500 }
    );
  }
}
