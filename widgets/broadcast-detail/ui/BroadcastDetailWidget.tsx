"use client";

import React from 'react';
import { Card, Text, Button, Icon, Label, Spin } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, TrashBin, ChevronLeft } from '@gravity-ui/icons';
import { useBroadcastDetail } from '@/features/broadcast-detail/model/useBroadcastDetail';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/app/contexts/I18nContext';
import { markdownToHtml } from '@/app/utils/markdownToHtml';
import './BroadcastDetailWidget.css';

interface BroadcastDetailWidgetProps {
  id: string;
}

type LabelTheme = 'normal' | 'info' | 'warning' | 'success' | 'danger';

const BroadcastDetailWidget: React.FC<BroadcastDetailWidgetProps> = ({ id }) => {
  const router = useRouter();
  const { t } = useI18n();
  const {
    broadcast,
    stats,
    isLoading,
    error,
    deleteBroadcast,
    sendBroadcast,
    cancelSchedule,
  } = useBroadcastDetail(id);

  const handleBack = () => {
    router.push('/broadcasts');
  };

  const handleEdit = (broadcastId: string) => {
    router.push(`/broadcasts/edit/${broadcastId}`);
  };

  const handleDelete = async () => {
    const success = await deleteBroadcast();
    if (success) {
      router.push('/broadcasts');
    }
  };

  const handleSend = async () => {
    await sendBroadcast();
  };

  const handleCancelSchedule = async () => {
    await cancelSchedule();
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Map broadcast status to a themed Gravity UI Label
  const getStatusTheme = (status: string): LabelTheme => {
    switch (status) {
      case 'scheduled':
        return 'info';
      case 'sending':
        return 'warning';
      case 'sent':
        return 'success';
      case 'failed':
        return 'danger';
      case 'draft':
      default:
        return 'normal';
    }
  };

  const getStatusLabel = (status: string) =>
    t(`broadcastDetail.status.${status}`) || status;

  // Render actions based on broadcast status
  const renderActions = () => {
    if (!broadcast) return null;

    const { id: broadcastId, status } = broadcast;

    switch (status) {
      case 'draft':
        return (
          <>
            <Button view="flat" size="m" onClick={() => handleEdit(broadcastId)}>
              <Icon data={Pencil} size={16} />
              {t('broadcastDetail.edit')}
            </Button>
            <Button view="action" size="m" onClick={handleSend}>
              <Icon data={ArrowUturnCwLeft} size={16} />
              {t('broadcastDetail.send')}
            </Button>
            <Button view="outlined-danger" size="m" onClick={handleDelete}>
              <Icon data={TrashBin} size={16} />
              {t('broadcastDetail.delete')}
            </Button>
          </>
        );
      case 'scheduled':
        return (
          <>
            <Button view="outlined" size="m" onClick={handleCancelSchedule}>
              <Icon data={ChevronLeft} size={16} />
              {t('broadcastDetail.cancelSchedule')}
            </Button>
            <Button view="action" size="m" onClick={handleSend}>
              <Icon data={ArrowUturnCwLeft} size={16} />
              {t('broadcastDetail.sendNow')}
            </Button>
          </>
        );
      case 'failed':
        return (
          <>
            <Button view="action" size="m" onClick={handleSend}>
              <Icon data={ArrowUturnCwLeft} size={16} />
              {t('broadcastDetail.retry')}
            </Button>
            <Button view="outlined-danger" size="m" onClick={handleDelete}>
              <Icon data={TrashBin} size={16} />
              {t('broadcastDetail.delete')}
            </Button>
          </>
        );
      case 'sent':
      default:
        return null;
    }
  };

  // Parse content for display
  const getContentHtml = () => {
    if (!broadcast) return t('broadcastDetail.noContent');

    try {
      if (broadcast.content_html) {
        return broadcast.content_html;
      }
      return markdownToHtml(typeof broadcast.content === 'string' ? broadcast.content : '');
    } catch (e) {
      console.error('Error displaying content:', e);
      return t('broadcastDetail.noContent');
    }
  };

  if (isLoading) {
    return (
      <div className="broadcast-detail__state">
        <Spin size="l" />
        <Text variant="body-1" color="secondary">
          {t('broadcastDetail.loading')}
        </Text>
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="broadcast-detail__state">
        <Text variant="body-1" color="danger">
          {error || t('broadcastDetail.notFound')}
        </Text>
        <Button view="normal" size="l" onClick={handleBack}>
          {t('broadcastDetail.backToList')}
        </Button>
      </div>
    );
  }

  const recipients = broadcast.recipients ?? [];

  return (
    <div className="broadcast-detail">
      {/* Header */}
      <div className="broadcast-detail__header">
        <div className="broadcast-detail__header-main">
          <Button view="outlined" size="m" onClick={handleBack}>
            <Icon data={ChevronLeft} size={16} />
            {t('broadcastDetail.back')}
          </Button>
          <Text variant="display-1">{t('broadcastDetail.title')}</Text>
        </div>
        <div className="broadcast-detail__actions">{renderActions()}</div>
      </div>

      {/* Summary Card */}
      <Card view="outlined" className="broadcast-detail__card">
        <div className="broadcast-detail__summary-top">
          <Text variant="subheader-2">{broadcast.subject}</Text>
          <Label theme={getStatusTheme(broadcast.status)} size="m">
            {getStatusLabel(broadcast.status)}
          </Label>
        </div>

        <div className="broadcast-detail__meta-grid">
          <div className="broadcast-detail__meta-item">
            <Text variant="body-2" color="secondary">
              {t('broadcastDetail.recipients')}
            </Text>
            <Text variant="body-1">
              {broadcast.total_recipients || recipients.length || 0}
            </Text>
          </div>

          {broadcast.status === 'scheduled' && (
            <div className="broadcast-detail__meta-item">
              <Text variant="body-2" color="secondary">
                {t('broadcastDetail.scheduledFor')}
              </Text>
              <Text variant="body-1">{formatDate(broadcast.scheduled_for)}</Text>
            </div>
          )}

          {broadcast.status === 'sent' && (
            <div className="broadcast-detail__meta-item">
              <Text variant="body-2" color="secondary">
                {t('broadcastDetail.sentAt')}
              </Text>
              <Text variant="body-1">{formatDate(broadcast.sent_at || null)}</Text>
            </div>
          )}

          <div className="broadcast-detail__meta-item">
            <Text variant="body-2" color="secondary">
              {t('broadcastDetail.createdAt')}
            </Text>
            <Text variant="body-1">{formatDate(broadcast.created_at)}</Text>
          </div>

          <div className="broadcast-detail__meta-item">
            <Text variant="body-2" color="secondary">
              {t('broadcastDetail.updatedAt')}
            </Text>
            <Text variant="body-1">{formatDate(broadcast.updated_at)}</Text>
          </div>

          {/* Stats for sent broadcasts */}
          {broadcast.status === 'sent' && stats && (
            <div className="broadcast-detail__stats">
              <Text variant="subheader-1">{t('broadcastDetail.statistics')}</Text>

              <div className="broadcast-detail__stats-row">
                <div className="broadcast-detail__stat">
                  <Text variant="body-2" color="secondary">
                    {t('broadcastDetail.openRate')}
                  </Text>
                  <Text variant="display-2">{stats.openRate}%</Text>
                </div>

                <div className="broadcast-detail__stat">
                  <Text variant="body-2" color="secondary">
                    {t('broadcastDetail.clickRate')}
                  </Text>
                  <Text variant="display-2">{stats.clickRate}%</Text>
                </div>
              </div>

              <div className="broadcast-detail__stats-row">
                <div className="broadcast-detail__stat">
                  <Text variant="caption-2" color="secondary">
                    {t('broadcastDetail.opened')}
                  </Text>
                  <Text variant="body-1">
                    {stats.opened}/{stats.total}
                  </Text>
                </div>

                <div className="broadcast-detail__stat">
                  <Text variant="caption-2" color="secondary">
                    {t('broadcastDetail.clicked')}
                  </Text>
                  <Text variant="body-1">
                    {stats.clicked}/{stats.total}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Content Preview */}
      <Card view="outlined" className="broadcast-detail__card">
        <Text variant="subheader-2" className="broadcast-detail__card-title">
          {t('broadcastDetail.emailContent')}
        </Text>
        <div
          className="broadcast-detail__content"
          dangerouslySetInnerHTML={{ __html: getContentHtml() }}
        />
      </Card>

      {/* Recipients List */}
      <Card view="outlined" className="broadcast-detail__card">
        <Text variant="subheader-2" className="broadcast-detail__card-title">
          {t('broadcastDetail.recipientsList')} ({recipients.length})
        </Text>
        <div className="broadcast-detail__recipients">
          {recipients.map((email, index) => (
            <Label key={index} theme="clear" size="m">
              {email}
            </Label>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BroadcastDetailWidget;
