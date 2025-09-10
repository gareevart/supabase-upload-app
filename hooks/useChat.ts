
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/client-supabase";
import { useYandexGPT } from "@/hooks/useYandexGPT";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export interface Message {
  id?: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
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
  const { generateText, isGenerating: isAssistantTyping, generateChatTitle } = useYandexGPT();

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
        .single();

      if (error) throw error;
      return data as ChatSession;
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
    mutationFn: async (content: string) => {
      setIsMessageSending(true);
      try {
        // Add user message to the database
        const userMessage: Message = {
          chat_id: chatId,
          role: "user",
          content,
        };

        const { data: savedMessage, error: userMessageError } = await supabase
          .from("chat_messages")
          .insert([userMessage])
          .select()
          .single();

        if (userMessageError) throw userMessageError;

        // Get the message history for context - limit to last 10 messages for token efficiency
        const messageHistory = messages
          .slice(-10)
          .map(msg => ({
            role: msg.role,
            text: msg.content
          }));
          
        // Add current user message to context
        messageHistory.push({
          role: "user",
          text: content
        });

        // Get system prompt from chat settings or use default
        const systemPrompt = chat?.system_prompt || "Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично.";
        
        // Create a temporary reasoning message to show thinking process
        let reasoningMessageId: string | null = null;
        
        const { text, error, usage } = await generateText(
          content, 
          systemPrompt,
          messageHistory, // Pass message history for context
          (reasoningChunk: string) => {
            // Handle reasoning chunks in real-time
            console.log('Reasoning chunk:', reasoningChunk);
            // TODO: Update UI with reasoning chunks
          }
        );

        if (error) {
          throw new Error(error);
        }

        // Add AI response to the database
        const assistantMessage: Message = {
          chat_id: chatId,
          role: "assistant",
          content: text,
        };

        const { error: assistantMessageError } = await supabase
          .from("chat_messages")
          .insert([assistantMessage]);

        if (assistantMessageError) throw assistantMessageError;

        // Update chat timestamp and token usage
        const currentTokensUsed = chat?.tokens_used || 0;
        const newTokens = usage ? parseInt(usage.totalTokens) : 0;
        
        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update({ 
            updated_at: new Date().toISOString(),
            tokens_used: currentTokensUsed + newTokens
          })
          .eq("id", chatId);

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
