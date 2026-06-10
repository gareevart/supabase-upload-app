import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { attachAuthors, createAdminClient, validateWidgetPayload } from '../service';

const getWidgetId = (request: NextRequest) => {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments[segments.indexOf('widgets') + 1] || '';
};

// GET a widget (own or public) together with the current user's grant
export const GET = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .select('*')
      .eq('id', widgetId)
      .maybeSingle();

    if (error) throw error;

    if (!data || (data.user_id !== user.id && !data.is_public)) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const { data: grant } = await admin
      .from('widget_grants')
      .select('*')
      .eq('widget_id', widgetId)
      .eq('user_id', user.id)
      .maybeSingle();

    const [withAuthor] = await attachAuthors(admin, [data]);

    return NextResponse.json({ data: withAuthor, grant: grant || null });
  } catch (error) {
    console.error('Error fetching widget:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch widget' },
      { status: 500 }
    );
  }
});

// PATCH widget metadata (owner only)
export const PATCH = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const body = await request.json();
    const validated = validateWidgetPayload(body, { partial: true });

    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (validated.title !== undefined) updates.title = validated.title;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.html !== undefined) updates.html = validated.html;
    if (validated.permissions !== undefined) updates.permissions = validated.permissions;
    if (validated.is_public !== undefined) updates.is_public = validated.is_public;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .update(updates)
      .eq('id', widgetId)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update widget' },
      { status: 500 }
    );
  }
});

// DELETE a widget (owner only)
export const DELETE = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const widgetId = getWidgetId(request);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .delete()
      .eq('id', widgetId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete widget' },
      { status: 500 }
    );
  }
});
