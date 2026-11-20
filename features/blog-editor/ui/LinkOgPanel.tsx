'use client';

import React from 'react';
import { Switch } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import type { LinkOgSettings } from '@/shared/lib/blog/linkOg';
import './LinkOgPanel.css';

interface LinkOgPanelProps {
  settings: LinkOgSettings;
  onChange: (enabled: boolean) => void;
}

export const LinkOgPanel: React.FC<LinkOgPanelProps> = ({ settings, onChange }) => {
  const { t } = useI18n();

  return (
    <section className="link-og-switch">
      <Switch
        size="l"
        checked={settings.enabled}
        onUpdate={onChange}
        content={t('linkOg.master')}
      />
    </section>
  );
};
