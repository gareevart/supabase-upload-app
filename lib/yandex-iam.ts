import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const IAM_TOKEN_URL = 'https://iam.api.cloud.yandex.net/iam/v1/tokens';
const IAM_TOKEN_TTL_MS = 55 * 60 * 1000;

type ServiceAccountKey = {
  id: string;
  service_account_id: string;
  private_key: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createServiceAccountJwt(key: ServiceAccountKey): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'PS256', kid: key.id }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: key.service_account_id,
    aud: IAM_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const data = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(data), {
    key: key.private_key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  });

  return `${data}.${base64UrlEncode(signature)}`;
}

function loadServiceAccountKeyRaw(): string {
  const keyB64 = process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY_B64?.trim();
  if (keyB64) {
    return Buffer.from(keyB64, 'base64').toString('utf8');
  }

  const keyFile = process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY_FILE?.trim();
  if (keyFile) {
    const resolvedPath = path.isAbsolute(keyFile)
      ? keyFile
      : path.join(process.cwd(), keyFile);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Service account key file not found: ${resolvedPath}. `
        + 'Use YANDEX_CNS_SERVICE_ACCOUNT_KEY_B64 in .env.local for Next.js dev.',
      );
    }

    return fs.readFileSync(resolvedPath, 'utf8');
  }

  const inlineKey = process.env.YANDEX_CNS_SERVICE_ACCOUNT_KEY?.trim();
  if (!inlineKey) {
    throw new Error(
      'Set YANDEX_CNS_SERVICE_ACCOUNT_KEY_B64, YANDEX_CNS_SERVICE_ACCOUNT_KEY_FILE, or YANDEX_CNS_SERVICE_ACCOUNT_KEY',
    );
  }

  if (
    (inlineKey.startsWith("'") && inlineKey.endsWith("'"))
    || (inlineKey.startsWith('"') && inlineKey.endsWith('"'))
  ) {
    return inlineKey.slice(1, -1);
  }

  return inlineKey;
}

function parseServiceAccountKey(raw: string): ServiceAccountKey {
  const parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
  if (!parsed.id || !parsed.service_account_id || !parsed.private_key) {
    throw new Error('Service account key must contain id, service_account_id, and private_key');
  }
  return parsed as ServiceAccountKey;
}

export async function getYandexIamToken(): Promise<string> {
  const staticToken = process.env.YANDEX_CNS_IAM_TOKEN?.trim();
  if (staticToken) {
    return staticToken;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const key = parseServiceAccountKey(loadServiceAccountKeyRaw());
  const jwt = createServiceAccountJwt(key);

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain Yandex IAM token: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { iamToken?: string };
  if (!data.iamToken) {
    throw new Error('Yandex IAM token response did not include iamToken');
  }

  cachedToken = {
    value: data.iamToken,
    expiresAt: Date.now() + IAM_TOKEN_TTL_MS,
  };

  return data.iamToken;
}
