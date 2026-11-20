import { getContextUsage } from '../contextUsage';
import { getModelContextLength } from '@/lib/chatModels';

describe('getContextUsage', () => {
  it('returns zero for an empty chat', () => {
    expect(getContextUsage([])).toEqual({ tokens: 0, isEstimate: true });
  });

  it('uses total tokens of the last assistant reply as an exact value', () => {
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b', metadata: { usage: { totalTokens: 1200 } } },
      { role: 'user', content: 'c' },
      { role: 'assistant', content: 'd', metadata: { usage: { totalTokens: 3400 } } },
      { role: 'user', content: 'e' },
    ];

    expect(getContextUsage(messages)).toEqual({ tokens: 3400, isEstimate: false });
  });

  it('estimates from text length when the last reply has no usage, instead of a stale value', () => {
    const messages = [
      { role: 'user', content: 'x'.repeat(400) },
      { role: 'assistant', content: 'y'.repeat(400), metadata: { usage: { totalTokens: 1200 } } },
      { role: 'user', content: 'z'.repeat(400) },
      { role: 'assistant', content: 'w'.repeat(400), metadata: { sources: [] } },
    ];

    expect(getContextUsage(messages)).toEqual({ tokens: 400, isEstimate: true });
  });

  it('estimates legacy chats that have no usage data at all', () => {
    const messages = [
      { role: 'user', content: 'q'.repeat(100), metadata: null },
      { role: 'assistant', content: 'a'.repeat(300), metadata: null },
    ];

    expect(getContextUsage(messages)).toEqual({ tokens: 100, isEstimate: true });
  });

  it('ignores invalid totals', () => {
    expect(getContextUsage([{ role: 'assistant', content: '', metadata: { usage: { totalTokens: Number.NaN } } }]))
      .toEqual({ tokens: 0, isEstimate: true });
    expect(getContextUsage([{ role: 'assistant', content: '', metadata: { usage: { totalTokens: 0 } } }]))
      .toEqual({ tokens: 0, isEstimate: true });
  });
});

describe('getModelContextLength', () => {
  it('returns the context length for known models', () => {
    expect(getModelContextLength('deepseek-flash')).toBe(1_000_000);
    expect(getModelContextLength('deepseek-v4-pro')).toBe(1_000_000);
  });

  it('falls back to the default model for unknown values', () => {
    expect(getModelContextLength('yandexgpt')).toBe(1_000_000);
    expect(getModelContextLength(undefined)).toBe(1_000_000);
  });
});
