import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { processBase64Images, getBase64ImageCount } from '@/app/utils/imageProcessor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Test broadcast API access and data
export const GET = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove: (name: string, options: CookieOptions) => {
            request.cookies.delete(name);
          },
        },
      }
    );

    console.log('DEBUG: Testing broadcast access for user:', user.id);

    // Test 1: Get user profile and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('DEBUG: User profile:', profile, 'Error:', profileError);

    // Test 2: Check sent_mails table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('sent_mails')
      .select('*')
      .limit(1);

    console.log('DEBUG: Table structure test:', {
      count: tableInfo?.length,
      error: tableError,
      data: tableInfo
    });

    // Test 3: Find broadcasts by user (if any)
    const { data: userBroadcasts, error: broadcastError } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    console.log('DEBUG: User broadcasts:', {
      count: userBroadcasts?.length,
      data: userBroadcasts,
      error: broadcastError
    });

    // Test 4: Get draft broadcasts
    const { data: draftBroadcasts, error: draftError } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('status', 'draft')
      .eq('user_id', user.id)
      .limit(5);

    console.log('DEBUG: Draft broadcasts:', {
      count: draftBroadcasts?.length,
      data: draftBroadcasts,
      error: draftError
    });

    // Test 5: Try accessing specific ID from URL params
    const urlParts = request.nextUrl.pathname.split('/');
    const testId = urlParts[urlParts.length - 2]; // Get ID from /api/debug/test-broadcast/[id]

    let specificBroadcast = null;
    let specificError = null;

    if (testId && testId !== 'test-broadcast') {
      console.log('DEBUG: Testing specific broadcast ID:', testId);
      const { data, error } = await supabase
        .from('sent_mails')
        .select('*')
        .eq('id', testId)
        .single();

      specificBroadcast = data;
      specificError = error;
      console.log('DEBUG: Specific broadcast result:', { data, error });
    }

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          profile,
          profileError: profileError?.message
        },
        database: {
          tableAccessible: !tableError,
          tableError: tableError?.message,
          userBroadcasts: userBroadcasts?.length || 0,
          draftBroadcasts: draftBroadcasts?.length || 0
        },
        specific: specificBroadcast ? {
          found: true,
          id: specificBroadcast.id,
          status: specificBroadcast.status,
          subject: specificBroadcast.subject
        } : {
          found: false,
          error: specificError?.message
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test broadcast debug error:', error);
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// POST handler to test base64 image processing
export const POST = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const { htmlContent } = body;

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Missing htmlContent in request body' },
        { status: 400 }
      );
    }

    console.log('Testing base64 image processing for user:', user.id);

    // Count base64 images in original content
    const originalImageCount = await getBase64ImageCount(htmlContent);

    // Process the images
    const { html: processedHtml, uploadedImages } = await processBase64Images(htmlContent, user.id);

    // Count base64 images in processed content (should be 0)
    const processedImageCount = await getBase64ImageCount(processedHtml);

    return NextResponse.json({
      success: true,
      test: {
        userId: user.id,
        originalImageCount,
        processedImageCount,
        uploadedImagesCount: uploadedImages.length,
        uploadedImages: uploadedImages.map(img => ({
          originalSrc: img.originalSrc.substring(0, 100) + '...',
          newSrc: img.newSrc.substring(0, 100) + '...'
        })),
        htmlLength: {
          original: htmlContent.length,
          processed: processedHtml.length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Base64 image test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});