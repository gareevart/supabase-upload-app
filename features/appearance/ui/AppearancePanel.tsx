'use client';

import { SegmentedRadioGroup, Text } from '@gravity-ui/uikit';
import type { AppLanguage } from '@/app/contexts/I18nContext';
import { useI18n } from '@/app/contexts/I18nContext';
import type { NavigationPosition, ThemeOption } from '../model/types';
import { useAppearance } from '../model/useAppearance';
import './AppearancePanel.css';

export type AppearancePanelProps = {
  theme: ThemeOption;
  language: AppLanguage;
  navigation: NavigationPosition;
  onThemeChange: (theme: ThemeOption) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onNavigationChange: (navigation: NavigationPosition) => void;
  className?: string;
  fullWidth?: boolean;
};

type AppearanceRowProps = {
  label: string;
  children: React.ReactNode;
};

function AppearanceRow({ label, children }: AppearanceRowProps) {
  return (
    <div className="appearance-panel__row">
      <Text variant="body-1" color="complementary" className="appearance-panel__label">
        {label}
      </Text>
      <div className="appearance-panel__control">{children}</div>
    </div>
  );
}

export function AppearancePanel({
  theme,
  language,
  navigation,
  onThemeChange,
  onLanguageChange,
  onNavigationChange,
  className,
  fullWidth = false,
}: AppearancePanelProps) {
  const { t } = useI18n();

  const panelClassName = [
    'appearance-panel',
    fullWidth ? 'appearance-panel--full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClassName} aria-label={t('appearancePanel.title')}>
      <Text variant="subheader-3">{t('appearancePanel.title')}</Text>

      <AppearanceRow label={t('appearancePanel.theme')}>
        <SegmentedRadioGroup
          name="appearance-theme"
          value={theme}
          onUpdate={(value) => {
            if (value === 'light' || value === 'dark' || value === 'system') {
              onThemeChange(value);
            }
          }}
          size="m"
          width="max"
        >
          <SegmentedRadioGroup.Option value="light">
            {t('appearancePanel.theme.light')}
          </SegmentedRadioGroup.Option>
          <SegmentedRadioGroup.Option value="dark">
            {t('appearancePanel.theme.dark')}
          </SegmentedRadioGroup.Option>
          <SegmentedRadioGroup.Option value="system">
            {t('appearancePanel.theme.system')}
          </SegmentedRadioGroup.Option>
        </SegmentedRadioGroup>
      </AppearanceRow>

      <AppearanceRow label={t('appearancePanel.language')}>
        <SegmentedRadioGroup
          name="appearance-language"
          value={language}
          onUpdate={(value) => {
            if (value === 'en' || value === 'ru') {
              onLanguageChange(value);
            }
          }}
          size="m"
          width="max"
        >
          <SegmentedRadioGroup.Option value="en">
            {t('appearancePanel.language.en')}
          </SegmentedRadioGroup.Option>
          <SegmentedRadioGroup.Option value="ru">
            {t('appearancePanel.language.ru')}
          </SegmentedRadioGroup.Option>
        </SegmentedRadioGroup>
      </AppearanceRow>

      <AppearanceRow label={t('appearancePanel.navigation')}>
        <SegmentedRadioGroup
          name="appearance-navigation"
          value={navigation}
          onUpdate={(value) => {
            if (value === 'left' || value === 'bottom') {
              onNavigationChange(value);
            }
          }}
          size="m"
          width="max"
        >
          <SegmentedRadioGroup.Option value="left">
            {t('appearancePanel.navigation.left')}
          </SegmentedRadioGroup.Option>
          <SegmentedRadioGroup.Option value="bottom">
            {t('appearancePanel.navigation.bottom')}
          </SegmentedRadioGroup.Option>
        </SegmentedRadioGroup>
      </AppearanceRow>
    </section>
  );
}

export function AppearancePanelConnected({ className, fullWidth }: Pick<AppearancePanelProps, 'className' | 'fullWidth'>) {
  const appearance = useAppearance();

  return <AppearancePanel {...appearance} className={className} fullWidth={fullWidth} />;
}
