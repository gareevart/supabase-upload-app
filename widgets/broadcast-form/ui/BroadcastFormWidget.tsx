"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, DropdownMenu, Flex, Skeleton, Text, TextInput } from '@gravity-ui/uikit';
import { FormRow } from '@gravity-ui/components';
import { PageActionBar } from '@/shared/ui/PageActionBar';
import { MarkdownEditor } from '@/features/blog-editor/ui/MarkdownEditor';
import TagInput from '@/app/components/broadcasts/TagInput';
import DateTimePicker from '@/app/components/broadcasts/DateTimePicker';
import GroupSelector from '@/app/components/broadcasts/GroupSelector';
import { Broadcast, NewBroadcast } from '@/entities/broadcast/model';
import { useBroadcastForm } from '@/features/broadcast-form/model/useBroadcastForm';
import { BroadcastApi } from '@/shared/api/broadcast';
import { markdownToHtml, renderEmailPreview } from '@/app/utils/markdownToHtml';
import { useI18n } from '@/app/contexts/I18nContext';
import './BroadcastFormWidget.css';

interface BroadcastFormWidgetProps {
  id?: string;
  initialData?: Partial<Broadcast>;
  isEdit?: boolean;
}

type ValidationErrors = {
  subject?: string;
  content?: string;
  recipients?: string;
};

