export type ThemeOption = 'light' | 'dark' | 'system';

export type NavigationPosition = 'left' | 'bottom';

export type AppearanceValues = {
  theme: ThemeOption;
  language: 'en' | 'ru';
  navigation: NavigationPosition;
};

export const THEME_STORAGE_KEY = 'app-theme';
