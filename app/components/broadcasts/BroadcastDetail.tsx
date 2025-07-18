"use client";

import React from 'react';
import { Card, Text, Button, Icon } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, TrashBin, ChevronDown } from '@gravity-ui/icons';
import { BroadcastDetailProps, BroadcastStats } from './types';

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
      
      // If no content_html, use our tiptapToHtml utility
      if (typeof window !== 'undefined') {
        // Import dynamically on client side
        const { tiptapToHtml } = require('@/app/utils/tiptapToHtml');
        return tiptapToHtml(broadcast.content);
      }
      
      // Fallback for server-side rendering
      if (typeof broadcast.content === 'string') {
        // Check if it's already HTML
        if (broadcast.content.trim().startsWith('<') && broadcast.content.trim().endsWith('>')) {
          return broadcast.content;
        }
        // Check if it's JSON string
        try {
          const parsedContent = JSON.parse(broadcast.content);
          return `<pre>${JSON.stringify(parsedContent, null, 2)}</pre>`;
        } catch {
          // It's plain text
          return broadcast.content;
        }
      } else if (typeof broadcast.content === 'object') {
        // It's already a JSON object
        return `<pre>${JSON.stringify(broadcast.content, null, 2)}</pre>`;
      }
      
      return 'No content available';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
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
        <div className="flex gap-2">
          {renderActions()}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <Text variant="subheader-1" className="mb-2">
              {broadcast.subject}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(broadcast.status)}`}>
                {broadcast.status}
              </span>
            </Text>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Text variant="body-2" className="text-gray-500">Recipients</Text>
                <Text variant="body-1">{broadcast.total_recipients || broadcast.recipients?.length || 0}</Text>
              </div>
              
              {broadcast.status === 'scheduled' && (
                <div>
                  <Text variant="body-2" className="text-gray-500">Scheduled For</Text>
                  <Text variant="body-1">{formatDate(broadcast.scheduled_for)}</Text>
                </div>
              )}
              
              {broadcast.status === 'sent' && (
                <div>
                  <Text variant="body-2" className="text-gray-500">Sent At</Text>
                  <Text variant="body-1">{formatDate(broadcast.sent_at || null)}</Text>
                </div>
              )}
              
              <div>
                <Text variant="body-2" className="text-gray-500">Created At</Text>
                <Text variant="body-1">{formatDate(broadcast.created_at)}</Text>
              </div>
              
              <div>
                <Text variant="body-2" className="text-gray-500">Last Updated</Text>
                <Text variant="body-1">{formatDate(broadcast.updated_at)}</Text>
              </div>
            </div>
          </div>
          
          {/* Stats for sent broadcasts */}
          {broadcast.status === 'sent' && (
            <div className="bg-gray-50 p-4 rounded-lg min-w-[200px]">
              <Text variant="subheader-2" className="mb-2">Statistics</Text>
              
              <div className="space-y-2">
                <div>
                  <Text variant="body-2" className="text-gray-500">Open Rate</Text>
                  <Text variant="display-2">
                    {getStats().openRate}%
                  </Text>
                </div>
                
                <div>
                  <Text variant="body-2" className="text-gray-500">Click Rate</Text>
                  <Text variant="display-2">
                    {getStats().clickRate}%
                  </Text>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div>
                    <Text variant="caption-1" className="text-gray-500">Opened</Text>
                    <Text variant="body-1">
                      {getStats().opened}/{getStats().total}
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="caption-1" className="text-gray-500">Clicked</Text>
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
      <Card className="p-6">
        <Text variant="subheader-2" className="mb-4">Email Content</Text>
        <div className="p-4 border rounded-md bg-white">
          {broadcast.content_html ? (
            <div dangerouslySetInnerHTML={{ __html: broadcast.content_html }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: getContentHtml() }} />
          )}
        </div>
      </Card>

      {/* Recipients List */}
      <Card className="p-6">
        <Text variant="subheader-2" className="mb-4">Recipients</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {broadcast.recipients.map((email, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded">
              {email}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BroadcastDetail;