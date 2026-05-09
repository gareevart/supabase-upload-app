"use client";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect, useRouter } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { Spin } from "@gravity-ui/uikit";
import { useEffect, useRef } from "react";

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
      <div className="flex items-center justify-center h-screen">
        <Spin size="m" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("returnUrl", "/chat");
    }
    redirect("/auth");
    return null;
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Spin size="m" />
    </div>
  );
};

export default ChatPage;
