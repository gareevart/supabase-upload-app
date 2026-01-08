import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { getResend } from '@/lib/resend';
import { loadTiptapToHtml } from '@/lib/tiptap-loader';
import { processBase64Images } from '@/app/utils/imageProcessor';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Create a Supabase client with service role for background job
// This allows the cron job to run without user authentication
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string, // You'll need to add this to your .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Secret key to protect the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify the request has the correct secret
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || !authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current time
    const now = new Date();

    // Find all scheduled broadcasts that are due to be sent
    const { data: scheduledBroadcasts, error: fetchError } = await supabaseAdmin
      .from('sent_mails')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled broadcasts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled broadcasts' },
        { status: 500 }
      );
    }

    if (!scheduledBroadcasts || scheduledBroadcasts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled broadcasts to send',
        sent: 0
      });
    }

    // Process each scheduled broadcast
    const results = await Promise.allSettled(
      scheduledBroadcasts.map(async (broadcast) => {
        try {
          // Update status to sending
          await supabaseAdmin
            .from('sent_mails')
            .update({ status: 'sending' })
            .eq('id', broadcast.id);

          // Prepare email HTML content
          let emailHtml: string;
          if (broadcast.content_html) {
            emailHtml = broadcast.content_html;
          } else {
            emailHtml = typeof broadcast.content === 'string'
              ? broadcast.content
              : (await loadTiptapToHtml())(broadcast.content);
          }

          // Process base64 images in HTML content before sending
          const { html: processedHtml, uploadedImages } = await processBase64Images(emailHtml, broadcast.user_id);

          console.log('Cron email sending - base64 images processed:', {
            broadcastId: broadcast.id,
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
            // Add tags for tracking
            tags: [
              { name: 'broadcast_id', value: broadcast.id }
            ]
          });

          if (resendError) {
            throw new Error(`Resend API error: ${resendError.message}`);
          }

          // Update broadcast with success status
          await supabaseAdmin
            .from('sent_mails')
            .update({
              status: 'sent',
              broadcast_id: resendData.id,
              sent_at: new Date().toISOString()
            })
            .eq('id', broadcast.id);

          return {
            id: broadcast.id,
            status: 'sent',
            broadcast_id: resendData.id
          };

        } catch (error) {
          console.error(`Error sending scheduled broadcast ${broadcast.id}:`, error);

          // Update broadcast with error status
          await supabaseAdmin
            .from('sent_mails')
            .update({
              status: 'failed'
            })
            .eq('id', broadcast.id);

          return {
            id: broadcast.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Count successful and failed broadcasts
    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length;
    const failed = results.filter(r => r.status === 'rejected' || (r.value as any).status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} scheduled broadcasts`,
      sent,
      failed,
      results
    });

  } catch (error) {
    console.error('Error in GET /api/broadcasts/cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}