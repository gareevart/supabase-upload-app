
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/client-supabase";
import { useChatCompletion } from "@/hooks/useChatCompletion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Message {
  id?: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
  metadata?: {
    sources?: {
      title: string;
      slug?: string;
      url?: string;
      snippet?: string;
      type?: "blog" | "web";
    }[];
    /** Token usage of the assistant reply; `totalTokens` is the context size after it */
    usage?: {
      totalTokens: number;
    };
  };
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  tokens_used?: number;
}

export const useChat = (chatId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMessageSending, setIsMessageSending] = useState(false);
  const { generateText, isGenerating: isAssistantTyping, generateChatTitle } = useChatCompletion();

  const {
    data: chat,
    isLoading: isChatLoading,
    error: chatError,
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();

      if (error) throw error;
      return data as ChatSession | null;
    },
    enabled: !!chatId,
  });

  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!chatId,
  });

  const updateSystemPrompt = useMutation({
    mutationFn: async (systemPrompt: string) => {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ system_prompt: systemPrompt })
        .eq("id", chatId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      toast({
        title: "Настройки сохранены",
        description: "Системная роль чата обновлена",
      });
    },
    onError: (error) => {
      console.error("Error updating system prompt:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить системную роль",
        variant: "destructive",
      });
    },
  });

  const updateChatTitle = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", chatId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      console.error("Error updating chat title:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить заголовок чата",
        variant: "destructive",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      attachments,
      useWidgetMode
    }: {
      content: string;
      attachments?: FileAttachment[];
      useWidgetMode?: boolean;
    }) => {
      setIsMessageSending(true);
      try {
        // Analyze images/files before sending
        let enrichedContent = content;

        if (attachments && attachments.length > 0) {
          // Process each attachment
          const fileDescriptions = await Promise.all(
            attachments.map(async (file) => {
              // Images are not analyzed: the text model does not accept image input
              if (file.type.startsWith('image/')) {
                return `[Изображение: ${file.name} - изображение прикреплено, но анализ изображений недоступен]`;
              }

              // Check if it's a PDF
              if (file.type === 'application/pdf') {
                try {
                  // Call PDF analysis API
                  const { data: { session } } = await supabase.auth.getSession();
                  const response = await fetch('/api/analyze-pdf', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                      pdfUrl: file.url,
                      fileName: file.name,
                    }),
                  });

                  if (response.ok) {
                    const analysis = await response.json();
                    console.log('PDF analysis response:', {
                      success: analysis.success,
                      hasDescription: !!analysis.description,
                      descriptionLength: analysis.description?.length,
                      pageCount: analysis.pageCount
                    });

                    if (analysis.success && analysis.description && analysis.description.trim()) {
                      return analysis.description;
                    } else {
                      console.warn('No valid description in PDF analysis result');
                    }
                  } else {
                    console.error('PDF analysis failed:', await response.text());
                  }
                } catch (error) {
                  console.error('Error analyzing PDF:', error);
                }
                // Fallback for PDFs if analysis fails
                return `[Файл: ${file.name} - PDF документ прикреплен, но анализ текста недоступен]`;
              }

              // Check if it's a Word document (.docx)
              if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.name.endsWith('.docx')) {
                try {
                  // Call document analysis API
                  const { data: { session } } = await supabase.auth.getSession();
                  const response = await fetch('/api/analyze-document', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                      documentUrl: file.url,
                      fileName: file.name,
                      fileType: file.type,
                    }),
                  });

                  if (response.ok) {
                    const analysis = await response.json();
                    console.log('Document analysis response:', {
                      success: analysis.success,
                      hasDescription: !!analysis.description,
                      descriptionLength: analysis.description?.length
                    });

                    if (analysis.success && analysis.description && analysis.description.trim()) {
                      return analysis.description;
                    } else {
                      console.warn('No valid description in document analysis result');
                    }
                  } else {
                    console.error('Document analysis failed:', await response.text());
                  }
                } catch (error) {
                  console.error('Error analyzing document:', error);
                }
                // Fallback for Word documents if analysis fails
                return `[Файл: ${file.name} - Word документ прикреплен, но анализ текста недоступен]`;
              }

              // Check if it's an old .doc file
              if (file.type === 'application/msword' || file.name.endsWith('.doc')) {
                return `[Файл: ${file.name} - старый формат .doc не поддерживается. Пожалуйста, конвертируйте в .docx]`;
              }

              // For other files, just mention them
              return `[Файл: ${file.name} (${file.type})]`;
            })
          );

          // Filter out any undefined/null values
          const validDescriptions = fileDescriptions.filter(desc => desc && desc.trim());

          console.log('File processing result:', {
            attachmentsCount: attachments.length,
            descriptionsCount: fileDescriptions.length,
            validDescriptionsCount: validDescriptions.length,
            validDescriptions: validDescriptions
          });

          // Add file analysis to message content for AI (compact format)
          if (validDescriptions.length > 0) {
            enrichedContent = content.trim()
              ? `${content}\n\n${validDescriptions.join('\n')}`
              : validDescriptions.join('\n');
          } else if (!content.trim()) {
            // If no content and no valid descriptions, add a default message
            enrichedContent = '[Прикреплены файлы, но их содержимое не может быть проанализировано]';
          }
        }

        console.log('Enriched content for the model:', {
          originalContent: content,
          enrichedContent: enrichedContent.substring(0, 200),
          enrichedContentLength: enrichedContent.length,
          isEmpty: !enrichedContent.trim()
        });

        // Add user message to the database with ORIGINAL content
        // (user doesn't need to see technical image analysis)
        const userMessage: Message = {
          chat_id: chatId,
          role: "user",
          content: content || '[Изображение]', // Save original message, not enriched
          attachments: attachments || [],
        };

        const { data: savedMessage, error: userMessageError } = await supabase
          .from("chat_messages")
          .insert([userMessage])
          .select()
          .single();

        if (userMessageError) throw userMessageError;

        // Get the message history for context - limit to last 10 messages for token efficiency
        // For previous messages with attachments, we need to reconstruct enriched content
        const messageHistory = messages
          .slice(-10)
          .map(msg => {
            // If message has attachments, add their info to context for AI
            if (msg.attachments && msg.attachments.length > 0) {
              const fileInfo = msg.attachments
                .map(f => f.type.startsWith('image/')
                  ? `[Прикреплено изображение: ${f.name}]`
                  : `[Прикреплен файл: ${f.name}]`
                )
                .join(' ');
              return {
                role: msg.role,
                text: msg.content ? `${msg.content} ${fileInfo}` : fileInfo
              };
            }
            return {
              role: msg.role,
              text: msg.content
            };
          });

        // The model requires non-empty text
        if (!enrichedContent.trim()) {
          throw new Error("Сообщение не может быть пустым");
        }

        // Add current message with ENRICHED content for AI understanding
        messageHistory.push({
          role: "user",
          text: enrichedContent
        });

        // Get system prompt from chat settings or use default
        const systemPrompt = chat?.system_prompt || "Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично.";

        const { text, error, usage, metadata } = await generateText(
          enrichedContent,
          systemPrompt,
          messageHistory, // Pass message history for context
          Boolean(useWidgetMode)
        );

        if (error) {
          throw new Error(error);
        }

        // Add AI response to the database
        // Keep the reply's token usage so the chat can show how full the context is
        const replyTotalTokens = Number(usage?.totalTokens) || 0;
        const assistantMessage: Message = {
          chat_id: chatId,
          role: "assistant",
          content: text,
          metadata: {
            ...metadata,
            ...(replyTotalTokens > 0 ? { usage: { totalTokens: replyTotalTokens } } : {}),
          },
        };

        const { error: assistantMessageError } = await supabase
          .from("chat_messages")
          .insert([assistantMessage]);

        if (assistantMessageError) throw assistantMessageError;

        // Atomically increment token counter via RPC to avoid lost-update race conditions
        const newTokens = usage ? parseInt(usage.totalTokens) : 0;

        const { error: updateError } = await supabase
          .rpc('increment_chat_tokens', { chat_id: chatId, amount: newTokens }) as { error: { message: string } | null };

        if (updateError) throw updateError;

        // If the chat title is "Новый чат", generate a new title based on the conversation
        if (chat?.title === "Новый чат" && messages.length <= 1) {
          const allMessages = [...messages, userMessage, assistantMessage].map(msg => ({
            role: msg.role,
            text: msg.content
          }));

          const newTitle = await generateChatTitle(allMessages);

          if (newTitle && newTitle !== "Новый чат") {
            updateChatTitle.mutate(newTitle);
          }
        }

        return { userMessage: savedMessage, assistantMessage, usage };
      } finally {
        setIsMessageSending(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  const isLoading = isChatLoading || isMessagesLoading;
  const error = chatError || messagesError;

  return {
    chat,
    messages,
    isLoading,
    error,
    sendMessage,
    updateSystemPrompt,
    updateChatTitle,
    isMessageSending,
    isAssistantTyping,
  };
};
