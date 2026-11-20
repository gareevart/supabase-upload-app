import { useState } from 'react';
import { supabase } from "@/lib/client-supabase";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";

export interface ChatCompletionResponse {
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

export interface MessageContext {
  role: string;
  text: string;
}

const DEFAULT_SYSTEM_PROMPT = 'Ты профессиональный ассистент. Отвечай понятно и по делу.';
const IMPROVE_TEXT_PROMPT = 'Ты профессиональный редактор текста. Твоя задача - улучшить следующий текст, сделав его более интересным, информативным и привлекательным для читателя. Исправь грамматические и стилистические ошибки. Сохрани исходный смысл и основные идеи текста.';

export const useChatCompletion = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedModel } = useModelSelection();

  const generateText = async (
    prompt: string,
    systemPrompt?: string,
    messageContext?: MessageContext[],
    widgetMode?: boolean
  ): Promise<ChatCompletionResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
          messageContext: messageContext || [],
          model: selectedModel,
          widgetMode: Boolean(widgetMode),
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

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

  const improveText = async (text: string): Promise<ChatCompletionResponse> => {
    return generateText(text, IMPROVE_TEXT_PROMPT);
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
