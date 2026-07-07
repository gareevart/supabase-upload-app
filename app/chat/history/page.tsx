"use client";

import { redirect } from "next/navigation";
import { Breadcrumbs, Button, Icon, Text } from "@gravity-ui/uikit";
import { Plus } from "@gravity-ui/icons";
import { ActionBar } from "@gravity-ui/navigation";
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
      <div className="chat-history-page__actionbar">
        <ActionBar aria-label={t("chatView.chatActions")}>
          <ActionBar.Section style={{ columnGap: 20, gap: 20 }}>
            <ActionBar.Group stretchContainer style={{ minWidth: 0 }}>
              <ActionBar.Item style={{ minWidth: 0, width: "100%" }}>
                <Breadcrumbs
                  className="chat-history-page__breadcrumbs"
                  maxItems={3}
                >
                  <Breadcrumbs.Item href="/">
                    {t("chatView.breadcrumbHome")}
                  </Breadcrumbs.Item>
                  <Breadcrumbs.Item href="/chat/history">
                    {t("chatView.breadcrumbChat")}
                  </Breadcrumbs.Item>
                  <Breadcrumbs.Item href="/chat/history">
                    {t("chatView.breadcrumbHistory")}
                  </Breadcrumbs.Item>
                </Breadcrumbs>
              </ActionBar.Item>
            </ActionBar.Group>
          </ActionBar.Section>
        </ActionBar>
      </div>

      <main className="chat-history-page__main">
        <div className="chat-history-page__header">
          <Text as="h1" variant="header-1" className="chat-history-page__title">
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
