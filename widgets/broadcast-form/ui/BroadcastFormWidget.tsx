"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button, Card, Text, TextInput, Icon, Modal } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, Plus, ChevronDown, Eye, Bug } from '@gravity-ui/icons';
import TipTapEditor from '@/app/components/blog/TipTapEditor';
import TagInput from '@/app/components/broadcasts/TagInput';
import DateTimePicker from '@/app/components/broadcasts/DateTimePicker';
import GroupSelector from '@/app/components/broadcasts/GroupSelector';
import { Broadcast, BroadcastFormData, NewBroadcast } from '@/entities/broadcast/model';
import { useBroadcastForm } from '@/features/broadcast-form/model/useBroadcastForm';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useRouter } from 'next/navigation';
import { tiptapToHtml, renderEmailPreview } from '@/app/utils/tiptapToHtml';

interface BroadcastFormWidgetProps {
  id?: string;
  initialData?: Partial<Broadcast>;
  isEdit?: boolean;
}

const BroadcastFormWidget: React.FC<BroadcastFormWidgetProps> = ({
  id,
  initialData,
  isEdit = false,
}) => {
  const router = useRouter();
  const {
    isSubmitting,
    saveAsDraft,
    updateDraft,
    scheduleBroadcast,
    updateSchedule,
    sendNow,
    updateAndSend,
  } = useBroadcastForm(initialData);

  // Form state
  const [subject, setSubject] = useState<string>(initialData?.subject || '');
  const [content, setContent] = useState<any>(initialData?.content || '');
  const [recipients, setRecipients] = useState<string[]>(initialData?.recipients || []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupEmails, setGroupEmails] = useState<string[]>([]);
  const [showScheduler, setShowScheduler] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(
    initialData?.scheduled_for ? new Date(initialData.scheduled_for) : null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(isEdit && !initialData);
  const [loadedData, setLoadedData] = useState<Partial<Broadcast> | null>(initialData || null);
  
  // Memoized HTML content generation
  const memoizedHtml = useMemo(() => {
    if (!content) return '';

    try {
      return tiptapToHtml(content);
    } catch (error) {
      console.error('Error converting content to HTML:', error);
      return '';
    }
  }, [content]);

  // Update HTML content whenever TipTap content changes - with optimization
  const previousMemoizedHtml = React.useRef<string>('');

  useEffect(() => {
    if (memoizedHtml !== previousMemoizedHtml.current) {
      setHtmlContent(memoizedHtml);
      previousMemoizedHtml.current = memoizedHtml;
    }
  }, [memoizedHtml]);

  // Load data if id is provided and no initial data
  useEffect(() => {
    if (id && isEdit && !loadedData) {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const response = await BroadcastApi.getBroadcast(id);
          const data = response.data;
          setLoadedData(data);
          setSubject(data.subject || '');
          setContent(data.content || '');
          setRecipients(data.recipients || []);
          if (data.scheduled_for) {
            setScheduledDate(new Date(data.scheduled_for));
          }
        } catch (error) {
          console.error('Error loading broadcast data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [id, isEdit, loadedData]);

  // Update preview when HTML content changes
  useEffect(() => {
    if (showPreview && previewRef.current && htmlContent) {
      const previewHtml = renderEmailPreview(htmlContent);
      previewRef.current.srcdoc = previewHtml;
    }
  }, [htmlContent, subject, showPreview]);

  // Form validation
  const isFormValid = subject.trim() && content && (recipients.length > 0 || groupEmails.length > 0);

  // Handle form submission
  const handleSave = async () => {
    if (!isFormValid) return;

    const formData: NewBroadcast = {
      subject: subject.trim(),
      content,
      recipients: [...recipients, ...groupEmails],
      group_ids: selectedGroups,
    };

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateDraft(broadcastId!, formData);
      } else {
        await saveAsDraft(formData);
      }
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error saving broadcast:', error);
    }
  };

  const handleSchedule = async () => {
    if (!isFormValid || !scheduledDate) return;

    const formData: NewBroadcast = {
      subject: subject.trim(),
      content,
      recipients: [...recipients, ...groupEmails],
      group_ids: selectedGroups,
    };

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateSchedule(broadcastId!, formData, scheduledDate);
      } else {
        await scheduleBroadcast(formData, scheduledDate);
      }
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
    }
  };

  const handleSend = async () => {
    if (!isFormValid) return;

    const formData: NewBroadcast = {
      subject: subject.trim(),
      content,
      recipients: [...recipients, ...groupEmails],
      group_ids: selectedGroups,
    };

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateAndSend(broadcastId!, formData);
      } else {
        await sendNow(formData);
      }
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
  };

  const handleGroupsChange = (groups: string[], emails: string[]) => {
    setSelectedGroups(groups);
    setGroupEmails(emails);
  };

  const handleRecipientsChange = (newRecipients: string[]) => {
    setRecipients(newRecipients);
  };

  const handleScheduledDateChange = (date: Date | null) => {
    setScheduledDate(date);
  };

  const toggleScheduler = () => {
    setShowScheduler(!showScheduler);
    if (showScheduler) {
      setScheduledDate(null);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1">Loading broadcast data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Text variant="display-1" className="mb-6">
          {isEdit ? 'Edit Broadcast' : 'Create New Broadcast'}
        </Text>

        <div className="space-y-6">
          {/* Subject */}
          <Card className="p-6">
            <Text variant="subheader-2" className="mb-4">Subject</Text>
            <TextInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              size="l"
            />
          </Card>

          {/* Content Editor */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Text variant="subheader-2">Content</Text>
              <div className="flex gap-2">
                <Button
                  view="flat"
                  size="s"
                  onClick={togglePreview}
                >
                  <Icon data={Eye} size={16} />
                  Preview
                </Button>
                <Button
                  view="flat"
                  size="s"
                  onClick={toggleDebug}
                >
                  <Icon data={Bug} size={16} />
                  Debug
                </Button>
              </div>
            </div>
            <TipTapEditor
              content={content}
              onChange={setContent}
              placeholder="Write your email content here..."
            />
          </Card>

          {/* Recipients */}
          <Card className="p-6">
            <Text variant="subheader-2" className="mb-4">Recipients</Text>
            <div className="space-y-4">
              <div>
                <Text variant="body-2" className="mb-2">Manual Recipients</Text>
                <TagInput
                  tags={recipients}
                  setTags={handleRecipientsChange}
                  placeholder="Enter email addresses"
                />
              </div>
              <div>
                <Text variant="body-2" className="mb-2">Groups</Text>
                <GroupSelector
                  selectedGroups={selectedGroups}
                  onGroupsChange={handleGroupsChange}
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <div className="flex flex-wrap gap-3">
              <Button
                view="outlined"
                size="l"
                onClick={handleSave}
                disabled={!isFormValid || isSubmitting}
              >
                <Icon data={Pencil} size={16} />
                {isEdit ? 'Update Draft' : 'Save as Draft'}
              </Button>

              <Button
                view="outlined"
                size="l"
                onClick={toggleScheduler}
                disabled={!isFormValid || isSubmitting}
              >
                <Icon data={ChevronDown} size={16} />
                {showScheduler ? 'Cancel Schedule' : 'Schedule'}
              </Button>

              {showScheduler && (
                <div className="w-full mt-4">
                  <Text variant="body-2" className="mb-2">Schedule for:</Text>
                  <DateTimePicker
                    value={scheduledDate}
                    onChange={handleScheduledDateChange}
                    minDate={new Date()}
                  />
                  <Button
                    view="normal"
                    size="l"
                    onClick={handleSchedule}
                    disabled={!isFormValid || !scheduledDate || isSubmitting}
                    className="mt-2"
                  >
                    Schedule Broadcast
                  </Button>
                </div>
              )}

              <Button
                view="action"
                size="l"
                onClick={handleSend}
                disabled={!isFormValid || isSubmitting}
              >
                <Icon data={ArrowUturnCwLeft} size={16} />
                Send Now
              </Button>
            </div>
          </Card>
        </div>

        {/* Preview Modal */}
        <Modal open={showPreview} onClose={() => setShowPreview(false)}>
          <div className="p-6">
            <Text variant="subheader-2" className="mb-4">Email Preview</Text>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                ref={previewRef}
                className="w-full h-96"
                title="Email Preview"
              />
            </div>
          </div>
        </Modal>

        {/* Debug Modal */}
        <Modal open={showDebug} onClose={() => setShowDebug(false)}>
          <div className="p-6">
            <Text variant="subheader-2" className="mb-4">Debug Information</Text>
            <div className="space-y-4">
              <div>
                <Text variant="body-2" className="font-semibold">Form Data:</Text>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    subject,
                    recipients: [...recipients, ...groupEmails],
                    selectedGroups,
                    groupEmails,
                    scheduledDate: scheduledDate?.toISOString(),
                    isFormValid,
                    isSubmitting,
                  }, null, 2)}
                </pre>
              </div>
              <div>
                <Text variant="body-2" className="font-semibold">Content (JSON):</Text>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>
              <div>
                <Text variant="body-2" className="font-semibold">HTML Content:</Text>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {htmlContent}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default BroadcastFormWidget;
