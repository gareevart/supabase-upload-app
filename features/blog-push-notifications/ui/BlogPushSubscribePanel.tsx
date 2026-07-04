'use client';

import { Bell, BellSlash } from '@gravity-ui/icons';
import { Button, Card, Icon, Text } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import { useBlogPushNotifications } from '../model/useBlogPushNotifications';
import './BlogPushSubscribePanel.css';

export function BlogPushSubscribePanel() {
  const { t } = useI18n();
  const { status, isSupported, subscribe, unsubscribe, error } = useBlogPushNotifications();

  if (!isSupported) {
    return (
      <Card className="blog-push-panel" view="filled">
        <Text variant="subheader-2">{t('blogPush.title')}</Text>
        <Text variant="body-2" color="secondary">{t('blogPush.unsupported')}</Text>
      </Card>
    );
  }

  const isSubscribed = status === 'subscribed';
  const isLoading = status === 'loading';
  const isDenied = status === 'denied';
  const isUnavailable = Boolean(error?.includes('unavailable'));

  return (
    <Card className="blog-push-panel" view="filled">
      <div className="blog-push-panel__header">
        <Icon data={isSubscribed ? Bell : BellSlash} size={18} />
        <Text variant="subheader-2">{t('blogPush.title')}</Text>
      </div>

      <Text variant="body-2" color="secondary">
        {t('blogPush.description')}
      </Text>

      {isDenied && (
        <Text variant="body-2" color="danger">{t('blogPush.denied')}</Text>
      )}

      {isUnavailable && (
        <Text variant="body-2" color="danger">{t('blogPush.unavailable')}</Text>
      )}

      {error && !isUnavailable && (
        <Text variant="body-2" color="danger">{error}</Text>
      )}

      {isSubscribed ? (
        <div className="blog-push-panel__actions">
          <Text variant="body-2" color="positive">{t('blogPush.enabled')}</Text>
          <Button
            view="outlined"
            size="l"
            loading={isLoading}
            onClick={unsubscribe}
          >
            {isLoading ? t('blogPush.loading') : t('blogPush.disable')}
          </Button>
        </div>
      ) : (
        <Button
          view="action"
          size="l"
          loading={isLoading}
          disabled={isDenied || isUnavailable}
          onClick={subscribe}
        >
          {isLoading ? t('blogPush.loading') : t('blogPush.enable')}
        </Button>
      )}
    </Card>
  );
}
