
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/client-supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/contexts/AuthContext";

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  lastMessage?: string;
}

export const useChats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chats = [], isLoading, error } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching chats:", error);
        throw error;
      }

      // For each chat, get the last message
      const chatsWithLastMessage = await Promise.all(
        data.map(async (chat) => {
          const { data: messages } = await supabase
            .from("chat_messages")
            .select("content, role")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessage = messages && messages.length > 0 
            ? messages[0].role === 'user' 
              ? `Вы: ${messages[0].content}` 
              : `Ассистент: ${messages[0].content}`
            : "Нет сообщений";

          return {
            ...chat,
            lastMessage,
          };
        })
      );

      return chatsWithLastMessage as Chat[];
    },
    enabled: !!user,
  });

  const createChat = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Требуется аутентификация");

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert([{ 
          user_id: user.id,
          title: "Новый чат" // Default title that will be replaced later
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast({
        title: "Чат создан",
        description: "Новый чат успешно создан",
      });
      return newChat;
    },
    onError: (error) => {
      console.error("Error creating chat:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать чат",
        variant: "destructive",
      });
    },
  });

  const updateChatTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast({
        title: "Название обновлено",
        description: "Название чата успешно обновлено",
      });
    },
    onError: (error) => {
      console.error("Error updating chat title:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить название чата",
        variant: "destructive",
      });
    },
  });

  const deleteChat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast({
        title: "Чат удален",
        description: "Чат успешно удален",
      });
    },
    onError: (error) => {
      console.error("Error deleting chat:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить чат",
        variant: "destructive",
      });
    },
  });

  return {
    chats,
    isLoading,
    error,
    createChat,
    updateChatTitle,
    deleteChat,
  };
};
