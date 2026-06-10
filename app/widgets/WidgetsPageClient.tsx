"use client";

import { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Spin } from '@gravity-ui/uikit';

// Dynamically import the widget to prevent SSR issues
const WidgetGalleryWidget = dynamicImport(
  () => import('@/widgets/widget-gallery/ui/WidgetGalleryWidget').then((mod) => mod.WidgetGalleryWidget),
  {
    ssr: false,
    loading: () => (
      <div className="widgets-page__loading">
        <Spin size="l" />
      </div>
    ),
  }
);

export default function WidgetsPageClient() {
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
      <div className="widgets-page__loading" style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spin size="l" />
      </div>
    );
  }

  return <WidgetGalleryWidget />;
}
