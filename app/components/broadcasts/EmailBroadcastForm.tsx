"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Text, TextInput, Icon, Modal } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, Plus, ChevronDown, Eye, Bug } from '@gravity-ui/icons';
import TipTapEditor from '@/app/components/blog/TipTapEditor';
import TagInput from './TagInput';
import DateTimePicker from './DateTimePicker';
import { BroadcastFormProps, NewBroadcast } from './types';
import { tiptapToHtml, renderEmailPreview } from '@/app/utils/tiptapToHtml';

const EmailBroadcastForm: React.FC<BroadcastFormProps> = ({
  initialData,
  onSave,
  onSchedule,
  onSend,
  isSubmitting = false,
}) => {
  // Form state
  const [subject, setSubject] = useState<string>(initialData?.subject || '');
  const [content, setContent] = useState<any>(initialData?.content || '');
  const [recipients, setRecipients] = useState<string[]>(initialData?.recipients || []);
  const [showScheduler, setShowScheduler] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(
    initialData?.scheduled_for ? new Date(initialData.scheduled_for) : null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  
  // Update HTML content whenever TipTap content changes
  useEffect(() => {
    if (content) {
      try {
        const html = tiptapToHtml(content);
        setHtmlContent(html);
      } catch (error) {
        console.error('Error converting content to HTML:', error);
      }
    }
  }, [content]);
  
  // Form validation
  const [errors, setErrors] = useState<{
    subject?: string;
    content?: string;
    recipients?: string;
  }>({});
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {
      subject?: string;
      content?: string;
      recipients?: string;
    } = {};
    
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!content) {
      newErrors.content = 'Content is required';
    }
    
    if (recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients,
    };
    
    if (onSave) {
      await onSave(broadcastData);
    }
  };
  
  // Handle schedule
  const handleSchedule = async () => {
    if (!validateForm()) return;
    if (!scheduledDate) {
      setErrors({ ...errors, content: 'Please select a date and time for scheduling' });
      return;
    }
    
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients,
      scheduled_for: scheduledDate.toISOString(),
    };
    
    if (onSchedule) {
      await onSchedule(broadcastData, scheduledDate);
    }
  };
  
  // Handle send now
  const handleSendNow = async () => {
    if (!validateForm()) return;
    
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients,
    };
    
    if (onSend) {
      await onSend(broadcastData);
    }
  };
  
  return (
    <Card className="p-4">
      <div className="space-y-6">
        <div>
          <Text variant="subheader-1" className="mb-4">Create Email Broadcast</Text>
          
          <div className="space-y-4">
            {/* Subject */}
            <div>
              <Text variant="body-2" className="mb-1">Subject</Text>
              <TextInput
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                disabled={isSubmitting}
                error={errors.subject}
                size="m"
              />
              {errors.subject && (
                <Text variant="caption-1" className="text-red-500 mt-1">
                  {errors.subject}
                </Text>
              )}
            </div>
            
            {/* Recipients */}
            <div>
              <Text variant="body-2" className="mb-1">Recipients</Text>
              <TagInput
                tags={recipients}
                setTags={setRecipients}
                placeholder="Add email addresses..."
                disabled={isSubmitting}
              />
              {errors.recipients && (
                <Text variant="caption-1" className="text-red-500 mt-1">
                  {errors.recipients}
                </Text>
              )}
            </div>
            
            {/* Content */}
            <div>
              <Text variant="body-2" className="mb-1">Email Content</Text>
              <div className="border rounded-md">
                <TipTapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Compose your email content here..."
                />
              </div>
              {errors.content && (
                <Text variant="caption-1" className="text-red-500 mt-1">
                  {errors.content}
                </Text>
              )}
            </div>
            
            {/* Scheduler */}
            {showScheduler && (
              <div className="border rounded-md p-4 bg-gray-50">
                <DateTimePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  minDate={new Date()}
                  disabled={isSubmitting}
                />
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                view="outlined"
                onClick={() => setShowPreview(true)}
                disabled={!content || isSubmitting}
              >
                <Icon data={Eye} size={16} />
                Preview
              </Button>
              <Button
                view="outlined"
                onClick={() => setShowDebug(true)}
                disabled={!content || isSubmitting}
              >
                <Icon data={Bug} size={16} />
                Debug
              </Button>
              <Button
                view="outlined"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                <Icon data={Pencil} size={16} />
                Save as Draft
              </Button>
              
              {!showScheduler ? (
                <Button
                  view="outlined"
                  onClick={() => setShowScheduler(true)}
                  disabled={isSubmitting}
                >
                  <Icon data={Plus} size={16} />
                  Schedule
                </Button>
              ) : (
                <Button
                  view="outlined"
                  onClick={handleSchedule}
                  disabled={isSubmitting || !scheduledDate}
                >
                  <Icon data={ChevronDown} size={16} />
                  Confirm Schedule
                </Button>
              )}
              
              <Button
                view="action"
                onClick={handleSendNow}
                disabled={isSubmitting}
              >
                <Icon data={ArrowUturnCwLeft} size={16} />
                Send Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)}>
        <div className="w-full max-w-4xl h-[80vh]">
          <iframe
            ref={previewRef}
            srcDoc={renderEmailPreview(htmlContent)}
            className="w-full h-full border rounded-md"
            title="Email Preview"
            key={showPreview ? 'preview-visible' : 'preview-hidden'}
          />
        </div>
      </Modal>
      
      {/* Debug Modal */}
      <Modal open={showDebug} onClose={() => setShowDebug(false)}>
        <div className="w-full max-w-4xl h-[80vh] overflow-auto p-4">
          <Text variant="subheader-1" className="mb-4">Debug Information</Text>
          
          <div className="mb-4">
            <Text variant="body-2" className="font-bold">Content Type:</Text>
            <Text variant="body-2">{typeof content}</Text>
          </div>
          
          {typeof content === 'object' && (
            <div className="mb-4">
              <Text variant="body-2" className="font-bold">Content Structure:</Text>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mb-4">
            <Text variant="body-2" className="font-bold">Generated HTML:</Text>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {htmlContent}
            </pre>
          </div>
          
          <div className="mb-4">
            <Text variant="body-2" className="font-bold">Preview:</Text>
            <div className="border p-2 rounded bg-white">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default EmailBroadcastForm;