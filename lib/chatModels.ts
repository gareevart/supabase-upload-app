// Context length per https://api-docs.deepseek.com/quick_start/pricing (both models: 1M tokens)
export const CHAT_MODELS = [
  { id: 'deepseek-flash', providerModel: 'deepseek-flash', contextLength: 1_000_000 },
  { id: 'deepseek-v4-pro', providerModel: 'deepseek-v4-pro', contextLength: 1_000_000 },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]['id'];

export const DEFAULT_CHAT_MODEL: ChatModelId = 'deepseek-flash';
export const CHAT_MODEL_IDS = CHAT_MODELS.map((model) => model.id);

export function getModelContextLength(value: unknown): number {
  const modelId = normalizeChatModel(value) ?? DEFAULT_CHAT_MODEL;
  return CHAT_MODELS.find((model) => model.id === modelId)?.contextLength ?? 1_000_000;
}

export function normalizeChatModel(value: unknown): ChatModelId | null {
  if (typeof value !== 'string') return null;
  return CHAT_MODEL_IDS.includes(value as ChatModelId) ? value as ChatModelId : null;
}

export function getProviderModel(value: unknown): string | null {
  const modelId = normalizeChatModel(value);
  return modelId
    ? CHAT_MODELS.find((model) => model.id === modelId)?.providerModel || null
    : null;
}
