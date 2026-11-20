"use client";

import { Skeleton } from "@gravity-ui/uikit";
import { PageActionBar } from "@/shared/ui/PageActionBar";
import { useI18n } from "@/app/contexts/I18nContext";
import "./page.css";

const LIST_SKELETON_COUNT = 5;

export function ChatHistoryPageSkeleton() {
  const { t } = useI18n();

  return (
    <div className="chat-history-page">
      <PageActionBar
        ariaLabel={t("chatView.chatActions")}
        breadcrumbs={<Skeleton className="page-action-bar__skeleton" />}
      />

      <main className="hub-page__main chat-history-page__main">
        <div className="hub-page__header chat-history-page__header">
          <Skeleton className="chat-history-page__skeleton-title" />
          <Skeleton className="chat-history-page__skeleton-create-button" />
        </div>
        <div className="chat-history-page__skeleton-list">
          {Array.from({ length: LIST_SKELETON_COUNT }, (_, index) => (
            <Skeleton
              key={`chat-history-skeleton-${index}`}
              className="chat-history-page__skeleton-list-item"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
