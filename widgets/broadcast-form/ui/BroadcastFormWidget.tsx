"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Text, TextInput, Icon, Modal, Dialog } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, ChevronDown, Eye, Bug } from '@gravity-ui/icons';
import TipTapEditor from '@/app/components/blog/TipTapEditor';
import TagInput from '@/app/components/broadcasts/TagInput';
import DateTimePicker from '@/app/components/broadcasts/DateTimePicker';
import GroupSelector from '@/app/components/broadcasts/GroupSelector';
import { Broadcast, NewBroadcast } from '@/entities/broadcast/model';
import { useBroadcastForm } from '@/features/broadcast-form/model/useBroadcastForm';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useRouter } from 'next/navigation';
import { tiptapToHtml, renderEmailPreview } from '@/app/utils/tiptapToHtml';
import { useI18n } from '@/app/contexts/I18nContext';

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
  const previewDialogTitleId = 'broadcast-preview-dialog-title';
  const router = useRouter();
  const { t } = useI18n();
  const {
    isSubmitting,
    saveAsDraft,
    updateDraft,
    scheduleBroadcast,
    updateSchedule,
    sendNow,
    updateAndSend,
  } = useBroadcastForm();

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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(isEdit && !initialData);
  const [loadedData, setLoadedData] = useState<Partial<Broadcast> | null>(initialData || null);
  const [validationErrors, setValidationErrors] = useState<{ subject?: string; recipients?: string }>({});

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

  // Form validation
  const hasSubject = Boolean(subject.trim());
  const hasContent = Boolean(content);
  const hasRecipients = recipients.length > 0 || groupEmails.length > 0;
  const isFormValid = hasSubject && hasContent && hasRecipients;

  const validateForm = () => {
    const nextErrors: { subject?: string; recipients?: string } = {};

    if (!hasSubject) {
      nextErrors.subject = t('broadcast.validation.subjectRequired');
    }

    if (!hasRecipients) {
      nextErrors.recipients = t('broadcast.validation.recipientsRequired');
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Handle form submission
  const handleSave = async () => {
    if (!validateForm()) return;

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
    if (!validateForm() || !scheduledDate) return;

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
    if (!validateForm()) return;

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
    if (validationErrors.recipients) {
      setValidationErrors((prev) => ({ ...prev, recipients: undefined }));
    }
  };

  const handleScheduledDateChange = (date: Date | null) => {
    setScheduledDate(date);
  };

  const toggleScheduler = () => {
    if (showScheduler) {
      // Closing scheduler - clear the date
      setScheduledDate(null);
      setShowScheduler(false);
    } else {
      // Opening scheduler - initialize with default date if none is set
      if (!scheduledDate) {
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0); // 1 hour from now
        setScheduledDate(defaultDate);
      }
      setShowScheduler(true);
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
          <Text variant="body-1">{t('broadcast.form.loadingData')}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Text variant="display-1" className="mb-6">
          {isEdit ? t('broadcast.form.editTitle') : t('broadcast.form.createTitle')}
        </Text>

        <div className="space-y-6">
          {/* Subject */}
          <Card className="p-6">
            <Text variant="subheader-2" className="mb-4">{t('broadcast.form.subjectLabel')}</Text>
            <TextInput
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (validationErrors.subject) {
                  setValidationErrors((prev) => ({ ...prev, subject: undefined }));
                }
              }}
              placeholder={t('broadcast.form.subjectPlaceholder')}
              size="l"
              error={validationErrors.subject}
            />
          </Card>

          {/* Content Editor */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Text variant="subheader-2">{t('broadcast.form.contentLabel')}</Text>
              <div className="flex gap-2">
                <Button
                  view="flat"
                  size="s"
                  onClick={togglePreview}
                >
                  <Icon data={Eye} size={16} />
                  {t('broadcast.form.preview')}
                </Button>
                <Button
                  view="flat"
                  size="s"
                  onClick={toggleDebug}
                >
                  <Icon data={Bug} size={16} />
                  {t('broadcast.form.debug')}
                </Button>
              </div>
            </div>
            <TipTapEditor
              content={content}
              onChange={setContent}
              placeholder={t('broadcast.form.contentPlaceholder')}
            />
          </Card>

          {/* Recipients */}
          <Card className="p-6">
            <Text variant="subheader-2" className="mb-4">{t('broadcast.form.recipientsLabel')}</Text>
            <div className="space-y-4">
              <div>
                <Text variant="body-2" className="mb-2">{t('broadcast.form.manualRecipientsLabel')}</Text>
                <TagInput
                  tags={recipients}
                  setTags={handleRecipientsChange}
                  placeholder={t('broadcast.tagInput.placeholder')}
                />
                {validationErrors.recipients && (
                  <Text variant="caption-1" color="danger">
                    {validationErrors.recipients}
                  </Text>
                )}
              </div>
              <div>
                <GroupSelector
                  selectedGroups={selectedGroups}
                  onGroupsChange={handleGroupsChange}
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              view="outlined"
              size="l"
              onClick={handleSave}
              disabled={!isFormValid || isSubmitting}
            >
              <Icon data={Pencil} size={16} />
              {isEdit ? t('broadcast.form.updateDraft') : t('broadcast.form.saveDraft')}
            </Button>

            <Button
              view="outlined"
              size="l"
              onClick={toggleScheduler}
              disabled={!isFormValid || isSubmitting}
            >
              <Icon data={ChevronDown} size={16} />
              {showScheduler ? t('broadcast.form.cancelSchedule') : t('broadcast.form.schedule')}
            </Button>

            {showScheduler && (
              <div className="w-full mt-4">
                <Text variant="body-2" className="mb-2">{t('broadcast.form.scheduleFor')}</Text>
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
                  {t('broadcast.form.scheduleConfirm')}
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
              {t('broadcast.form.sendNow')}
            </Button>
          </div>

        </div>

        {/* Preview Dialog */}
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          onEnterKeyDown={() => setShowPreview(false)}
          aria-labelledby={previewDialogTitleId}
          size="l"
        >
          <Dialog.Header caption={t('broadcast.form.previewTitle')} id={previewDialogTitleId} />
          <Dialog.Body>
            <div className="border rounded-lg overflow-hidden w-full">
              <iframe
                srcDoc={renderEmailPreview(htmlContent)}
                className="w-full h-[80vh]"
                title={t('broadcast.form.previewTitle')}
              />
            </div>
          </Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setShowPreview(false)}
            onClickButtonApply={() => setShowPreview(false)}
            textButtonApply={t('broadcast.form.previewClose')}
            textButtonCancel={t('broadcast.form.previewCancel')}
          />
        </Dialog>

        {/* Debug Modal */}
        <Modal open={showDebug} onClose={() => setShowDebug(false)}>
          <div className="p-6">
            <Text variant="subheader-2" className="mb-4">{t('broadcast.form.debugTitle')}</Text>
            <div className="space-y-4">
              <div>
                <Text variant="body-2" className="font-semibold">{t('broadcast.form.formData')}:</Text>
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
                <Text variant="body-2" className="font-semibold">{t('broadcast.form.contentJson')}:</Text>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>
              <div>
                <Text variant="body-2" className="font-semibold">{t('broadcast.form.generatedHtml')}:</Text>
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
