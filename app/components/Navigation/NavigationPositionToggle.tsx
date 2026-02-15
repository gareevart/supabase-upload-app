"use client";

import { Icon, SegmentedRadioGroup, Text } from '@gravity-ui/uikit';
import { Bars, Circles4Square } from '@gravity-ui/icons';
import { useEffect, useState } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { NAVIGATION_POSITION_EVENT, NAVIGATION_POSITION_STORAGE_KEY, NavigationPosition } from './navigationPosition';

export const NavigationPositionToggle = () => {
  const { t } = useI18n();
  const [position, setPosition] = useState<NavigationPosition>('left');

  useEffect(() => {
    const savedPosition = localStorage.getItem(NAVIGATION_POSITION_STORAGE_KEY);
    if (savedPosition === 'bottom' || savedPosition === 'left') {
      setPosition(savedPosition);
    }
  }, []);

  const handlePositionChange = (nextPosition: string) => {
    if (nextPosition !== 'bottom' && nextPosition !== 'left') {
      return;
    }

    const previousPosition = localStorage.getItem(NAVIGATION_POSITION_STORAGE_KEY);

    setPosition(nextPosition);
    localStorage.setItem(NAVIGATION_POSITION_STORAGE_KEY, nextPosition);

    const storageEvent = new StorageEvent('storage', {
      key: NAVIGATION_POSITION_STORAGE_KEY,
      newValue: nextPosition,
      oldValue: previousPosition,
      storageArea: localStorage,
      url: window.location.href,
    });

    window.dispatchEvent(storageEvent);
    window.dispatchEvent(new CustomEvent(NAVIGATION_POSITION_EVENT, {
      detail: { position: nextPosition },
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Text variant="body-2">{t('profile.appearance.navigationPosition')}</Text>
      <SegmentedRadioGroup
        name="navigation-position-toggle"
        value={position}
        onUpdate={handlePositionChange}
        size="l"
        width="auto"
      >
        <SegmentedRadioGroup.Option value="left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon data={Circles4Square} size={16} />
            {t('profile.appearance.navigationPosition.left')}
          </div>
        </SegmentedRadioGroup.Option>

        <SegmentedRadioGroup.Option value="bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon data={Bars} size={16} />
            {t('profile.appearance.navigationPosition.bottom')}
          </div>
        </SegmentedRadioGroup.Option>
      </SegmentedRadioGroup>
    </div>
  );
};
