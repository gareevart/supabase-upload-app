'use client';

import { useState, type MouseEvent } from 'react';
import { Button, Icon } from '@gravity-ui/uikit';
import { useToast } from '@/hooks/use-toast';
import { Star, StarFill } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { useAuth } from '@/app/contexts/AuthContext';
import type { FavoriteDescriptor } from '@/entities/favorite/model/types';
import { normalizeFavoriteHref } from '@/entities/favorite/lib/normalizeHref';
import { useFavorites } from '@/features/favorites/model/useFavorites';

type FavoriteToggleButtonProps = FavoriteDescriptor & {
  className?: string;
};

export function FavoriteToggleButton({ href, title, kind, className }: FavoriteToggleButtonProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  if (!user) {
    return null;
  }

  const normalizedHref = normalizeFavoriteHref(href);
  const favorited = isFavorite(normalizedHref);
  const label = favorited ? t('favorites.removeFromFavorites') : t('favorites.addToFavorites');

  const handleToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;
    setIsPending(true);
    try {
      await toggleFavorite({ href: normalizedHref, title, kind });
    } catch (error) {
      toast({
        title: t('favorites.errorTitle'),
        description: error instanceof Error ? error.message : t('favorites.errorGeneric'),
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      className={className}
      view="flat"
      size="s"
      loading={isPending}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      onClick={(event) => {
        void handleToggle(event);
      }}
    >
      <Icon data={favorited ? StarFill : Star} size={16} />
    </Button>
  );
}