import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { createAdminClient } from '../../service';

const MAX_KEY_LENGTH = 255;
const MAX_VALUE_BYTES = 32 * 1024;

const getWidgetId = (request: NextRequest) => {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments[segments.indexOf('widgets') + 1] || '';
};

const checkStorageAccess = async (
  admin: ReturnType<typeof createAdminClient>,
  widgetId: string,
  userId: string
) => {
  const { data: widget, error } = await admin
    .from('user_widgets')
    .select('id, user_id, is_public, permissions')
    .eq('id', widgetId)
    .maybeSingle();

  if (error) throw error;
  if (!widget || (widget.user_id !== userId && !widget.is_public)) return false;
  if (!(widget.permissions || []).includes('storage')) return false;

  const { data: grant } = await admin
    .from('widget_grants')
    .select('permissions')
    .eq('widget_id', widgetId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(grant && (grant.permissions || []).includes('storage'));
};

// GET a value from the widget's per-user key-value storage
export const GET = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const key = new URL(request.url).searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    if (!(await checkStorageAccess(admin, widgetId, user.id))) {
      return NextResponse.json({ error: 'Storage permission not granted' }, { status: 403 });
    }

    const { data, error } = await admin
      .from('widget_storage')
      .select('value')
      .eq('widget_id', widgetId)
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ value: data?.value ?? null });
  } catch (error) {
    console.error('Error reading widget storage:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read widget storage' },
      { status: 500 }
    );
  }
});

// PUT a value into the widget's per-user key-value storage
export const PUT = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const body = await request.json();
    const { key, value } = body;

    if (typeof key !== 'string' || !key || key.length > MAX_KEY_LENGTH) {
      return NextResponse.json({ error: 'key must be a non-empty string' }, { status: 400 });
    }

    if (value !== null && Buffer.byteLength(JSON.stringify(value ?? null), 'utf8') > MAX_VALUE_BYTES) {
      return NextResponse.json(
        { error: `value must be at most ${MAX_VALUE_BYTES / 1024}KB` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    if (!(await checkStorageAccess(admin, widgetId, user.id))) {
      return NextResponse.json({ error: 'Storage permission not granted' }, { status: 403 });
    }

    const { error } = await admin.from('widget_storage').upsert([
      {
        widget_id: widgetId,
        user_id: user.id,
        key,
        value: value ?? null,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing widget storage:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write widget storage' },
      { status: 500 }
    );
  }
});
