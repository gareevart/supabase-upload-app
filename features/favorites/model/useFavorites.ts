'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/app/contexts/AuthContext';
import type { FavoriteDescriptor, FavoriteKind, UserFavorite } from '@/entities/favorite/model/types';
import { normalizeFavoriteHref } from '@/entities/favorite/lib/normalizeHref';

export const FAVORITES_CHANGED_EVENT = 'favoritesChanged';

type FavoritesResponse = {
  data: UserFavorite[];
};

async function favoritesFetcher(url: string): Promise<FavoritesResponse> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to load favorites');
  }
  return response.json() as Promise<FavoritesResponse>;
}

function dispatchFavoritesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function useFavorites() {
  const { user } = useAuth();
  const swrKey = user ? '/api/favorites' : null;

  const { data, error, isLoading, mutate } = useSWR<FavoritesResponse>(swrKey, favoritesFetcher, {
    revalidateOnFocus: true,
  });

  const favorites = data?.data ?? [];

  const isFavorite = useCallback(
    (href: string) => {
      const normalized = normalizeFavoriteHref(href);
      return favorites.some((item) => item.href === normalized);
    },
    [favorites],
  );

  const addFavorite = useCallback(
    async (descriptor: FavoriteDescriptor) => {
      if (!user) return false;

      const payload = {
        href: normalizeFavoriteHref(descriptor.href),
        title: descriptor.title.trim(),
        kind: descriptor.kind,
      };

      const optimistic: UserFavorite = {
        id: `optimistic-${payload.href}`,
        user_id: user.id,
        href: payload.href,
        title: payload.title,
        kind: payload.kind as FavoriteKind,
        created_at: new Date().toISOString(),
      };

      await mutate(
        async () => {
          const response = await fetch('/api/favorites', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? 'Failed to save favorite');
          }

          const json = (await response.json()) as { data: UserFavorite };
          const next = [
            json.data,
            ...favorites.filter((item) => item.href !== payload.href),
          ];
          dispatchFavoritesChanged();
          return { data: next };
        },
        {
          optimisticData: { data: [optimistic, ...favorites.filter((item) => item.href !== payload.href)] },
          rollbackOnError: true,
          revalidate: true,
        },
      );

      return true;
    },
    [favorites, mutate, user],
  );

  const removeFavorite = useCallback(
    async (href: string) => {
      if (!user) return false;

      const normalized = normalizeFavoriteHref(href);
      const previous = favorites;

      await mutate(
        async () => {
          const response = await fetch(`/api/favorites?href=${encodeURIComponent(normalized)}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? 'Failed to remove favorite');
          }

          dispatchFavoritesChanged();
          return { data: previous.filter((item) => item.href !== normalized) };
        },
        {
          optimisticData: { data: previous.filter((item) => item.href !== normalized) },
          rollbackOnError: true,
          revalidate: true,
        },
      );

      return true;
    },
    [favorites, mutate, user],
  );

  const toggleFavorite = useCallback(
    async (descriptor: FavoriteDescriptor) => {
      const normalized = normalizeFavoriteHref(descriptor.href);
      if (isFavorite(normalized)) {
        return removeFavorite(normalized);
      }
      return addFavorite(descriptor);
    },
    [addFavorite, isFavorite, removeFavorite],
  );

  return {
    favorites,
    isLoading,
    error,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    mutate,
  };
}