"use client";

import { Icon, SegmentedRadioGroup, Text } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Text variant="body-2">{t('profile.appearance.language')}</Text>
      <SegmentedRadioGroup
        name="language-toggle"
        value={language}
        onUpdate={(nextLanguage) => {
          if (nextLanguage === 'en' || nextLanguage === 'ru') {
            setLanguage(nextLanguage);
          }
        }}
        size="l"
        width="auto"
      >
        <SegmentedRadioGroup.Option value="en">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon data={Globe} size={16} />
            {t('profile.language.en')}
          </div>
        </SegmentedRadioGroup.Option>

        <SegmentedRadioGroup.Option value="ru">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon data={Globe} size={16} />
            {t('profile.language.ru')}
          </div>
        </SegmentedRadioGroup.Option>
      </SegmentedRadioGroup>
    </div>
  );
};
