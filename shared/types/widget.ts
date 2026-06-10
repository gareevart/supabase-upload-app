export const WIDGET_PERMISSIONS = ['profile', 'gallery', 'camera', 'storage'] as const;

export type WidgetPermission = (typeof WIDGET_PERMISSIONS)[number];

export interface UserWidget {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  html: string;
  permissions: WidgetPermission[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  // Current user's "show in navigation widgets panel" flag (from widget_grants)
  enabled?: boolean;
}

export interface WidgetGrant {
  user_id: string;
  widget_id: string;
  permissions: WidgetPermission[];
  enabled: boolean;
  granted_at: string;
}

export interface WidgetManifest {
  title: string;
  description?: string;
  permissions: WidgetPermission[];
}

export interface NewWidget {
  title: string;
  description?: string;
  html: string;
  permissions: WidgetPermission[];
  is_public: boolean;
}

export interface WidgetError {
  error: string;
  details?: string;
}

export const isWidgetPermission = (value: string): value is WidgetPermission =>
  (WIDGET_PERMISSIONS as readonly string[]).includes(value);

export const sanitizePermissions = (values: unknown): WidgetPermission[] => {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is WidgetPermission =>
    typeof value === 'string' && isWidgetPermission(value)
  );
};
