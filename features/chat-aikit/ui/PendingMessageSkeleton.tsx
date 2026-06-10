"use client";

import { Skeleton, Spin, Text } from "@gravity-ui/uikit";
import { useI18n } from "@/app/contexts/I18nContext";
import "./PendingMessageSkeleton.css";

export type PendingMessageSkeletonData = {
  variant: 'widget' | 'text';
};

// Placeholder assistant message shown while the model is generating a
// response; the 'widget' variant mimics the widget preview card layout.
export function PendingMessageSkeleton({ variant }: PendingMessageSkeletonData) {
  const { t } = useI18n();

  if (variant === 'text') {
    return (
      <div className="pending-message-skeleton" aria-live="polite">
        <Skeleton className="pending-message-skeleton__line" />
        <Skeleton className="pending-message-skeleton__line pending-message-skeleton__line--short" />
      </div>
    );
  }

  return (
    <div className="pending-message-skeleton pending-message-skeleton--widget" aria-live="polite">
      <div className="pending-message-skeleton__status">
        <Spin size="xs" />
        <Text variant="body-2" color="secondary">
          {t('aikitChat.generatingWidget')}
        </Text>
      </div>
      <Skeleton className="pending-message-skeleton__title" />
      <Skeleton className="pending-message-skeleton__canvas" />
      <div className="pending-message-skeleton__actions">
        <Skeleton className="pending-message-skeleton__button" />
        <Skeleton className="pending-message-skeleton__button" />
      </div>
    </div>
  );
}
