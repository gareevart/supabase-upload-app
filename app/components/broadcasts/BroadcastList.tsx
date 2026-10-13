"use client";

import React from 'react';
import { Card, Text, Button, Icon } from '@gravity-ui/uikit';
import { Pencil, TrashBin, ArrowUturnCwLeft, Plus, ChevronRight } from '@gravity-ui/icons';
import { Broadcast, BroadcastListProps } from './types';
import './BroadcastList.css';

const BroadcastList: React.FC<BroadcastListProps> = ({
  broadcasts,
  onView,
  onEdit,
  onDelete,
  onSend,
  onSchedule,
  onCancelSchedule,
}) => {
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'broadcast-list__status-badge--draft';
      case 'scheduled':
        return 'broadcast-list__status-badge--scheduled';
      case 'sending':
        return 'broadcast-list__status-badge--sending';
      case 'sent':
        return 'broadcast-list__status-badge--sent';
      case 'failed':
        return 'broadcast-list__status-badge--failed';
      default:
        return 'broadcast-list__status-badge--draft';
    }
  };

  // Render actions based on broadcast status
  const renderActions = (broadcast: Broadcast) => {
    const { id, status } = broadcast;

    switch (status) {
      case 'draft':
        return (
          <>
            <Button
              view="flat-danger"
              size="m"
              onClick={() => onDelete && onDelete(id)}
              title="Delete"
            >
              <Icon data={TrashBin} size={16} />
            </Button>
            <Button
              view="flat"
              size="m"
              onClick={() => onEdit && onEdit(id)}
              title="Edit"
            >
              <Icon data={Pencil} size={16} />
            </Button>
            <Button
              view="flat"
              size="m"
              onClick={() => onSend && onSend(id)}
              title="Send"
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
            </Button>          
          </>
        );
      case 'scheduled':
        return (
          <>
            <Button
              view="flat"
              size="m"
              onClick={() => onCancelSchedule && onCancelSchedule(id)}
              title="Cancel Schedule"
            >
              <Icon data={ChevronRight} size={16} />
            </Button>
            <Button
              view="flat"
              size="m"
              onClick={() => onSend && onSend(id)}
              title="Send Now"
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
            </Button>
          </>
        );
      case 'sent':
        return (
          <>
             <Button
              view="flat-danger"
              size="m"
              onClick={() => onDelete && onDelete(id)}
              title="Delete"
            >
              <Icon data={TrashBin} size={16} />
            </Button>
            <Button
              view="flat"
              size="m"
              onClick={() => onView && onView(id)}
              title="View Details"
            >
              <Icon data={ChevronRight} size={16} />
            </Button>
          </>
        );
      case 'failed':
        return (
          <>
            <Button
              view="flat"
              size="m"
              onClick={() => onDelete && onDelete(id)}
              title="Delete"
            >
              <Icon data={TrashBin} size={16} />
            </Button>
            <Button
              view="flat"
              size="m"
              onClick={() => onSend && onSend(id)}
              title="Retry"
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  if (broadcasts.length === 0) {
    return (
      <Card className="broadcast-list__empty">
        <Text variant="subheader-2">No broadcasts found</Text>
        <Button
          view="action"
          size="m"
          className="broadcast-list__empty-button"
          onClick={() => onEdit && onEdit('new')}
        >
          <Icon data={Plus} size={16} />
          Create New Broadcast
        </Button>
      </Card>
    );
  }

  return (
    <div className="broadcast-list">
      {broadcasts.map((broadcast) => (
        <Card key={broadcast.id} className="broadcast-list__card">
          <div className="broadcast-list__card-inner">
            <div className="broadcast-list__card-info">
              <div className="broadcast-list__card-title">
                <Text variant="subheader-2">{broadcast.subject}</Text>
                <span className={`broadcast-list__status-badge ${getStatusColor(broadcast.status)}`}>
                  {broadcast.status}
                </span>
              </div>
              
              <div className="broadcast-list__card-meta">
                <div>Recipients: {broadcast.total_recipients}</div>
                {broadcast.status === 'sent' && (
                  <div className="broadcast-list__card-stats">
                    <div>Opened: {broadcast.opened_count ?? 0} ({Math.round(((broadcast.opened_count ?? 0) / broadcast.total_recipients) * 100)}%)</div>
                    <div>Clicked: {broadcast.clicked_count ?? 0} ({Math.round(((broadcast.clicked_count ?? 0) / broadcast.total_recipients) * 100)}%)</div>
                  </div>
                )}
                {broadcast.status === 'scheduled' && (
                  <div>Scheduled for: {formatDate(broadcast.scheduled_for)}</div>
                )}
                {broadcast.status === 'sent' && (
                  <div>Sent at: {formatDate(broadcast.sent_at)}</div>
                )}
              </div>
            </div>
            
            <div className="broadcast-list__card-actions">
              {renderActions(broadcast)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default BroadcastList;