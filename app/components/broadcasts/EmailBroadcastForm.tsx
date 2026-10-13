"use client";

import { useRouter } from 'next/navigation';
import { EDITOR_MENU_EVENT } from '@/app/components/Navigation/Navigation';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button, Card, Text, TextInput, Icon, Modal } from '@gravity-ui/uikit';
import { ArrowUturnCwLeft, Pencil, Plus, ChevronDown, Eye, Bug } from '@gravity-ui/icons';
import { MarkdownEditor } from '@/features/blog-editor/ui/MarkdownEditor';
import TagInput from './TagInput';
import DateTimePicker from './DateTimePicker';
import GroupSelector from './GroupSelector';
import { BroadcastFormProps, NewBroadcast } from './types';
import { markdownToHtml, renderEmailPreview } from '@/app/utils/markdownToHtml';
import './EmailBroadcastForm.css';

const EmailBroadcastForm: React.FC<BroadcastFormProps> = ({
  initialData,
  onSave,
  onSchedule,
  onSend,
  isSubmitting = false,
}) => {
  const router = useRouter();

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

  // Memoized HTML content generation
  const memoizedHtml = useMemo(() => {
    if (!content) return '';

    try {
      return markdownToHtml(content);
    } catch (error) {
      console.error('Error converting content to HTML:', error);
      return '';
    }
  }, [content]);

  // Update HTML content whenever TipTap content changes - with optimization
  const previousMemoizedHtml = React.useRef<string>('');

  useEffect(() => {
    if (memoizedHtml !== previousMemoizedHtml.current) {
      previousMemoizedHtml.current = memoizedHtml;
      setHtmlContent(memoizedHtml);
    }
  }, [memoizedHtml]);

  // Form validation
  const [errors, setErrors] = useState<{
    subject?: string;
    content?: string;
    recipients?: string;
  }>({});

  // Handle group selection changes
  const handleGroupsChange = (groupIds: string[], emails: string[]) => {
    setSelectedGroups(groupIds);
    setGroupEmails(emails);
  };

  // Get all recipients (manual + groups)
  const getAllRecipients = (): string[] => {
    const allEmails = new Set([...recipients, ...groupEmails]);
    return Array.from(allEmails);
  };

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

    const allRecipients = getAllRecipients();
    if (allRecipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    const allRecipients = getAllRecipients();
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients: allRecipients,
      group_ids: selectedGroups,
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

    const allRecipients = getAllRecipients();
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients: allRecipients,
      group_ids: selectedGroups,
      scheduled_for: scheduledDate.toISOString(),
    };

    if (onSchedule) {
      await onSchedule(broadcastData, scheduledDate);
    }
  };

  // Handle send now
  const handleSendNow = async () => {
    if (!validateForm()) return;

    const allRecipients = getAllRecipients();
    const broadcastData: NewBroadcast = {
      subject,
      content,
      recipients: allRecipients,
      group_ids: selectedGroups,
    };

    if (onSend) {
      await onSend(broadcastData);
    }
  };

  useEffect(() => {
    const onCancel = () => {
      window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, { detail: null }));
      router.back();
    };

    window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, { detail: {
      mode: 'broadcast',
      onSave: handleSaveDraft,
      onDraft: handleSaveDraft,
      onCancel,
    }}));

    return () => window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, { detail: null }));
  }, [initialData, handleSaveDraft, router]);

  return (
  <Card className="email-broadcast-form">
      <div className="email-broadcast-form__inner">
        <div>
          <Text variant="subheader-1" className="email-broadcast-form__mb-4">Создать Email рассылку</Text>

          <div className="email-broadcast-form__space-y-4">
            {/* Subject */}
            <div>
              <Text variant="body-2" className="email-broadcast-form__label">Тема письма</Text>
              <TextInput
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Введите тему письма"
                disabled={isSubmitting}
                error={errors.subject}
                size="m"
              />
              {errors.subject && (
                <Text variant="caption-1" className="email-broadcast-form__error">
                  {errors.subject}
                </Text>
              )}
            </div>

            {/* Group Selector */}
            <div>
              <GroupSelector
                selectedGroups={selectedGroups}
                onGroupsChange={handleGroupsChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Manual Recipients */}
            <div>
              <Text variant="body-2" className="email-broadcast-form__label">
                Дополнительные получатели
                <Text variant="caption-1" color="secondary" className="email-broadcast-form__ml-2">
                  (добавьте email адреса вручную)
                </Text>
              </Text>
              <TagInput
                tags={recipients}
                setTags={setRecipients}
                placeholder="Добавьте email адреса..."
                disabled={isSubmitting}
              />

              {/* Show total recipients count */}
              <div className="email-broadcast-form__mt-2">
                <Text variant="caption-1" color="secondary">
                  Всего получателей: {getAllRecipients().length}
                  {groupEmails.length > 0 && (
                    <span> (из групп: {groupEmails.length}, вручную: {recipients.length})</span>
                  )}
                </Text>
              </div>

              {errors.recipients && (
                <Text variant="caption-1" className="email-broadcast-form__error">
                  {errors.recipients}
                </Text>
              )}
            </div>

            {/* Content */}
            <div>
              <Text variant="body-2" className="email-broadcast-form__label">Содержание письма</Text>
              <div className="email-broadcast-form__editor-wrapper">
                <MarkdownEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Напишите содержание письма..."
                />
              </div>
              {errors.content && (
                <Text variant="caption-1" className="email-broadcast-form__error">
                  {errors.content}
                </Text>
              )}
            </div>

            {/* Scheduler */}
            {showScheduler && (
              <div className="email-broadcast-form__scheduler">
                <DateTimePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  minDate={new Date()}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Actions */}
            <div className="email-broadcast-form__actions">
              <Button
                view="outlined"
                onClick={() => setShowPreview(true)}
                disabled={!content || isSubmitting}
              >
                <Icon data={Eye} size={16} />
                Предпросмотр
              </Button>
              <Button
                view="outlined"
                onClick={() => setShowDebug(true)}
                disabled={!content || isSubmitting}
              >
                <Icon data={Bug} size={16} />
                Отладка
              </Button>
              <Button
                view="outlined"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                <Icon data={Pencil} size={16} />
                Сохранить черновик
              </Button>

              {!showScheduler ? (
                <Button
                  view="outlined"
                  onClick={() => {
                    if (!scheduledDate) {
                      const defaultDate = new Date();
                      defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0); // 1 hour from now
                      setScheduledDate(defaultDate);
                    }
                    setShowScheduler(true);
                  }}
                  disabled={isSubmitting}
                >
                  <Icon data={Plus} size={16} />
                  Запланировать
                </Button>
              ) : (
                <>
                  <Button
                    view="outlined"
                    onClick={() => {
                      setShowScheduler(false);
                      setScheduledDate(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    view="outlined"
                    onClick={handleSchedule}
                    disabled={isSubmitting || !scheduledDate}
                  >
                    <Icon data={ChevronDown} size={16} />
                    Подтвердить планирование
                  </Button>
                </>
              )}

              <Button
                view="action"
                onClick={handleSendNow}
                disabled={isSubmitting}
              >
                <Icon data={ArrowUturnCwLeft} size={16} />
                Отправить сейчас
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)}>
        <div className="email-broadcast-form__preview-modal">
          <iframe
            ref={previewRef}
            srcDoc={renderEmailPreview(htmlContent)}
            className="email-broadcast-form__preview"
            title="Email Preview"
            key={showPreview ? 'preview-visible' : 'preview-hidden'}
          />
        </div>
      </Modal>

      {/* Debug Modal */}
      <Modal open={showDebug} onClose={() => setShowDebug(false)}>
        <div className="email-broadcast-form__debug">
          <Text variant="subheader-1" className="email-broadcast-form__debug-title">Debug Information</Text>

          <div className="email-broadcast-form__debug-section">
            <Text variant="body-2" className="email-broadcast-form__debug-label">Content Type:</Text>
            <Text variant="body-2">{typeof content}</Text>
          </div>

          {typeof content === 'object' && (
            <div className="email-broadcast-form__debug-section">
              <Text variant="body-2" className="email-broadcast-form__debug-label">Content Structure:</Text>
              <pre className="email-broadcast-form__debug-pre">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          )}

          <div className="email-broadcast-form__debug-section">
            <Text variant="body-2" className="email-broadcast-form__debug-label">Generated HTML:</Text>
            <pre className="email-broadcast-form__debug-pre">
              {htmlContent}
            </pre>
          </div>

          <div className="email-broadcast-form__debug-section">
            <Text variant="body-2" className="email-broadcast-form__debug-label">Preview:</Text>
            <div className="email-broadcast-form__debug-preview">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default EmailBroadcastForm;
