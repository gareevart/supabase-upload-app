import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deletePushEndpoint, isCnsConfigured, unsubscribeFromTopic } from '@/lib/yandex-cns';

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  if (!isCnsConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const endpointArn = typeof body.endpointArn === 'string' ? body.endpointArn.trim() : '';

    if (!endpointArn) {
      return NextResponse.json({ error: 'endpointArn is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseServer
      .from('push_subscriptions')
      .select('id, topic_subscription_arn')
      .eq('endpoint_arn', endpointArn)
      .maybeSingle();

    if (fetchError) {
      console.error('[push/unsubscribe] Failed to load subscription:', fetchError);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    if (existing) {
      const { error: updateError } = await supabaseServer
        .from('push_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[push/unsubscribe] Failed to deactivate subscription:', updateError);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
      }
    }

    if (existing?.topic_subscription_arn) {
      try {
        await unsubscribeFromTopic(existing.topic_subscription_arn);
      } catch (topicError) {
        console.warn('[push/unsubscribe] Failed to unsubscribe from topic:', topicError);
      }
    }

    try {
      await deletePushEndpoint(endpointArn);
    } catch (deleteError) {
      console.warn('[push/unsubscribe] Failed to delete CNS endpoint:', deleteError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push/unsubscribe] Failed to unsubscribe:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe from push notifications' }, { status: 500 });
  }
}
