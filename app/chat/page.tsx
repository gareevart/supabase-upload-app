"use client"
import { useParams } from "next/navigation";
import { ChatInterface } from "@/app/components/chat/ChatInterface";
import { ChatList } from "@/app/components/chat/ChatList";
import { Container } from "@/app/components/ui/container";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import { useCreateChat } from "@/hooks/useCreateChat";
import {Toaster, Button, Text, ToasterComponent, ToasterProvider, Spin, Icon} from '@gravity-ui/uikit';
import {Plus} from '@gravity-ui/icons';

const ChatPage = () => {
  const toaster = new Toaster();
  const { chatId } = useParams<{ chatId: string }>();
  const { user, loading: isAuthLoading } = useAuth();
  const { handleCreateChat, createChat } = useCreateChat();

  if (isAuthLoading) {
    return (
      <Container>
        <div className="py-8 text-center">Загрузка...</div>
      </Container>
    );
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  return (
    <ToasterProvider toaster={toaster}>  
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <ChatList />
            </div>
            <div className="md:col-span-3 border rounded-lg h-[70vh]">
              {chatId ? (
                <ChatInterface chatId={chatId} />
              ) : (
                <div className="flex flex-column center-container h-full">
                  <Text variant="header-1">Выберите чат или создайте новый</Text>
                  
                    <Button
                    view="action"
                    size="m"
                    onClick={handleCreateChat}
                    disabled={createChat.isPending}
                    title="Создать новый чат"
                    >
                    {createChat.isPending ? (
                    <Spin size="xs"/>
                    ) : (
                    <Icon data={Plus} size={16} />
                    )}
                    Создать чат
                    </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </ToasterProvider>  
  );
};

export default ChatPage;
