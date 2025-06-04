import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Yandex Cloud Object Storage configuration
// Public bucket for unauthenticated access  
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
    const prefix = searchParams.get('prefix') || 'profiles/';
    const userId = request.headers.get('x-user-id');
    const bucket = searchParams.get('bucket') || 'public-gareevde';
    
    console.log('List request:', { prefix, userId, bucket });

    // Require auth for private folders but allow public access
    if (prefix.startsWith('profiles/') && !prefix.startsWith('profiles/public/') && !userId) {
      console.log('Unauthorized access attempt to private folder');
      return NextResponse.json(
        { error: 'Unauthorized access - login required' },
        { status: 401 }
      );
    }
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    // Transform response to match the expected format
    const files = response.Contents?.filter(item => {
      const createdAt = item.LastModified;
      if (startDate && createdAt && new Date(createdAt) < new Date(startDate)) {
        return false;
      }
      if (endDate && createdAt && new Date(createdAt) > new Date(endDate)) {
        return false;
      }
      return true;
    }).map(item => ({
      name: item.Key?.replace(prefix, '') || '',
      id: item.ETag,
      metadata: { size: item.Size },
      created_at: item.LastModified?.toISOString(),
    })) || [];

    // Filter out empty folder placeholders and folders themselves
    const filteredFiles = files.filter(file => 
      file.name !== '' && 
      !file.name.endsWith('/') && 
      file.name !== '.emptyFolderPlaceholder'
    );

    return NextResponse.json({ data: filteredFiles });
  } catch (error) {
    console.error('Error listing files:', error);
    const { searchParams } = new URL(request.url);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while listing files';
    const errorContext = {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      prefix: searchParams.get('prefix') || 'profiles/',
      userId: request.headers.get('x-user-id'),
      bucket: searchParams.get('bucket') || 'public-gareevde'
    };
    console.error('API List Error:', errorContext);
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}
