"use client";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { Spin } from "@gravity-ui/uikit";
import { useEffect, useRef } from "react";
import "./chat-page.css";
import { GuestChatPanel } from "@/features/chat-aikit/ui/GuestChatPanel";

const ChatPage = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const { chats, isLoading: isChatsLoading, createChat } = useChats();
  const router = useRouter();
  const isRedirecting = useRef(false);

  useEffect(() => {
    if (isRedirecting.current || isAuthLoading || !user || isChatsLoading) {
      return;
    }

    const redirectToChat = async () => {
      if (chats && chats.length > 0) {
        isRedirecting.current = true;
        router.push(`/chat/${chats[0].id}`);
      } else {
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
      <div className="chat-page-loading">
        <Spin size="m" />
      </div>
    );
  }

  if (!user) return <GuestChatPanel />;

  return (
    <div className="chat-page-loading">
      <Spin size="m" />
    </div>
  );
};

export default ChatPage;
