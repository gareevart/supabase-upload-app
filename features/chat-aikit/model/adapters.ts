import type { ChatStatus, ChatType, TChatMessage } from '@gravity-ui/aikit';
import type { Message } from '@/hooks/useChat';
import type { Chat } from '@/hooks/useChats';
import { parseMessageSegments } from '@/features/widget-runtime/lib/parseWidgetBlock';
import type { CustomMessageContent } from '../ui/WidgetMessagePart';

export type AikitChatMessage = TChatMessage<CustomMessageContent>;

export function toAikitMessages(messages: Message[]): AikitChatMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return {
        id: msg.id,
        role: 'user' as const,
        content: msg.content,
        timestamp: msg.created_at,
      };
    }

    let content: string = msg.content || '';
    const sources = msg.metadata?.sources;
    if (sources && sources.length > 0) {
      const sourceLines = sources
        .map((s) => {
          const href = s.url || (s.slug ? `/blog/${s.slug}` : null);
          return href ? `- [${s.title}](${href})` : `- ${s.title}`;
        })
        .join('\n');
      content = `${content}\n\n**Источники:**\n${sourceLines}`;
    }

    // Generated widget blocks are rendered as live previews via the custom
    // 'widget' message part (see WidgetMessagePart)
    const segments = parseMessageSegments(content);
    if (segments.some((segment) => segment.type === 'widget')) {
      return {
        id: msg.id,
        role: 'assistant' as const,
        content: segments.map((segment) =>
          segment.type === 'text'
            ? { type: 'text' as const, data: { text: segment.content } }
            : { type: 'widget' as const, data: segment.widget }
        ),
        timestamp: msg.created_at,
      };
    }

    return {
      id: msg.id,
      role: 'assistant' as const,
      content,
      timestamp: msg.created_at,
    };
  });
}

export function toAikitChats(chats: Chat[]): ChatType[] {
  return chats.map((c) => ({
    id: c.id,
    name: c.title || 'Новый чат',
    createTime: c.created_at,
    lastMessage: c.lastMessage,
  }));
}

export function toChatStatus(
  isMessageSending: boolean,
  isAssistantTyping: boolean,
  hasError = false,
): ChatStatus {
  if (hasError) return 'error';
  if (isAssistantTyping) return 'streaming';
  if (isMessageSending) return 'submitted';
  return 'ready';
}
