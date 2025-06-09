"use client"
import { useParams } from "next/navigation";
import { ChatInterface } from "@/app/components/chat/ChatInterface";
import { ChatList } from "@/app/components/chat/ChatList";
import { Container } from "@/app/components/ui/container";
import { Separator } from "@/app/components/ui/separator";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import { Toaster } from "@/app/components/ui/toaster";

const ChatPage = () => {
  const { slug: chatId } = useParams<{ slug: string }>();
  const { user, loading: isAuthLoading } = useAuth();

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
    <>
      <Toaster />
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
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Выберите чат или создайте новый
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default ChatPage;