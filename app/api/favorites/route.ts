import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { createAdminClient } from '@/app/api/widgets/service';
import { FAVORITE_KINDS, type FavoriteKind } from '@/entities/favorite/model/types';
import { normalizeFavoriteHref } from '@/entities/favorite/lib/normalizeHref';

const MAX_TITLE_LENGTH = 500;

function isFavoriteKind(value: unknown): value is FavoriteKind {
  return typeof value === 'string' && (FAVORITE_KINDS as readonly string[]).includes(value);
}

function parseFavoriteBody(body: unknown): { href: string; title: string; kind: FavoriteKind } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const { href, title, kind } = body as Record<string, unknown>;

  if (typeof href !== 'string' || !href.trim()) {
    return { error: 'href is required' };
  }

  const normalizedHref = normalizeFavoriteHref(href);
  if (normalizedHref.length > 2048) {
    return { error: 'href is too long' };
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'title is required' };
  }

  const trimmedTitle = title.trim().slice(0, MAX_TITLE_LENGTH);

  if (!isFavoriteKind(kind)) {
    return { error: 'kind is invalid' };
  }

  return { href: normalizedHref, title: trimmedTitle, kind };
}

export const GET = withAuth(async (_request: NextRequest, user: { id: string }) => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch favorites' },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const parsed = parseFavoriteBody(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('user_favorites')
      .upsert(
        {
          user_id: user.id,
          href: parsed.href,
          title: parsed.title,
          kind: parsed.kind,
        },
        { onConflict: 'user_id,href' },
      )
      .select();

    if (error) throw error;

    const data = rows?.[0];
    if (!data) {
      return NextResponse.json({ error: 'Favorite was not saved' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error saving favorite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save favorite' },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    let href: string | null = request.nextUrl.searchParams.get('href');

    if (!href) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === 'object' && typeof (body as { href?: unknown }).href === 'string') {
        href = (body as { href: string }).href;
      }
    }

    if (!href?.trim()) {
      return NextResponse.json({ error: 'href is required' }, { status: 400 });
    }

    const normalizedHref = normalizeFavoriteHref(href);
    const admin = createAdminClient();
    const { error } = await admin
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('href', normalizedHref);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete favorite' },
      { status: 500 },
    );
  }
});