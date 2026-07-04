import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PushSubscriptionJson } from '@/lib/yandex-cns';

type StorePushSubscriptionInput = {
  endpointArn: string;
  subscription: PushSubscriptionJson;
  topicSubscriptionArn: string | null;
  userAgent?: string;
};

type StorePushSubscriptionResult = {
  id: string | null;
  stored: boolean;
  error?: string;
};

function getSupabaseServer(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (url, options) => fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      }),
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function storePushSubscription(
  input: StorePushSubscriptionInput,
): Promise<StorePushSubscriptionResult> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { id: null, stored: false, error: 'Supabase is not configured' };
  }

  const payload = {
    endpoint_arn: input.endpointArn,
    push_subscription: input.subscription,
    user_agent: input.userAgent ?? null,
    topic_subscription_arn: input.topicSubscriptionArn,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint_arn' })
      .select('id, endpoint_arn')
      .single();

    if (!error && data) {
      return { id: data.id, stored: true };
    }

    lastError = error?.message ?? 'Unknown Supabase error';
    console.warn(`[push/subscribe] Supabase upsert attempt ${attempt}/3 failed:`, lastError);

    if (attempt < 3) {
      await sleep(500 * attempt);
    }
  }

  return { id: null, stored: false, error: lastError };
}
