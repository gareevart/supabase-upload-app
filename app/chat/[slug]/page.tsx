"use client";
import { useParams, redirect } from "next/navigation";
import { Spin, Text } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { AikitChatPanel } from "@/features/chat-aikit/ui";
import "../chat-page.css";

const ChatPage = () => {
  const params = useParams<{ slug: string }>();
  const chatId = params?.slug;
  const { user, loading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="chat-page-loading">
        <Spin size="m" />
      </div>
    );
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  if (!chatId) {
    return (
      <div className="chat-page-not-found">
        <Text variant="body-1">Чат не найден</Text>
      </div>
    );
  }

  return (
    <div className="aikit-chat-page">
      <AikitChatPanel chatId={chatId} />
    </div>
  );
};

export default ChatPage;
