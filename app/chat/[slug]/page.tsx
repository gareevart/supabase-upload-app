"use client"
import { useParams } from "next/navigation";
import { ChatInterface } from "@/app/components/chat/ChatInterface";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import { Toaster } from "@/app/components/ui/toaster";
import { Spin } from "@gravity-ui/uikit";

const ChatPage = () => {
  const { slug: chatId } = useParams<{ slug: string }>();
  const { user, loading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spin size="m" />
          <div className="mt-4">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  return (
    <>
      <Toaster />
      <ChatLayout>
        <div className="chat-interface-container">
          {chatId ? (
            <ChatInterface chatId={chatId} />
          ) : (
            <div className="chat-empty-state">
              <h2>Чат не найден</h2>
              <p>Выберите существующий чат из списка или создайте новый.</p>
            </div>
          )}
        </div>
      </ChatLayout>
    </>
  );
};

export default ChatPage;