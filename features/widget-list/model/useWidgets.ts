"use client";

import { useCallback, useEffect, useState } from 'react';
import { WidgetApi } from '@/shared/api/widgets';
import { UserWidget } from '@/shared/types/widget';

// Saved widgets changed (created/deleted/toggled) — used to refresh the navigation panel
export const USER_WIDGETS_EVENT = 'userWidgetsChanged';

export const notifyUserWidgetsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_WIDGETS_EVENT));
  }
};

export function useWidgets(scope: 'my' | 'public') {
  const [widgets, setWidgets] = useState<UserWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { data } =
        scope === 'my' ? await WidgetApi.getMyWidgets() : await WidgetApi.getPublicWidgets();
      setWidgets(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load widgets');
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setWidgetEnabled = useCallback(async (widgetId: string, enabled: boolean) => {
    await WidgetApi.setWidgetEnabled(widgetId, enabled);
    setWidgets((prev) =>
      prev.map((widget) => (widget.id === widgetId ? { ...widget, enabled } : widget))
    );
    notifyUserWidgetsChanged();
  }, []);

  const deleteWidget = useCallback(async (widgetId: string) => {
    await WidgetApi.deleteWidget(widgetId);
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
    notifyUserWidgetsChanged();
  }, []);

  const setWidgetVisibility = useCallback(async (widgetId: string, isPublic: boolean) => {
    const { data } = await WidgetApi.updateWidget(widgetId, { is_public: isPublic });
    setWidgets((prev) =>
      prev.map((widget) => (widget.id === widgetId ? { ...widget, is_public: data.is_public } : widget))
    );
  }, []);

  return {
    widgets,
    isLoading,
    error,
    refresh,
    setWidgetEnabled,
    deleteWidget,
    setWidgetVisibility,
  };
}
