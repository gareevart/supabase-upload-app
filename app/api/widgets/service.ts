import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { sanitizePermissions, WidgetPermission } from '@/shared/types/widget';

export const MAX_WIDGET_HTML_BYTES = 200 * 1024;
export const MAX_WIDGET_TITLE_LENGTH = 255;
export const MAX_WIDGET_DESCRIPTION_LENGTH = 2000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Service role client: RLS is bypassed, every query below must filter by user explicitly
export const createAdminClient = () =>
  createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export interface WidgetValidationResult {
  title?: string;
  description?: string | null;
  html?: string;
  permissions?: WidgetPermission[];
  is_public?: boolean;
  error?: string;
}

export const validateWidgetPayload = (body: any, { partial = false } = {}): WidgetValidationResult => {
  const result: WidgetValidationResult = {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'Widget title is required' };
    }
    if (body.title.trim().length > MAX_WIDGET_TITLE_LENGTH) {
      return { error: `Widget title must be at most ${MAX_WIDGET_TITLE_LENGTH} characters` };
    }
    result.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      return { error: 'Widget description must be a string' };
    }
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    if (description && description.length > MAX_WIDGET_DESCRIPTION_LENGTH) {
      return { error: `Widget description must be at most ${MAX_WIDGET_DESCRIPTION_LENGTH} characters` };
    }
    result.description = description || null;
  }

  if (body.html !== undefined || !partial) {
    if (typeof body.html !== 'string' || !body.html.trim()) {
      return { error: 'Widget html is required' };
    }
    if (Buffer.byteLength(body.html, 'utf8') > MAX_WIDGET_HTML_BYTES) {
      return { error: `Widget html must be at most ${MAX_WIDGET_HTML_BYTES / 1024}KB` };
    }
    result.html = body.html;
  }

  if (body.permissions !== undefined || !partial) {
    const permissions = sanitizePermissions(body.permissions ?? []);
    if (Array.isArray(body.permissions) && permissions.length !== body.permissions.length) {
      return { error: 'Widget permissions contain unknown values' };
    }
    result.permissions = permissions;
  }

  if (body.is_public !== undefined) {
    if (typeof body.is_public !== 'boolean') {
      return { error: 'is_public must be a boolean' };
    }
    result.is_public = body.is_public;
  }

  return result;
};

// Adds the current user's enabled flag (from widget_grants) to each widget
export const attachEnabled = async <T extends { id: string }>(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  widgets: T[]
) => {
  const widgetIds = widgets.map((widget) => widget.id);
  if (widgetIds.length === 0) return widgets;

  const { data: grants } = await admin
    .from('widget_grants')
    .select('widget_id, enabled')
    .eq('user_id', userId)
    .in('widget_id', widgetIds);

  const enabledById = new Map((grants || []).map((grant) => [grant.widget_id, grant.enabled]));

  return widgets.map((widget) => ({
    ...widget,
    enabled: enabledById.get(widget.id) ?? false,
  }));
};

export const attachAuthors = async <T extends { user_id: string }>(
  admin: ReturnType<typeof createAdminClient>,
  widgets: T[]
) => {
  const userIds = Array.from(new Set(widgets.map((widget) => widget.user_id)));
  if (userIds.length === 0) return widgets;

  // profiles has more columns than lib/types.ts declares (name, username, avatar_url)
  const { data: profiles } = (await admin
    .from('profiles')
    .select('id, name, username, avatar_url')
    .in('id', userIds)) as unknown as {
    data: Array<{ id: string; name: string | null; username: string | null; avatar_url: string | null }> | null;
  };

  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return widgets.map((widget) => ({
    ...widget,
    author: byId.get(widget.user_id)
      ? {
          name: byId.get(widget.user_id)!.name ?? null,
          username: byId.get(widget.user_id)!.username ?? null,
          avatar_url: byId.get(widget.user_id)!.avatar_url ?? null,
        }
      : null,
  }));
};
