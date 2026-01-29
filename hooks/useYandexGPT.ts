
import { useState } from 'react';
import { supabase } from "@/lib/client-supabase";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";

interface YandexGPTResponse {
  text: string;
  usage?: {
    inputTextTokens: string;
    completionTokens: string;
    totalTokens: string;
  };
  metadata?: {
    sources?: {
      title: string;
      slug?: string;
      url?: string;
      snippet?: string;
      type?: "blog" | "web";
    }[];
  };
  error?: string;
}

interface MessageContext {
  role: string;
  text: string;
}

// Helper function to handle streaming response
const handleStreamingResponse = async (
  response: Response,
  onReasoningChunk?: (chunk: string) => void
): Promise<YandexGPTResponse> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body for streaming');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let reasoningText = '';
  let buffer = '';
  let metadata: any = undefined;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '') continue;

      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return { text: fullText, usage: undefined, metadata };
        }

        try {
          const parsed = JSON.parse(data);

          // Handle metadata
          if (parsed.metadata) {
            metadata = parsed.metadata;
          }

          // Handle reasoning chunks
          if (parsed.result?.alternatives?.[0]?.message?.reasoning) {
            const reasoningChunk = parsed.result.alternatives[0].message.reasoning;
            reasoningText += reasoningChunk;
            onReasoningChunk?.(reasoningChunk);
          }

          // Handle final text
          if (parsed.result?.alternatives?.[0]?.message?.text) {
            fullText = parsed.result.alternatives[0].message.text;
          }
        } catch (e) {
          console.error('Error parsing streaming data:', e);
        }
      }
    }
  }

  return { text: fullText, usage: undefined, metadata };
};

export const useYandexGPT = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedModel, reasoningMode } = useModelSelection();

  const generateText = async (
    prompt: string,
    systemPrompt?: string,
    messageContext?: MessageContext[],
    onReasoningChunk?: (chunk: string) => void,
    useWebSearch?: boolean,
    webSearchQuery?: string
  ): Promise<YandexGPTResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      // Use regular API for now, streaming will be added later
      const apiEndpoint = '/api/generate-text';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          systemPrompt: reasoningMode
            ? (systemPrompt || 'Ты аналитический помощник с возможностью анализа изображений. Когда в сообщении есть описание изображения или извлеченный текст, используй эту информацию для детального анализа. Решай задачи пошагово, объясняя каждый шаг своих рассуждений. Будь точным и логичным в своих выводах.')
            : (systemPrompt || 'Ты профессиональный ассистент с возможностью работы с изображениями и документами. Если в сообщении есть информация об изображении, используй её для создания интересного и привлекательного контента.'),
          messageContext: messageContext || [],
          model: selectedModel,
          reasoningMode: reasoningMode,
          useWebSearch: Boolean(useWebSearch),
          webSearchQuery: webSearchQuery || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle streaming response for reasoning mode
      if (reasoningMode && response.headers.get('content-type')?.includes('text/event-stream')) {
        return await handleStreamingResponse(response, onReasoningChunk);
      }

      // Handle regular response
      const data = await response.json();

      if (!data || !data.text) {
        throw new Error('Не удалось получить текст из ответа API');
      }

      return {
        text: data.text,
        usage: data.usage,
        metadata: data.metadata
      };
    } catch (err) {
      console.error('Ошибка при генерации текста:', err);
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при генерации текста';
      setError(errorMessage);
      return {
        text: '',
        error: errorMessage
      };
    } finally {
      setIsGenerating(false);
    }
  };

  const improveText = async (text: string): Promise<YandexGPTResponse> => {
    return generateText(text, 'Ты профессиональный редактор текста. Твоя задача - улучшить следующий текст, сделав его более интересным, информативным и привлекательным для читателя. Исправь грамматические и стилистические ошибки. Сохрани исходный смысл и основные идеи текста.');
  };

  const generateChatTitle = async (messages: MessageContext[]): Promise<string> => {
    if (messages.length === 0) return "Новый чат";

    try {
      const { text } = await generateText(
        "Сгенерируй короткий и информативный заголовок для чата на основе этих сообщений.",
        "Ты эксперт по классификации и маркировке текстов. Твоя задача - создать краткий и точный заголовок до 5 слов для диалога на основе его содержания. Не используй кавычки в заголовке.",
        messages.slice(0, 3) // Используем первые 3 сообщения для контекста
      );

      return text.trim().replace(/^["']|["']$/g, ''); // Удаляем кавычки в начале и конце, если они есть
    } catch (err) {
      console.error('Ошибка при генерации заголовка чата:', err);
      return "Новый чат";
    }
  };

  return {
    generateText,
    improveText,
    generateChatTitle,
    isGenerating,
    error
  };
};