const BroadcastFormWidget: React.FC<BroadcastFormWidgetProps> = ({
  id,
  initialData,
  isEdit = false,
}) => {
  const previewDialogTitleId = 'broadcast-preview-dialog-title';
  const scheduleDialogTitleId = 'broadcast-schedule-dialog-title';
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

  const [subject, setSubject] = useState<string>(initialData?.subject || '');
  const [content, setContent] = useState<string>(
    typeof initialData?.content === 'string' ? initialData.content : ''
  );
  const [recipients, setRecipients] = useState<string[]>(initialData?.recipients || []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupEmails, setGroupEmails] = useState<string[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(
    initialData?.scheduled_for ? new Date(initialData.scheduled_for) : null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(isEdit && !initialData);
  const [loadedData, setLoadedData] = useState<Partial<Broadcast> | null>(initialData || null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const memoizedHtml = useMemo(() => {
    if (!content) return '';

    try {
      return markdownToHtml(content);
    } catch (error) {
      console.error('Error converting content to HTML:', error);
      return '';
    }
  }, [content]);

  const previousMemoizedHtml = React.useRef('');

  useEffect(() => {
    if (memoizedHtml !== previousMemoizedHtml.current) {
      setHtmlContent(memoizedHtml);
      previousMemoizedHtml.current = memoizedHtml;
    }
  }, [memoizedHtml]);

  useEffect(() => {
    if (id && isEdit && !loadedData) {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const response = await BroadcastApi.getBroadcast(id);
          const data = response.data;
          setLoadedData(data);
          setSubject(data.subject || '');
          setContent(typeof data.content === 'string' ? data.content : '');
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

  const hasSubject = Boolean(subject.trim());
  const hasContent = Boolean(content.trim());
  const hasRecipients = recipients.length > 0 || groupEmails.length > 0;

  const buildFormData = (): NewBroadcast => ({
    subject: subject.trim(),
    content,
    recipients: [...recipients, ...groupEmails],
    group_ids: selectedGroups,
  });

  const validateForm = () => {
    const nextErrors: ValidationErrors = {};

    if (!hasSubject) {
      nextErrors.subject = t('broadcast.validation.subjectRequired');
    }

    if (!hasContent) {
      nextErrors.content = t('broadcast.validation.contentRequired');
    }

    if (!hasRecipients) {
      nextErrors.recipients = t('broadcast.validation.recipientsRequired');
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateDraft(broadcastId!, buildFormData());
      } else {
        await saveAsDraft(buildFormData());
      }
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error saving broadcast:', error);
    }
  };

  const handleSchedule = async () => {
    const isValid = validateForm();
    if (!isValid) {
      setShowScheduler(false);
      return;
    }
    if (!scheduledDate) return;

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateSchedule(broadcastId!, buildFormData(), scheduledDate);
      } else {
        await scheduleBroadcast(buildFormData(), scheduledDate);
      }
      setShowScheduler(false);
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
    }
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    try {
      if (isEdit && (initialData?.id || id)) {
        const broadcastId = initialData?.id || id;
        await updateAndSend(broadcastId!, buildFormData());
      } else {
        await sendNow(buildFormData());
      }
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
  };

  const handleGroupsChange = (groups: string[], emails: string[]) => {
    setSelectedGroups(groups);
    setGroupEmails(emails);
    if (emails.length > 0 || recipients.length > 0) {
      setValidationErrors((prev) => ({ ...prev, recipients: undefined }));
    }
  };

  const handleRecipientsChange = (newRecipients: string[]) => {
    setRecipients(newRecipients);
    if (validationErrors.recipients && (newRecipients.length > 0 || groupEmails.length > 0)) {
      setValidationErrors((prev) => ({ ...prev, recipients: undefined }));
    }
  };

  const openScheduler = () => {
    if (!scheduledDate) {
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0);
      setScheduledDate(defaultDate);
    }
    setShowScheduler(true);
  };

  const closeScheduler = () => {
    setScheduledDate(initialData?.scheduled_for ? new Date(initialData.scheduled_for) : null);
    setShowScheduler(false);
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/broadcasts');
    }
  };

  if (isLoading) {
    return (
      <div className="broadcast-editor-state">
        <Skeleton style={{ height: 384, width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="broadcast-editor">
      <PageActionBar
        ariaLabel={t('broadcast.form.actions')}
        items={[{ label: t(isEdit ? 'broadcast.form.editTitle' : 'broadcast.form.createTitle') }]}
        actions={
          <>
            <Button type="button" view="action" loading={isSubmitting} onClick={handleSend}>
              {t('broadcast.form.sendNow')}
            </Button>
            <DropdownMenu
              disabled={isSubmitting}
              defaultSwitcherProps={{
                'aria-label': t('broadcast.form.moreActions'),
              }}
              items={[
                {
                  text: t(isEdit ? 'broadcast.form.updateDraft' : 'broadcast.form.saveDraft'),
                  action: () => {
                    void handleSave();
                  },
                },
                {
                  text: t('broadcast.form.schedule'),
                  action: openScheduler,
                },
                {
                  text: t('broadcast.form.preview'),
                  action: () => setShowPreview(true),
                },
                {
                  text: t('broadcast.form.cancel'),
                  action: handleCancel,
                },
              ]}
            />
          </>
        }
      />

      <div className="broadcast-editor__content">
        <div className="broadcast-metadata">
          <FormRow
            label={t('broadcast.form.subjectLabel')}
            fieldId="broadcast-subject"
            required
            direction="column"
          >
            <TextInput
              id="broadcast-subject"
              size="l"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                if (validationErrors.subject) {
                  setValidationErrors((prev) => ({ ...prev, subject: undefined }));
                }
              }}
              placeholder={t('broadcast.form.subjectPlaceholder')}
              error={validationErrors.subject}
            />
          </FormRow>

          <FormRow
            label={t('broadcast.form.recipientsLabel')}
            fieldId="broadcast-recipients"
            required
            direction="column"
          >
            <div id="broadcast-recipients">
              <TagInput
                tags={recipients}
                setTags={handleRecipientsChange}
                placeholder={t('broadcast.tagInput.placeholder')}
              />
            </div>
            {validationErrors.recipients ? (
              <Text className="broadcast-metadata__error" variant="caption-2" color="danger">
                {validationErrors.recipients}
              </Text>
            ) : null}
          </FormRow>

          <GroupSelector
            selectedGroups={selectedGroups}
            onGroupsChange={handleGroupsChange}
          />
        </div>

        <div className="broadcast-editor__field">
          <MarkdownEditor
            content={content}
            onChange={(value) => {
              setContent(value);
              if (validationErrors.content && value.trim()) {
                setValidationErrors((prev) => ({ ...prev, content: undefined }));
              }
            }}
            placeholder={t('broadcast.form.contentPlaceholder')}
          />
          {validationErrors.content ? (
            <Text className="broadcast-metadata__error" variant="caption-2" color="danger">
              {validationErrors.content}
            </Text>
          ) : null}
        </div>
      </div>

      <Dialog
        open={showScheduler}
        onClose={closeScheduler}
        aria-labelledby={scheduleDialogTitleId}
        size="s"
      >
        <Dialog.Header caption={t('broadcast.form.schedule')} id={scheduleDialogTitleId} />
        <Dialog.Body>
          <div className="broadcast-dialog__section">
            <DateTimePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              minDate={new Date()}
              showTitle={false}
              disabled={isSubmitting}
            />
            <Flex direction="row" justifyContent="flex-end" gap={2} className="broadcast-dialog__footer">
              <Button view="outlined" size="l" disabled={isSubmitting} onClick={closeScheduler}>
                {t('broadcast.form.cancel')}
              </Button>
              <Button
                view="action"
                size="l"
                loading={isSubmitting}
                disabled={!scheduledDate}
                onClick={() => {
                  void handleSchedule();
                }}
              >
                {t('broadcast.form.scheduleConfirm')}
              </Button>
            </Flex>
          </div>
        </Dialog.Body>
      </Dialog>

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onEnterKeyDown={() => setShowPreview(false)}
        aria-labelledby={previewDialogTitleId}
        size="l"
      >
        <Dialog.Header caption={t('broadcast.form.previewTitle')} id={previewDialogTitleId} />
        <Dialog.Body>
          <div className="broadcast-dialog__section">
            <div className="broadcast-preview">
              <iframe
                srcDoc={renderEmailPreview(htmlContent, subject)}
                className="broadcast-preview__frame"
                title={t('broadcast.form.previewTitle')}
              />
            </div>
            <Flex direction="row" justifyContent="flex-end" className="broadcast-dialog__footer">
              <Button view="action" size="l" onClick={() => setShowPreview(false)}>
                {t('broadcast.form.previewClose')}
              </Button>
            </Flex>
          </div>
        </Dialog.Body>
      </Dialog>
    </div>
  );
};

export default BroadcastFormWidget;
