"use client";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { Spin } from "@gravity-ui/uikit";
import { useEffect, useRef } from "react";
import "./chat-page.css";

const ChatPage = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const { chats, isLoading: isChatsLoading, createChat } = useChats();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt")?.trim();
  const isRedirecting = useRef(false);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    if (isRedirecting.current || isChatsLoading) {
      return;
    }

    const redirectToChat = async () => {
      const chatUrl = (chatId: string) =>
        prompt ? `/chat/${chatId}?prompt=${encodeURIComponent(prompt)}` : `/chat/${chatId}`;

      if (chats && chats.length > 0) {
        isRedirecting.current = true;
        router.push(chatUrl(chats[0].id));
      } else {
        try {
          isRedirecting.current = true;
          const newChat = await createChat.mutateAsync();
          if (newChat && newChat.id) {
            router.push(chatUrl(newChat.id));
          }
        } catch (error) {
          console.error("Failed to create chat:", error);
          isRedirecting.current = false;
        }
      }
    };

    redirectToChat();
  }, [user, isAuthLoading, chats, isChatsLoading, router, createChat, prompt]);

  return (
    <div className="chat-page-loading">
      <Spin size="m" />
    </div>
  );
};

export default ChatPage;
