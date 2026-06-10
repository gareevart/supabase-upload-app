import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { sanitizePermissions } from '@/shared/types/widget';
import { createAdminClient } from '../../service';

const getWidgetId = (request: NextRequest) => {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments[segments.indexOf('widgets') + 1] || '';
};

const loadAccessibleWidget = async (
  admin: ReturnType<typeof createAdminClient>,
  widgetId: string,
  userId: string
) => {
  const { data, error } = await admin
    .from('user_widgets')
    .select('id, user_id, is_public, permissions')
    .eq('id', widgetId)
    .maybeSingle();

  if (error) throw error;
  if (!data || (data.user_id !== userId && !data.is_public)) return null;
  return data;
};

// GET the current user's grant for a widget
export const GET = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const admin = createAdminClient();

    const widget = await loadAccessibleWidget(admin, widgetId, user.id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const { data: grant, error } = await admin
      .from('widget_grants')
      .select('*')
      .eq('widget_id', widgetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: grant || null });
  } catch (error) {
    console.error('Error fetching widget grant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch widget grant' },
      { status: 500 }
    );
  }
});

// POST consent to widget permissions (creates/updates the grant)
export const POST = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    const widget = await loadAccessibleWidget(admin, widgetId, user.id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Grant at most what the widget declares
    const requested = sanitizePermissions(body.permissions ?? widget.permissions);
    const permissions = requested.filter((permission) =>
      (widget.permissions || []).includes(permission)
    );

    const { data, error } = await admin
      .from('widget_grants')
      .upsert([
        {
          user_id: user.id,
          widget_id: widgetId,
          permissions,
          enabled: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating widget grant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create widget grant' },
      { status: 500 }
    );
  }
});

// PATCH the enabled flag (show/hide in the navigation widgets panel)
export const PATCH = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const body = await request.json();

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const admin = createAdminClient();

    const widget = await loadAccessibleWidget(admin, widgetId, user.id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('widget_grants')
      .upsert([
        {
          user_id: user.id,
          widget_id: widgetId,
          enabled: body.enabled,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating widget grant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update widget grant' },
      { status: 500 }
    );
  }
});
