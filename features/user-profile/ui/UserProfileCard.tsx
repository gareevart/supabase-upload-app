'use client';

import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  DefinitionList,
  Text,
} from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import type { Profile } from '@/app/auth/profile/types';
import { getBlobPreviewUrl } from '@/lib/blobUrl';
import '@/features/appearance/ui/AppearancePanel.css';
import './UserProfileCard.css';

export type UserProfileCardProps = {
  profile: Profile;
  email: string;
  isEditing?: boolean;
  editContent?: ReactNode;
  onEdit: () => void;
  onLogout: () => void;
  className?: string;
  fullWidth?: boolean;
};

export function UserProfileCard({
  profile,
  email,
  isEditing = false,
  editContent,
  onEdit,
  onLogout,
  className,
  fullWidth = true,
}: UserProfileCardProps) {
  const { t } = useI18n();
  const avatarUrl = getBlobPreviewUrl(profile.avatar_url);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  const avatarLabel = profile.name || profile.username || email || t('userProfileCard.title');
  const avatarInitials = avatarLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const empty = t('userProfileCard.empty');

  const panelClassName = [
    'appearance-panel',
    'user-profile-card',
    fullWidth ? 'appearance-panel--full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClassName} aria-label={t('userProfileCard.title')}>
      <Text variant="subheader-3">{t('userProfileCard.title')}</Text>
      {isEditing && editContent ? (
        <div className="user-profile-card__edit">{editContent}</div>
      ) : (
        <div className="user-profile-card__view">
          {avatarUrl && !avatarLoadFailed ? (
            <div className="user-profile-card__avatar-wrapper">
              <Image
                src={avatarUrl}
                alt={`${avatarLabel} avatar`}
                fill
                unoptimized
                className="user-profile-card__avatar"
                sizes="80px"
                onError={() => setAvatarLoadFailed(true)}
              />
            </div>
          ) : (
            <Avatar
              size="xl"
              text={avatarInitials}
              aria-label={`${avatarLabel} avatar`}
            />
          )}
          <div className="responsive-definition-list">
            <DefinitionList responsive direction="vertical">
              <DefinitionList.Item name={t('userProfileCard.email')} copyText={email}>
                {email}
              </DefinitionList.Item>
              <DefinitionList.Item name={t('userProfileCard.name')}>
                {profile.name || empty}
              </DefinitionList.Item>
              <DefinitionList.Item name={t('userProfileCard.username')}>
                {profile.username || empty}
              </DefinitionList.Item>
              <DefinitionList.Item name={t('userProfileCard.bio')}>
                {profile.bio || empty}
              </DefinitionList.Item>
              <DefinitionList.Item name={t('userProfileCard.role')}>
                {profile.role || empty}
              </DefinitionList.Item>
              <DefinitionList.Item name={t('userProfileCard.site')}>
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                ) : (
                  empty
                )}
              </DefinitionList.Item>
            </DefinitionList>
          </div>
        </div>
      )}
      {!isEditing ? (
        <div className="user-profile-card__actions">
          <Button size="l" view="action" onClick={onEdit}>
            {t('userProfileCard.edit')}
          </Button>
          <Button size="l" view="normal" onClick={onLogout}>
            {t('userProfileCard.logout')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}