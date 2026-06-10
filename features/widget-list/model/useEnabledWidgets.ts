"use client";

import { useCallback, useEffect, useState } from 'react';
import { WidgetApi } from '@/shared/api/widgets';
import { UserWidget } from '@/shared/types/widget';
import { supabase } from '@/lib/supabase';
import { USER_WIDGETS_EVENT } from './useWidgets';

// Widgets enabled for the current user's navigation widgets panel.
// Refreshes when widgets are saved/toggled elsewhere in the app.
export function useEnabledWidgets() {
  const [widgets, setWidgets] = useState<UserWidget[]>([]);

  const refresh = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.user) {
        setWidgets([]);
        return;
      }
      const { data } = await WidgetApi.getEnabledWidgets();
      setWidgets(data);
    } catch (error) {
      console.error('Failed to load enabled widgets:', error);
      setWidgets([]);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handleChange = () => void refresh();
    window.addEventListener(USER_WIDGETS_EVENT, handleChange);
    return () => window.removeEventListener(USER_WIDGETS_EVENT, handleChange);
  }, [refresh]);

  return { widgets, refresh };
}
