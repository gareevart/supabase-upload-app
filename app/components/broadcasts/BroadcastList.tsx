"use client";

import React from 'react';
import { Card, Text, Button, Icon } from '@gravity-ui/uikit';
import { Pencil, TrashBin, ArrowUturnCwLeft, Plus, ChevronRight } from '@gravity-ui/icons';
import { Broadcast, BroadcastListProps } from './types';

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
        return 'bg-gray-200 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <Card className="flex flex-col gap-2 p-6 text-center">
        <Text variant="subheader-2">No broadcasts found</Text>
        <Button
          view="action"
          size="m"
          className="mt-4"
          onClick={() => onEdit && onEdit('new')}
        >
          <Icon data={Plus} size={16} />
          Create New Broadcast
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {broadcasts.map((broadcast) => (
        <Card key={broadcast.id} className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Text variant="subheader-2">{broadcast.subject}</Text>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(broadcast.status)}`}>
                  {broadcast.status}
                </span>
              </div>
              
              <div className="mt-1 text-sm text-gray-500">
                <div>Recipients: {broadcast.total_recipients}</div>
                {broadcast.status === 'sent' && (
                  <div className="flex gap-4">
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
            
            <div className="flex gap-2 self-end md:self-center">
              {renderActions(broadcast)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default BroadcastList;