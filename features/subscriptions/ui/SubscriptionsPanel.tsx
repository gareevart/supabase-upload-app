'use client';

import { Switch, Text } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import '@/features/appearance/ui/AppearancePanel.css';
import './SubscriptionsPanel.css';

type SubscriptionsRowProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

function SubscriptionsRow({ label, children, hint }: SubscriptionsRowProps) {
  return (
    <>
      <div className="appearance-panel__row">
        <Text variant="body-1" color="complementary" className="appearance-panel__label">
          {label}
        </Text>
        <div className="appearance-panel__control">
          {children}
        </div>
      </div>
      {hint ? (
        <Text variant="body-2" color="secondary" className="subscriptions-panel__hint">
          {hint}
        </Text>
      ) : null}
    </>
  );
}

export type SubscriptionsPanelProps = {
  emailSubscribed: boolean;
  emailLoading: boolean;
  onEmailSubscriptionChange: (enabled: boolean) => void;
  fullWidth?: boolean;
};

export function SubscriptionsPanel({
  emailSubscribed,
  emailLoading,
  onEmailSubscriptionChange,
  fullWidth = false,
}: SubscriptionsPanelProps) {
  const { t } = useI18n();

  const panelClassName = [
    'appearance-panel',
    fullWidth ? 'appearance-panel--full-width' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className={panelClassName} aria-label={t('subscriptionsPanel.title')}>
      <Text variant="subheader-3">{t('subscriptionsPanel.title')}</Text>

      <SubscriptionsRow label={t('subscriptionsPanel.emailNewsletter')}>
        <Switch
          size="l"
          checked={emailSubscribed}
          disabled={emailLoading}
          onUpdate={onEmailSubscriptionChange}
          content={emailSubscribed
            ? t('subscriptionsPanel.emailSubscribed')
            : t('subscriptionsPanel.emailNotSubscribed')}
        />
      </SubscriptionsRow>
    </section>
  );
}
