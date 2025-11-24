/**
 * ChatPage component handles the initial chat routing logic.
 *
 * This component performs the following functions:
 * 1. Checks user authentication status
 * 2. Redirects authenticated users to their most recent chat
 * 3. Creates a new chat for authenticated users with no existing chats
 * 4. Displays appropriate loading states during authentication and chat operations
 *
 * The component uses React hooks for authentication, chat management, and routing.
 * It ensures users are properly directed to an existing or new chat upon visiting the chat page.
 */

"use client"
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect, useRouter } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import { Spin } from '@gravity-ui/uikit';
import { useEffect, useRef } from "react";

const ChatPage = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const { chats, isLoading: isChatsLoading, createChat } = useChats();
  const router = useRouter();
  const isRedirecting = useRef(false);

  useEffect(() => {
    // Пропускаем если уже перенаправляем или загружаемся
    if (isRedirecting.current || isAuthLoading || !user || isChatsLoading) {
      return;
    }

    const redirectToChat = async () => {
      // Проверяем наличие чатов
      if (chats && chats.length > 0) {
        // Перенаправляем на последний чат (первый в списке, так как они отсортированы по updated_at)
        isRedirecting.current = true;
        router.push(`/chat/${chats[0].id}`);
      } else {
        // Создаём новый чат, если чатов нет
        try {
          isRedirecting.current = true;
          const newChat = await createChat.mutateAsync();
          if (newChat && newChat.id) {
            router.push(`/chat/${newChat.id}`);
          }
        } catch (error) {
          console.error("Failed to create chat:", error);
          isRedirecting.current = false;
        }
      }
    };

    redirectToChat();
  }, [user, isAuthLoading, chats, isChatsLoading, router, createChat]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spin size="m" />
          <div className="mt-4">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  // Показываем загрузку во время проверки чатов или создания нового
  return (
    <ChatLayout>
      <div className="chat-interface-container">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spin size="m" />
            <div className="mt-4">Chat loading</div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
};

export default ChatPage;
