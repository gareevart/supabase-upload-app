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
            <Text variant="header-1">Hello, Bro!</Text>
            <Text variant="body-2" className="pt-1 pb-4">Select an existing or create a new chat to start communicating with the AI assistant</Text>
            <Button
              view="action"
              size="l"
              onClick={handleCreateChat}
              disabled={createChat.isPending}
              title="Create new"
            >
              {createChat.isPending ? (
                <Spin size="xs"/>
              ) : (
                <Icon data={Plus} size={16} />
              )}
              Create new chat
            </Button>
          </div>
        </div>
      </ChatLayout>
    </ToasterProvider>  
  );
};

export default ChatPage;
