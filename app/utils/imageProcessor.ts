import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

interface ProcessedImage {
  originalSrc: string;
  newSrc: string;
}

export async function processBase64Images(
  htmlContent: string,
  userId: string
): Promise<{ html: string; uploadedImages: ProcessedImage[] }> {
  const uploadedImages: ProcessedImage[] = [];

  // Regular expression to match base64 data URIs
  const base64Regex = /<img[^>]+src=["']data:image\/([a-zA-Z]+);base64,([^"']+)["'][^>]*>/g;

  let processedHtml = htmlContent;
  let match;

  // Create Supabase client
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );

  // Process each base64 image found
  while ((match = base64Regex.exec(htmlContent)) !== null) {
    const [fullMatch, imageType, base64Data] = match;

    try {
      // Convert base64 to blob
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const fileName = `broadcast-${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${imageType}`;
      const filePath = `broadcast-images/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, imageBuffer, {
          contentType: `image/${imageType}`,
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      if (urlData.publicUrl) {
        // Replace base64 src with public URL
        const newImgTag = fullMatch.replace(
          /src=["']data:image\/[^"']+["']/,
          `src="${urlData.publicUrl}"`
        );

        processedHtml = processedHtml.replace(fullMatch, newImgTag);

        uploadedImages.push({
          originalSrc: match[0],
          newSrc: urlData.publicUrl
        });

        console.log('Successfully processed image:', {
          type: imageType,
          size: imageBuffer.length,
          url: urlData.publicUrl
        });
      }
    } catch (error) {
      console.error('Error processing base64 image:', error);
      // Continue with next image if one fails
    }
  }

  return {
    html: processedHtml,
    uploadedImages
  };
}

export async function getBase64ImageCount(htmlContent: string): Promise<number> {
  const base64Regex = /<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/g;
  const matches = htmlContent.match(base64Regex);
  return matches ? matches.length : 0;
}