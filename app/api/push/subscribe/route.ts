import { NextRequest, NextResponse } from 'next/server';
import {
  createPushEndpoint,
  isCnsConfigured,
  subscribeEndpointToTopic,
  type PushSubscriptionJson,
} from '@/lib/yandex-cns';
import { storePushSubscription } from '@/lib/push-subscriptions-db';

function isValidSubscription(value: unknown): value is PushSubscriptionJson {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const subscription = value as Partial<PushSubscriptionJson>;
  return Boolean(
    typeof subscription.endpoint === 'string'
    && subscription.keys
    && typeof subscription.keys.p256dh === 'string'
    && typeof subscription.keys.auth === 'string',
  );
}

export async function POST(request: NextRequest) {
  if (!isCnsConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const subscription = body.subscription;

    if (!isValidSubscription(subscription)) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;
    const endpointArn = await createPushEndpoint(subscription, userAgent);
    const topicSubscriptionArn = await subscribeEndpointToTopic(endpointArn);

    const dbResult = await storePushSubscription({
      endpointArn,
      subscription,
      topicSubscriptionArn,
      userAgent,
    });

    if (!dbResult.stored) {
      console.warn('[push/subscribe] CNS subscription created, but Supabase sync failed:', dbResult.error);
    }

    return NextResponse.json({
      id: dbResult.id,
      endpointArn,
      storedInDatabase: dbResult.stored,
      warning: dbResult.stored
        ? undefined
        : 'Push subscription is active, but local database sync failed. Notifications will still work via Yandex CNS.',
    });
  } catch (error) {
    console.error('[push/subscribe] Failed to subscribe:', error);
    const message = error instanceof Error ? error.message : 'Failed to subscribe to push notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
