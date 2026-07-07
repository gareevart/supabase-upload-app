"use client";

import { Skeleton } from "@gravity-ui/uikit";
import { ActionBar } from "@gravity-ui/navigation";
import "./page.css";

const LIST_SKELETON_COUNT = 5;

export function ChatHistoryPageSkeleton() {
  return (
    <div className="chat-history-page">
      <div className="chat-history-page__actionbar">
        <ActionBar aria-label="Loading">
          <ActionBar.Section style={{ columnGap: 20, gap: 20 }}>
            <ActionBar.Group stretchContainer style={{ minWidth: 0 }}>
              <ActionBar.Item style={{ minWidth: 0, width: "100%" }}>
                <Skeleton className="chat-history-page__skeleton-breadcrumbs" />
              </ActionBar.Item>
            </ActionBar.Group>
          </ActionBar.Section>
        </ActionBar>
      </div>

      <main className="chat-history-page__main">
        <div className="chat-history-page__header">
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
