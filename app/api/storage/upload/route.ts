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
    const metadataStr = formData.get('metadata') as string;
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

    // Parse metadata if provided
    let metadata: Record<string, string> = {};
    if (userId) {
      metadata.userId = userId;
    }
    
    if (metadataStr) {
      try {
        const parsedMetadata = JSON.parse(metadataStr);
        // Ensure all metadata values are strings and valid for HTTP headers
        Object.keys(parsedMetadata).forEach(key => {
          // Sanitize metadata values to ensure they're valid for S3 headers
          // Only use alphanumeric characters, hyphens, and spaces
          let value = String(parsedMetadata[key]);
          
          // If the value contains potentially problematic characters, keep it encoded
          if (value.includes('%')) {
            metadata[key] = value;
          } else {
            // Otherwise, sanitize it by replacing problematic characters
            metadata[key] = value.replace(/[^\w\s-]/g, '_');
          }
        });
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }

    // Upload file
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      CacheControl: '3600',
      Metadata: metadata,
      ACL: 'public-read', // Make the file publicly accessible
    });

    await s3Client.send(command);

    // Generate and return public URL with cache buster
    // Use a different URL format that works better with Yandex Cloud Object Storage
    const publicUrl = `https://storage.yandexcloud.net/${BUCKET_NAME}/${filePath}?${Date.now()}`;
    const directUrl = `https://${BUCKET_NAME}.storage.yandexcloud.net/${filePath}?${Date.now()}`;
    
    console.log('Generated URLs:', { publicUrl, directUrl });
    
    return NextResponse.json({
      data: {
        path: filePath,
        publicUrl: publicUrl,
        directUrl: directUrl,
        url: directUrl // Fallback URL
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
