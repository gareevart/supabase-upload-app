export const FAVORITE_KINDS = [
  'blog',
  'broadcast',
  'chat',
  'gallery',
  'profile',
  'projects',
] as const;

export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export type UserFavorite = {
  id: string;
  user_id: string;
  href: string;
  title: string;
  kind: FavoriteKind;
  created_at: string;
};

export type FavoriteDescriptor = {
  href: string;
  title: string;
  kind: FavoriteKind;
};