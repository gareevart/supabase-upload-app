"use client";

import { redirect } from "next/navigation";
import { Button, Icon, Text } from "@gravity-ui/uikit";
import { Plus } from "@gravity-ui/icons";
import { useAuth } from "@/app/contexts/AuthContext";
import { useI18n } from "@/app/contexts/I18nContext";
import { useChats } from "@/hooks/useChats";
import { useCreateChat } from "@/hooks/useCreateChat";
import { ChatList } from "@/app/components/chat/ChatList";
import { ChatHistoryPageSkeleton } from "./ChatHistoryPageSkeleton";
import "./page.css";

export default function ChatHistoryPage() {
  const { user, loading: isAuthLoading } = useAuth();
  const { isLoading: isChatsLoading } = useChats();
  const { t } = useI18n();
  const { handleCreateChat, createChat } = useCreateChat();

  if (isAuthLoading || (user && isChatsLoading)) {
    return <ChatHistoryPageSkeleton />;
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  return (
    <div className="chat-history-page">
      <main className="hub-page__main chat-history-page__main">
        <div className="hub-page__header chat-history-page__header">
          <Text as="h1" variant="display-1" className="chat-history-page__title">
            {t("chatView.historyTitle")}
          </Text>
          <Button
            size="m"
            onClick={handleCreateChat}
            loading={createChat.isPending}
          >
            <Icon data={Plus} size={16} />
            {t("chatView.breadcrumbNewChat")}
          </Button>
        </div>
        <ChatList showTitle={false} showCreateButton={false} />
      </main>
    </div>
  );
}
