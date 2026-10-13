"use client";

import React from 'react';
import { Card, Text, Button, Icon } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, TrashBin, ChevronDown } from '@gravity-ui/icons';
import { BroadcastDetailProps, BroadcastStats } from './types';
import { markdownToHtml } from '@/app/utils/markdownToHtml';
import './BroadcastDetail.css';

const BroadcastDetail: React.FC<BroadcastDetailProps> = ({
  broadcast,
  stats,
  onBack,
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
        return 'broadcast-detail__status-badge--draft';
      case 'scheduled':
        return 'broadcast-detail__status-badge--scheduled';
      case 'sending':
        return 'broadcast-detail__status-badge--sending';
      case 'sent':
        return 'broadcast-detail__status-badge--sent';
      case 'failed':
        return 'broadcast-detail__status-badge--failed';
      default:
        return 'broadcast-detail__status-badge--draft';
    }
  };

  // Render actions based on broadcast status
  const renderActions = () => {
    const { id, status } = broadcast;

    switch (status) {
      case 'draft':
        return (
          <>
            <Button
              view="flat"
              size="m"
              onClick={() => onEdit && onEdit(id)}
            >
              <Icon data={Pencil} size={16} />
              Edit
            </Button>
            <Button
              view="action"
              size="m"
              onClick={() => onSend && onSend(id)}
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
              Send
            </Button>
            <Button
              view="outlined"
              size="m"
              onClick={() => onDelete && onDelete(id)}
            >
              <Icon data={TrashBin} size={16} />
              Delete
            </Button>
          </>
        );
      case 'scheduled':
        return (
          <>
            <Button
              view="outlined"
              size="m"
              onClick={() => onCancelSchedule && onCancelSchedule(id)}
            >
              <Icon data={ChevronDown} size={16} />
              Cancel Schedule
            </Button>
            <Button
              view="action"
              size="m"
              onClick={() => onSend && onSend(id)}
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
              Send Now
            </Button>
          </>
        );
      case 'sent':
        return null;
      case 'failed':
        return (
          <>
            <Button
              view="action"
              size="m"
              onClick={() => onSend && onSend(id)}
            >
              <Icon data={ArrowUturnCwLeft} size={16} />
              Retry
            </Button>
            <Button
              view="outlined"
              size="m"
              onClick={() => onDelete && onDelete(id)}
            >
              <Icon data={TrashBin} size={16} />
              Delete
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  // Parse content for display
  const getContentHtml = () => {
    try {
      // First try to use content_html if available
      if (broadcast.content_html) {
        return broadcast.content_html;
      }
      
      return markdownToHtml(typeof broadcast.content === 'string' ? broadcast.content : '');
    } catch (e) {
      console.error('Error displaying content:', e);
      return 'Error displaying content';
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const total = broadcast.total_recipients || 0;
    const opened = broadcast.opened_count || 0;
    const clicked = broadcast.clicked_count || 0;
    
    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
    const clickRate = total > 0 ? Math.round((clicked / total) * 100) : 0;
    
    return {
      total,
      opened,
      clicked,
      openRate,
      clickRate
    };
  };
  
  // Get stats either from props or calculate them
  const getStats = (): BroadcastStats => {
    if (stats) return stats;
    return calculateStats();
  };

  return (
    <div className="broadcast-detail">
      {/* Header */}
      <div className="broadcast-detail__header">
        <div className="broadcast-detail__header-left">
          <Button
            view="flat"
            size="m"
            onClick={onBack}
          >
            <Icon data={ChevronDown} size={16} />
            Back
          </Button>
          <Text variant="display-1">Broadcast Details</Text>
        </div>
        <div className="broadcast-detail__actions">
          {renderActions()}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="broadcast-detail__summary">
        <div className="broadcast-detail__summary-inner">
          <div className="broadcast-detail__summary-info">
            <Text variant="subheader-1" className="broadcast-detail__subject">
              {broadcast.subject}
              <span className={`broadcast-detail__status-badge ${getStatusColor(broadcast.status)}`}>
                {broadcast.status}
              </span>
            </Text>
            
            <div className="broadcast-detail__meta-grid">
              <div>
                <Text variant="body-2" className="broadcast-detail__meta-label">Recipients</Text>
                <Text variant="body-1">{broadcast.total_recipients || broadcast.recipients?.length || 0}</Text>
              </div>
              
              {broadcast.status === 'scheduled' && (
                <div>
                  <Text variant="body-2" className="broadcast-detail__meta-label">Scheduled For</Text>
                  <Text variant="body-1">{formatDate(broadcast.scheduled_for)}</Text>
                </div>
              )}
              
              {broadcast.status === 'sent' && (
                <div>
                  <Text variant="body-2" className="broadcast-detail__meta-label">Sent At</Text>
                  <Text variant="body-1">{formatDate(broadcast.sent_at || null)}</Text>
                </div>
              )}
              
              <div>
                <Text variant="body-2" className="broadcast-detail__meta-label">Created At</Text>
                <Text variant="body-1">{formatDate(broadcast.created_at)}</Text>
              </div>
              
              <div>
                <Text variant="body-2" className="broadcast-detail__meta-label">Last Updated</Text>
                <Text variant="body-1">{formatDate(broadcast.updated_at)}</Text>
              </div>
            </div>
          </div>
          
          {/* Stats for sent broadcasts */}
          {broadcast.status === 'sent' && (
            <div className="broadcast-detail__stats">
              <Text variant="subheader-2" className="broadcast-detail__stats-title">Statistics</Text>
              
              <div className="broadcast-detail__stats-list">
                <div>
                  <Text variant="body-2" className="broadcast-detail__meta-label">Open Rate</Text>
                  <Text variant="display-2">
                    {getStats().openRate}%
                  </Text>
                </div>
                
                <div>
                  <Text variant="body-2" className="broadcast-detail__meta-label">Click Rate</Text>
                  <Text variant="display-2">
                    {getStats().clickRate}%
                  </Text>
                </div>
                
                <div className="broadcast-detail__stats-grid">
                  <div>
                    <Text variant="caption-1" className="broadcast-detail__meta-label">Opened</Text>
                    <Text variant="body-1">
                      {getStats().opened}/{getStats().total}
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="caption-1" className="broadcast-detail__meta-label">Clicked</Text>
                    <Text variant="body-1">
                      {getStats().clicked}/{getStats().total}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Content Preview */}
      <Card className="broadcast-detail__content">
        <Text variant="subheader-2" className="broadcast-detail__content-title">Email Content</Text>
        <div className="broadcast-detail__content-preview">
          {broadcast.content_html ? (
            <div dangerouslySetInnerHTML={{ __html: broadcast.content_html }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: getContentHtml() }} />
          )}
        </div>
      </Card>

      {/* Recipients List */}
      <Card className="broadcast-detail__recipients">
        <Text variant="subheader-2" className="broadcast-detail__recipients-title">Recipients</Text>
        <div className="broadcast-detail__recipients-grid">
          {broadcast.recipients.map((email, index) => (
            <div key={index} className="broadcast-detail__recipient-item">
              {email}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BroadcastDetail;