
import { useState } from 'react';
import { supabase } from "@/lib/client-supabase";
import { useModelSelection } from "./useModelSelection";

interface YandexGPTResponse {
  text: string;
  usage?: {
    inputTextTokens: string;
    completionTokens: string;
    totalTokens: string;
  };
  error?: string;
}

interface MessageContext {
  role: string;
  text: string;
}

export const useYandexGPT = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedModel } = useModelSelection();

  const generateText = async (
    prompt: string, 
    systemPrompt?: string,
    messageContext?: MessageContext[]
  ): Promise<YandexGPTResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt,
          systemPrompt: systemPrompt || 'Ты профессиональный копирайтер. Твоя задача - создавать интересный и привлекательный контент для блога.',
          messageContext: messageContext || [],
          model: selectedModel // Передаем выбранную модель в edge функцию
        }
      });

      if (error) throw new Error(error.message);
      
      if (!data || !data.text) {
        throw new Error('Не удалось получить текст из ответа API');
      }

      return {
        text: data.text,
        usage: data.usage
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
