"use client";

import { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Spin } from '@gravity-ui/uikit';

// Dynamically import the widget to prevent SSR issues
const WidgetViewWidget = dynamicImport(
  () => import('@/widgets/widget-view/ui/WidgetViewWidget').then((mod) => mod.WidgetViewWidget),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spin size="l" />
      </div>
    ),
  }
);

export default function WidgetViewPageClient({ widgetId }: { widgetId: string }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = '/auth';
        return;
      }

      setIsReady(true);
    };

    void checkAuth();
  }, []);

  if (!isReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spin size="l" />
      </div>
    );
  }

  return <WidgetViewWidget widgetId={widgetId} />;
}
