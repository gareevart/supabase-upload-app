"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import homeEn from '@/app/HomeClient.i18n/en.json';
import homeRu from '@/app/HomeClient.i18n/ru.json';
import languageToggleEn from '@/app/components/Navigation/LanguageToggle.i18n/en.json';
import languageToggleRu from '@/app/components/Navigation/LanguageToggle.i18n/ru.json';
import profileViewEn from '@/app/auth/profile/components/ProfileView.i18n/en.json';
import profileViewRu from '@/app/auth/profile/components/ProfileView.i18n/ru.json';
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

export type AppLanguage = 'en' | 'ru';

type TranslationValue = string;
type TranslationDict = Record<string, TranslationValue>;

const enTranslations: TranslationDict = {
  ...homeEn,
  ...languageToggleEn,
  ...profileViewEn,
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
};

const ruTranslations: TranslationDict = {
  ...homeRu,
  ...languageToggleRu,
  ...profileViewRu,
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
    localStorage.setItem(STORAGE_KEY, nextLanguage);
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
