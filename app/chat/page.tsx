"use client"
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import { useCreateChat } from "@/hooks/useCreateChat";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import {Toaster, Button, Text, ToasterProvider, Spin, Icon} from '@gravity-ui/uikit';
import {Plus} from '@gravity-ui/icons';

const ChatPage = () => {
  const toaster = new Toaster();
  const { user, loading: isAuthLoading } = useAuth();
  const { handleCreateChat, createChat } = useCreateChat();

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
    <ToasterProvider toaster={toaster}>  
      <ChatLayout>
        <div className="chat-interface-container">
          <div className="chat-empty-state">
            <Text variant="header-1">Привет!</Text>
            <p>Выбери существующий чат из списка или создайте новый, чтобы начать общение с ассистентом.</p>
            <Button
              view="action"
              size="l"
              onClick={handleCreateChat}
              disabled={createChat.isPending}
              title="Создать новый чат"
            >
              {createChat.isPending ? (
                <Spin size="xs"/>
              ) : (
                <Icon data={Plus} size={16} />
              )}
              Создать новый чат
            </Button>
          </div>
        </div>
      </ChatLayout>
    </ToasterProvider>  
  );
};

export default ChatPage;
