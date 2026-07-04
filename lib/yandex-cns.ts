import { getYandexIamToken } from '@/lib/yandex-iam';

const CNS_ENDPOINT = 'https://notifications.yandexcloud.net/';

export type PushSubscriptionJson = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type CnsResponse = Record<string, unknown>;

function getPlatformApplicationArn(): string {
  const arn = process.env.YANDEX_CNS_PLATFORM_ARN?.trim();
  if (!arn) {
    throw new Error('YANDEX_CNS_PLATFORM_ARN is not configured');
  }
  return arn;
}

function getTopicArn(): string | null {
  return process.env.YANDEX_CNS_TOPIC_ARN?.trim() || null;
}

async function cnsRequest(params: Record<string, string>): Promise<CnsResponse> {
  const iamToken = await getYandexIamToken();
  const body = new URLSearchParams({
    ResponseFormat: 'JSON',
    ...params,
  });

  const response = await fetch(CNS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Authorization: `Bearer ${iamToken}`,
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data: CnsResponse;
  try {
    data = JSON.parse(text) as CnsResponse;
  } catch {
    throw new Error(`Yandex CNS returned non-JSON response (${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(`Yandex CNS request failed (${response.status}): ${text}`);
  }

  const error = data.Error as { Code?: string; Message?: string } | undefined;
  if (error?.Code) {
    throw new Error(`Yandex CNS error ${error.Code}: ${error.Message ?? 'Unknown error'}`);
  }

  return data;
}

function unwrapResult<T>(response: CnsResponse, resultKey: string): T {
  const wrapper = response[`${resultKey}Response`] as Record<string, unknown> | undefined;
  const result = wrapper?.[`${resultKey}Result`] as T | undefined;
  if (!result) {
    throw new Error(`Unexpected Yandex CNS response shape for ${resultKey}`);
  }
  return result;
}

export function isCnsConfigured(): boolean {
  return Boolean(
    process.env.YANDEX_CNS_PLATFORM_ARN?.trim()
    && (
      process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY_B64?.trim()
      || process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY_FILE?.trim()
      || process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY?.trim()
      || process.env.YANDEX_CNS_IAM_TOKEN?.trim()
    ),
  );
}

export async function getVapidPublicKey(): Promise<string> {
  const cached = process.env.YANDEX_CNS_VAPID_PUBLIC_KEY?.trim();
  if (cached) {
    return cached;
  }

  const response = await cnsRequest({
    Action: 'GetPlatformApplicationAttributes',
    PlatformApplicationArn: getPlatformApplicationArn(),
  });

  const result = unwrapResult<{ Attributes?: { VAPIDPublicKey?: string } }>(
    response,
    'GetPlatformApplicationAttributes',
  );

  const vapidKey = result.Attributes?.VAPIDPublicKey;
  if (!vapidKey) {
    throw new Error('VAPIDPublicKey was not returned by Yandex CNS');
  }

  return vapidKey;
}

export async function createPushEndpoint(
  subscription: PushSubscriptionJson,
  customUserData?: string,
): Promise<string> {
  const params: Record<string, string> = {
    Action: 'CreatePlatformEndpoint',
    PlatformApplicationArn: getPlatformApplicationArn(),
    Token: JSON.stringify(subscription),
  };

  if (customUserData) {
    params.CustomUserData = customUserData;
  }

  const response = await cnsRequest(params);
  const result = unwrapResult<{ EndpointArn?: string }>(response, 'CreatePlatformEndpoint');
  if (!result.EndpointArn) {
    throw new Error('CreatePlatformEndpoint did not return EndpointArn');
  }

  return result.EndpointArn;
}

export async function subscribeEndpointToTopic(endpointArn: string): Promise<string | null> {
  const topicArn = getTopicArn();
  if (!topicArn) {
    return null;
  }

  const response = await cnsRequest({
    Action: 'Subscribe',
    TopicArn: topicArn,
    Protocol: 'application',
    Endpoint: endpointArn,
  });

  const result = unwrapResult<{ SubscriptionArn?: string }>(response, 'Subscribe');
  return result.SubscriptionArn ?? null;
}

export async function deletePushEndpoint(endpointArn: string): Promise<void> {
  await cnsRequest({
    Action: 'DeleteEndpoint',
    EndpointArn: endpointArn,
  });
}

export type BlogPushPayload = {
  title: string;
  body: string;
  url: string;
  icon?: string;
};

function buildWebMessage(payload: BlogPushPayload): string {
  const structuredWeb = {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
    },
    data: {
      url: payload.url,
    },
  };

  const plainText = `${payload.title}: ${payload.body}`;

  return JSON.stringify({
    default: plainText,
    WEB: JSON.stringify(structuredWeb),
  });
}

export async function publishBlogPushNotification(payload: BlogPushPayload): Promise<void> {
  const topicArn = getTopicArn();
  const message = buildWebMessage(payload);

  if (topicArn) {
    await cnsRequest({
      Action: 'Publish',
      TopicArn: topicArn,
      Message: message,
      MessageStructure: 'json',
    });
    return;
  }

  throw new Error('YANDEX_CNS_TOPIC_ARN is required to publish blog push notifications');
}
