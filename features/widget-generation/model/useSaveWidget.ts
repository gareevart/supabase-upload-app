"use client";

import { useState } from 'react';
import { useToaster } from '@gravity-ui/uikit';
import { WidgetApi } from '@/shared/api/widgets';
import { ParsedWidgetBlock } from '@/features/widget-runtime/lib/parseWidgetBlock';
import { UserWidget } from '@/shared/types/widget';
import { useI18n } from '@/app/contexts/I18nContext';

export function useSaveWidget(widget: ParsedWidgetBlock) {
  const toaster = useToaster();
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [savedWidget, setSavedWidget] = useState<UserWidget | null>(null);

  const saveWidget = async (isPublic: boolean) => {
    try {
      setIsSaving(true);
      const { data } = await WidgetApi.createWidget({
        title: widget.manifest.title,
        description: widget.manifest.description,
        html: widget.html,
        permissions: widget.manifest.permissions,
        is_public: isPublic,
      });
      setSavedWidget(data);
      toaster.add({
        name: `widget-saved-${data.id}`,
        title: isPublic ? t('widgetPreview.savedPublic') : t('widgetPreview.savedPrivate'),
        theme: 'success',
        autoHiding: 5000,
        actions: [
          {
            label: t('widgetPreview.open'),
            onClick: () => {
              window.location.href = `/widgets/${data.id}`;
            },
          },
        ],
      });
      return data;
    } catch (error) {
      console.error('Failed to save widget:', error);
      toaster.add({
        name: 'widget-save-error',
        title: t('widgetPreview.saveError'),
        content: error instanceof Error ? error.message : undefined,
        theme: 'danger',
        autoHiding: 6000,
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveWidget, isSaving, savedWidget };
}
