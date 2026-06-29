'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppLanguage } from '@/app/contexts/I18nContext';
import { APP_LANGUAGE_STORAGE_KEY, useI18n } from '@/app/contexts/I18nContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  NAVIGATION_POSITION_EVENT,
  NAVIGATION_POSITION_STORAGE_KEY,
} from '@/app/components/Navigation/navigationPosition';
import type { NavigationPosition, ThemeOption } from './types';
import { THEME_STORAGE_KEY } from './types';

const isThemeOption = (value: string | null): value is ThemeOption =>
  value === 'light' || value === 'dark' || value === 'system';

const isNavigationPosition = (value: string | null): value is NavigationPosition =>
  value === 'left' || value === 'bottom';

const isAppLanguage = (value: string | null): value is AppLanguage =>
  value === 'en' || value === 'ru';

const dispatchThemeEvents = (theme: ThemeOption) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: theme,
      oldValue: localStorage.getItem(THEME_STORAGE_KEY),
      storageArea: localStorage,
      url: window.location.href,
    }),
  );

  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
};

const dispatchNavigationEvents = (position: NavigationPosition) => {
  const previousPosition = localStorage.getItem(NAVIGATION_POSITION_STORAGE_KEY);

  localStorage.setItem(NAVIGATION_POSITION_STORAGE_KEY, position);

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: NAVIGATION_POSITION_STORAGE_KEY,
      newValue: position,
      oldValue: previousPosition,
      storageArea: localStorage,
      url: window.location.href,
    }),
  );

  window.dispatchEvent(
    new CustomEvent(NAVIGATION_POSITION_EVENT, { detail: { position } }),
  );
};

export const useAppearance = () => {
  const { user } = useAuth();
  const { setLanguage: setI18nLanguage } = useI18n();
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [navigation, setNavigation] = useState<NavigationPosition>('left');

  useEffect(() => {
    const initializeTheme = async () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

      if (isThemeOption(savedTheme)) {
        setTheme(savedTheme);
        return;
      }

      if (!user) {
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();

        if (profile?.theme && isThemeOption(profile.theme)) {
          setTheme(profile.theme);
          localStorage.setItem(THEME_STORAGE_KEY, profile.theme);
        }
      } catch (error) {
        console.error('Error fetching theme from profile:', error);
      }
    };

    void initializeTheme();
  }, [user]);

  useEffect(() => {
    const savedPosition = localStorage.getItem(NAVIGATION_POSITION_STORAGE_KEY);

    if (isNavigationPosition(savedPosition)) {
      setNavigation(savedPosition);
    }
  }, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);

    if (isAppLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
      setI18nLanguage(savedLanguage);
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    const detectedLanguage: AppLanguage = browserLanguage.startsWith('ru') ? 'ru' : 'en';
    setLanguage(detectedLanguage);
    setI18nLanguage(detectedLanguage);
  }, [setI18nLanguage]);

  const handleThemeChange = useCallback(
    async (nextTheme: ThemeOption) => {
      setTheme(nextTheme);
      dispatchThemeEvents(nextTheme);

      if (!user) {
        return;
      }

      try {
        await supabase.from('profiles').update({ theme: nextTheme }).eq('id', user.id);
      } catch (error) {
        console.error('Error saving theme to profile:', error);
      }
    },
    [user],
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: AppLanguage) => {
      setLanguage(nextLanguage);
      setI18nLanguage(nextLanguage);
    },
    [setI18nLanguage],
  );

  const handleNavigationChange = useCallback((nextPosition: NavigationPosition) => {
    setNavigation(nextPosition);
    dispatchNavigationEvents(nextPosition);
  }, []);

  return {
    theme,
    language,
    navigation,
    onThemeChange: handleThemeChange,
    onLanguageChange: handleLanguageChange,
    onNavigationChange: handleNavigationChange,
  };
};
