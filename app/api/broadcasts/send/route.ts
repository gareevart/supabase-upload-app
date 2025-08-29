import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { getResend } from '@/lib/resend';
import { tiptapToHtml } from '@/app/utils/tiptapToHtml';
import { processBase64Images } from '@/app/utils/imageProcessor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// POST handler to send a broadcast
export const POST = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const { id } = body;
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    // Create a new supabase client for this request
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
    
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // Check if user has admin or editor role
    if (!profile || !profile.role || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Requires admin or editor role' },
        { status: 403 }
      );
    }
    
    // Get the broadcast
    const { data: broadcast, error: fetchError } = await supabase
      .from('sent_mails')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }
    
    // Check if broadcast is already sent
    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: 'Broadcast already sent' },
        { status: 400 }
      );
    }
    
    // Update broadcast status to sending
    const { error: updateError } = await supabase
      .from('sent_mails')
      .update({ status: 'sending' })
      .eq('id', id);
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update broadcast status' },
        { status: 500 }
      );
    }
    
    try {
      // Process base64 images in HTML content before sending
      let emailHtml = broadcast.content_html || tiptapToHtml(broadcast.content);

      // Process base64 images and upload them to storage
      const { html: processedHtml, uploadedImages } = await processBase64Images(emailHtml, broadcast.user_id);

      console.log('Email sending - base64 images processed:', {
        originalImageCount: uploadedImages.length,
        processedHtmlLength: processedHtml.length
      });

      // Send the broadcast using Resend API
      const resendClient = getResend();
      const { data: resendData, error: resendError } = await resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: broadcast.recipients,
        subject: broadcast.subject,
        html: processedHtml,
      });
      
      if (resendError) {
        throw new Error(`Resend API error: ${resendError.message}`);
      }
      
      // Update broadcast with success status
      const { error: successUpdateError } = await supabase
        .from('sent_mails')
        .update({
          status: 'sent',
          broadcast_id: resendData.id,
          sent_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (successUpdateError) {
        console.error('Error updating broadcast after sending:', successUpdateError);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          broadcast_id: resendData.id,
          recipients: broadcast.recipients.length
        }
      });
      
    } catch (sendError) {
      console.error('Error sending broadcast:', sendError);
      
      // Update broadcast with error status
      const { error: errorUpdateError } = await supabase
        .from('sent_mails')
        .update({
          status: 'failed'
        })
        .eq('id', id);
      
      if (errorUpdateError) {
        console.error('Error updating broadcast after failure:', errorUpdateError);
      }
      
      return NextResponse.json(
        { error: 'Failed to send broadcast', details: sendError instanceof Error ? sendError.message : undefined },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in POST /api/broadcasts/send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});