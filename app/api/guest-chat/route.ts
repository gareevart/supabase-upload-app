import { NextResponse } from 'next/server';
import { getProviderModel } from '@/lib/chatModels';

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

  const payload = body as { messages?: unknown; model?: unknown; systemPrompt?: unknown };
  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_HISTORY ||
      !messages.every((message): message is GuestMessage =>
        message && typeof message === 'object' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 && message.text.length <= MAX_MESSAGE_LENGTH) ||
      messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }

  const model = getProviderModel(payload.model);
  if (!model) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  const systemPrompt = typeof payload.systemPrompt === 'string'
    ? payload.systemPrompt.trim()
    : '';
  if (systemPrompt.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Invalid system prompt' }, { status: 400 });
  }

  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chat is unavailable' }, { status: 503 });
  }

  requestsByIp.set(ip, usage && usage.resetAt > now
    ? { count: usage.count + 1, resetAt: usage.resetAt }
    : { count: 1, resetAt: now + WINDOW_MS });

  try {
    const response = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Ты полезный ассистент. Отвечай понятно и по делу.',
          },
          ...messages.map((message) => ({ role: message.role, content: message.text })),
        ],
        stream: false,
        options: { temperature: 0.6, num_predict: 2000 },
      }),
    });
    if (!response.ok) {
      console.error('Guest chat model request failed:', response.status);
      return NextResponse.json({ error: 'Chat is unavailable' }, { status: 502 });
    }
    const result = await response.json();
    const text = result?.message?.content || result?.message?.thinking;
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Guest chat request failed:', error);
    return NextResponse.json({ error: 'Chat is unavailable' }, { status: 502 });
  }
}
