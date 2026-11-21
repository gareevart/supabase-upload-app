import type { SVGIconData } from '@gravity-ui/uikit';
import {
  BookOpen,
  Circles4Square,
  Picture,
  Comment,
  Envelope,
  Person,
} from '@gravity-ui/icons';
import type { FavoriteKind } from '@/entities/favorite/model/types';

const KIND_ICON_MAP: Record<FavoriteKind, SVGIconData> = {
  blog: BookOpen,
  broadcast: Envelope,
  chat: Comment,
  gallery: Picture,
  profile: Person,
  projects: Circles4Square,
};

export function getFavoriteKindIcon(kind: FavoriteKind): SVGIconData {
  return KIND_ICON_MAP[kind] ?? Circles4Square;
}