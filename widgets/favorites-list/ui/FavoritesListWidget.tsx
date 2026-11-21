'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Icon,
  PlaceholderContainer,
  Spin,
  Table,
  Text,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { StarFill } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { useFavorites } from '@/features/favorites/model/useFavorites';
import { getFavoriteKindIcon } from '@/entities/favorite/lib/favoriteKindIcon';
import type { FavoriteKind, UserFavorite } from '@/entities/favorite/model/types';
import './FavoritesListWidget.css';

function kindLabel(t: (key: string) => string, kind: FavoriteKind) {
  return t(`favorites.kind.${kind}`);
}

export function FavoritesListWidget() {
  const { t } = useI18n();
  const router = useRouter();
  const { favorites, isLoading, removeFavorite } = useFavorites();

  const columns = useMemo((): TableColumnConfig<UserFavorite>[] => [
    {
      id: 'title',
      name: t('favorites.tablePage'),
      template: (item) => (
        <Link href={item.href} className="favorites-list__title-link" onClick={(e) => e.stopPropagation()}>
          <Text variant="body-1" className="favorites-list__title">
            {item.title}
          </Text>
        </Link>
      ),
    },
    {
      id: 'type',
      name: t('favorites.tableType'),
      width: 160,
      template: (item) => (
        <div className="favorites-list__type">
          <Icon data={getFavoriteKindIcon(item.kind as FavoriteKind)} size={16} />
          <Text variant="body-2">{kindLabel(t, item.kind as FavoriteKind)}</Text>
        </div>
      ),
    },
    {
      id: 'actions',
      name: '',
      width: 48,
      sticky: 'end',
      template: (item) => (
        <div
          className="favorites-list__actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button
            view="flat"
            size="s"
            aria-label={t('favorites.removeItem')}
            title={t('favorites.removeItem')}
            onClick={() => {
              void removeFavorite(item.href);
            }}
          >
            <Icon data={StarFill} size={16} />
          </Button>
        </div>
      ),
    },
  ], [removeFavorite, t]);

  return (
    <div className="hub-page favorites-page">
      <main className="hub-page__main favorites-page__main">
        <header className="hub-page__header favorites-page__header">
          <Text as="h1" variant="display-1">
            {t('favorites.pageTitle')}
          </Text>
        </header>

        {isLoading ? (
          <Spin size="l" />
        ) : favorites.length === 0 ? (
          <div className="favorites-list__empty">
            <PlaceholderContainer
              size="l"
              title={t('favorites.emptyTitle')}
              description={t('favorites.emptyDescription')}
              image={<Icon data={StarFill} size={48} />}
            />
          </div>
        ) : (
          <Table
            className="favorites-list__table"
            data={favorites}
            columns={columns}
            verticalAlign="middle"
            onRowClick={(item) => router.push(item.href)}
          />
        )}
      </main>
    </div>
  );
}