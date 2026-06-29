"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import homeEn from '@/app/HomeClient.i18n/en.json';
import homeRu from '@/app/HomeClient.i18n/ru.json';
import appearancePanelEn from '@/features/appearance/ui/AppearancePanel.i18n/en.json';
import appearancePanelRu from '@/features/appearance/ui/AppearancePanel.i18n/ru.json';
import dangerZoneEn from '@/app/auth/profile/components/DangerZoneSection.i18n/en.json';
import dangerZoneRu from '@/app/auth/profile/components/DangerZoneSection.i18n/ru.json';
import broadcastFormEn from '@/widgets/broadcast-form/ui/BroadcastFormWidget.i18n/en.json';
import broadcastFormRu from '@/widgets/broadcast-form/ui/BroadcastFormWidget.i18n/ru.json';
import navigationEn from '@/app/components/Navigation/Navigation.i18n/en.json';
import navigationRu from '@/app/components/Navigation/Navigation.i18n/ru.json';
import chatMessageFormEn from '@/app/components/chat/ChatMessageForm.i18n/en.json';
import chatMessageFormRu from '@/app/components/chat/ChatMessageForm.i18n/ru.json';
import widgetCameraDialogEn from '@/features/widget-runtime/ui/WidgetCameraDialog.i18n/en.json';
import widgetCameraDialogRu from '@/features/widget-runtime/ui/WidgetCameraDialog.i18n/ru.json';
import widgetPermissionsDialogEn from '@/features/widget-runtime/ui/WidgetPermissionsDialog.i18n/en.json';
import widgetPermissionsDialogRu from '@/features/widget-runtime/ui/WidgetPermissionsDialog.i18n/ru.json';
import userWidgetPanelEn from '@/features/widget-runtime/ui/UserWidgetPanel.i18n/en.json';
import userWidgetPanelRu from '@/features/widget-runtime/ui/UserWidgetPanel.i18n/ru.json';
import widgetPreviewCardEn from '@/features/widget-generation/ui/WidgetPreviewCard.i18n/en.json';
import widgetPreviewCardRu from '@/features/widget-generation/ui/WidgetPreviewCard.i18n/ru.json';
import widgetGridEn from '@/features/widget-list/ui/WidgetGrid.i18n/en.json';
import widgetGridRu from '@/features/widget-list/ui/WidgetGrid.i18n/ru.json';
import widgetGalleryEn from '@/widgets/widget-gallery/ui/WidgetGalleryWidget.i18n/en.json';
import widgetGalleryRu from '@/widgets/widget-gallery/ui/WidgetGalleryWidget.i18n/ru.json';
import widgetViewEn from '@/widgets/widget-view/ui/WidgetViewWidget.i18n/en.json';
import widgetViewRu from '@/widgets/widget-view/ui/WidgetViewWidget.i18n/ru.json';
import blogPageEn from '@/app/blog/BlogPage.i18n/en.json';
import blogPageRu from '@/app/blog/BlogPage.i18n/ru.json';
import blogPostCardEn from '@/shared/ui/BlogPostCard.i18n/en.json';
import blogPostCardRu from '@/shared/ui/BlogPostCard.i18n/ru.json';
import blogPostViewEn from '@/app/blog/[slug]/BlogPostClient.i18n/en.json';
import blogPostViewRu from '@/app/blog/[slug]/BlogPostClient.i18n/ru.json';
import blogEditorEn from '@/app/components/blog/BlogEditor.i18n/en.json';
import blogEditorRu from '@/app/components/blog/BlogEditor.i18n/ru.json';
import broadcastDetailEn from '@/widgets/broadcast-detail/ui/BroadcastDetailWidget.i18n/en.json';
import broadcastDetailRu from '@/widgets/broadcast-detail/ui/BroadcastDetailWidget.i18n/ru.json';

export type AppLanguage = 'en' | 'ru';

type TranslationValue = string;
type TranslationDict = Record<string, TranslationValue>;

const enTranslations: TranslationDict = {
  ...homeEn,
  ...appearancePanelEn,
  ...dangerZoneEn,
  ...broadcastFormEn,
  ...navigationEn,
  ...chatMessageFormEn,
  ...widgetCameraDialogEn,
  ...widgetPermissionsDialogEn,
  ...userWidgetPanelEn,
  ...widgetPreviewCardEn,
  ...widgetGridEn,
  ...widgetGalleryEn,
  ...widgetViewEn,
  ...blogPageEn,
  ...blogPostCardEn,
  ...blogPostViewEn,
  ...blogEditorEn,
  ...broadcastDetailEn,
};

const ruTranslations: TranslationDict = {
  ...homeRu,
  ...appearancePanelRu,
  ...dangerZoneRu,
  ...broadcastFormRu,
  ...navigationRu,
  ...chatMessageFormRu,
  ...widgetCameraDialogRu,
  ...widgetPermissionsDialogRu,
  ...userWidgetPanelRu,
  ...widgetPreviewCardRu,
  ...widgetGridRu,
  ...widgetGalleryRu,
  ...widgetViewRu,
  ...blogPageRu,
  ...blogPostCardRu,
  ...blogPostViewRu,
  ...blogEditorRu,
  ...broadcastDetailRu,
};

const translations: Record<AppLanguage, TranslationDict> = {
  en: enTranslations,
  ru: ruTranslations,
};

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'app-language';

export const APP_LANGUAGE_STORAGE_KEY = STORAGE_KEY;

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY);

    if (savedLanguage === 'en' || savedLanguage === 'ru') {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    const detectedLanguage: AppLanguage = browserLanguage.startsWith('ru') ? 'ru' : 'en';
    setLanguageState(detectedLanguage);
    document.documentElement.lang = detectedLanguage;
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'en' || event.newValue === 'ru')) {
        setLanguageState(event.newValue);
        document.documentElement.lang = event.newValue;
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.error('Failed to persist language preference:', error);
    }

    document.documentElement.lang = nextLanguage;
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
};
