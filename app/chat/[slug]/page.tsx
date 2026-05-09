"use client";
import { useParams, redirect } from "next/navigation";
import { Spin } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { AikitChatPanel } from "@/features/chat-aikit/ui";

const ChatPage = () => {
  const params = useParams<{ slug: string }>();
  const chatId = params?.slug;
  const { user, loading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
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
      <div className="flex items-center justify-center h-screen">
        <p>Чат не найден</p>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 60px)", overflow: "hidden" }}>
      <AikitChatPanel chatId={chatId} />
    </div>
  );
};

export default ChatPage;
