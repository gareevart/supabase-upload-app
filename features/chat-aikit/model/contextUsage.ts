type MessageForContext = {
  role: string;
  content?: string | null;
  metadata?: { usage?: { totalTokens?: number } } | null;
};

export type ContextUsage = {
  tokens: number;
  /** true when no provider usage data exists and the value is estimated from text length */
  isEstimate: boolean;
};

/** Rough average of characters per token for mixed Russian/English text. */
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * Tokens currently occupied by the chat context.
 *
 * The provider reports `total_tokens` (prompt + completion) for every reply. The
 * next request sends the whole conversation again, including that reply, so the
 * last assistant reply's total is the exact size of the context right now.
 *
 * Messages saved before usage tracking existed have no usage data. For those the
 * size is estimated from the text length of the whole conversation.
 */
export function getContextUsage(messages: ReadonlyArray<MessageForContext>): ContextUsage {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const totalTokens = Number(message.metadata?.usage?.totalTokens);
    if (Number.isFinite(totalTokens) && totalTokens > 0) {
      return { tokens: totalTokens, isEstimate: false };
    }
    break;
  }

  const totalChars = messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
  return { tokens: Math.ceil(totalChars / CHARS_PER_TOKEN_ESTIMATE), isEstimate: true };
}
