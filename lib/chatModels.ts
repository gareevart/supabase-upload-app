export const CHAT_MODELS = [
  { id: 'nemotron-3-nano', providerModel: 'nemotron-3-nano' },
  { id: 'gpt-oss-20b', providerModel: 'gpt-oss:20b' },
  { id: 'gpt-oss-120b', providerModel: 'gpt-oss:120b' },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]['id'];

export const DEFAULT_CHAT_MODEL: ChatModelId = 'gpt-oss-20b';
export const CHAT_MODEL_IDS = CHAT_MODELS.map((model) => model.id);

export function normalizeChatModel(value: unknown): ChatModelId | null {
  if (typeof value !== 'string') return null;

  const legacyAliases: Record<string, ChatModelId> = {
    'gpt-oss:20b': 'gpt-oss-20b',
    'gpt-oss:120b': 'gpt-oss-120b',
  };
  const normalized = legacyAliases[value] || value;
  return CHAT_MODEL_IDS.includes(normalized as ChatModelId)
    ? normalized as ChatModelId
    : null;
}

export function getProviderModel(value: unknown): string | null {
  const modelId = normalizeChatModel(value);
  return modelId
    ? CHAT_MODELS.find((model) => model.id === modelId)?.providerModel || null
    : null;
}
