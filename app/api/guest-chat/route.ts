import { NextResponse } from 'next/server';

type GuestMessage = { role: 'user' | 'assistant'; text: string };

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_BODY_LENGTH = 100_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  if (requestsByIp.size > 1000) {
    for (const [key, value] of requestsByIp) {
      if (value.resetAt <= now) requestsByIp.delete(key);
    }
    while (requestsByIp.size > 1000) {
      const oldest = requestsByIp.keys().next().value;
      if (!oldest) break;
      requestsByIp.delete(oldest);
    }
  }
  const usage = requestsByIp.get(ip);
  if (usage && usage.resetAt > now && usage.count >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_HISTORY ||
      !messages.every((message): message is GuestMessage =>
        message && typeof message === 'object' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 && message.text.length <= MAX_MESSAGE_LENGTH) ||
      messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }

  const apiKey = process.env.YANDEX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chat is unavailable' }, { status: 503 });
  }

  requestsByIp.set(ip, usage && usage.resetAt > now
    ? { count: usage.count + 1, resetAt: usage.resetAt }
    : { count: 1, resetAt: now + WINDOW_MS });

  const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER || 'b1gb5lrqp1jr1tmamu2t';
  try {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${apiKey}` },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt/latest`,
        completionOptions: { stream: false, temperature: 0.6, maxTokens: '1000' },
        messages: [
          { role: 'system', text: 'Ты полезный ассистент. Отвечай понятно и по делу.' },
          ...messages,
        ],
      }),
    });
    if (!response.ok) {
      console.error('Guest chat model request failed:', response.status);
      return NextResponse.json({ error: 'Chat is unavailable' }, { status: 502 });
    }
    const result = await response.json();
    const text = result?.result?.alternatives?.[0]?.message?.text;
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Guest chat request failed:', error);
    return NextResponse.json({ error: 'Chat is unavailable' }, { status: 502 });
  }
}
