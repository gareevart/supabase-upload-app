const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type DeepSeekUsage = {
  inputTextTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export class DeepSeekError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DeepSeekError';
  }
}

const toRole = (role: string): DeepSeekMessage['role'] =>
  role === 'system' || role === 'assistant' ? role : 'user';

export function toDeepSeekMessages(
  messages: Array<{ role?: string; text?: string; content?: string }>,
): DeepSeekMessage[] {
  return messages.flatMap((message) => {
    const content = (message.text ?? message.content ?? '').trim();
    if (!content) return [];
    return [{ role: toRole(message.role || 'user'), content }];
  });
}

export async function createDeepSeekCompletion(input: {
  model: string;
  messages: DeepSeekMessage[];
  maxTokens: number;
  temperature: number;
}): Promise<{ text: string; usage?: DeepSeekUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekError('DeepSeek API key is not configured', 503);
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: false,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      thinking: { type: 'disabled' },
    }),
  });

  if (!response.ok) {
    console.error('DeepSeek request failed:', response.status);
    throw new DeepSeekError(
      response.status === 401 ? 'DeepSeek API key is not valid' : 'Chat is unavailable',
      response.status === 401 ? 503 : 502,
    );
  }

  const result = await response.json().catch(() => ({}));
  const text = result?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new DeepSeekError('Empty model response', 502);
  }

  const usage = result?.usage;
  return {
    text,
    usage: usage
      ? {
          inputTextTokens: Number(usage.prompt_tokens) || 0,
          completionTokens: Number(usage.completion_tokens) || 0,
          totalTokens: Number(usage.total_tokens) || 0,
        }
      : undefined,
  };
}
