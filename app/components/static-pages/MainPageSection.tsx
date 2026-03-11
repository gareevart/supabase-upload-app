"use client";

import { type ReactNode, useEffect, useState } from 'react';
import { Text } from '@gravity-ui/uikit';
import TipTapContent from '@/app/components/blog/TipTapContent';

interface MainPageSectionProps {
  fallback?: ReactNode;
}

export default function MainPageSection({ fallback = null }: MainPageSectionProps) {
  const [page, setPage] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/public/main-page', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPage(data.page ?? null);
      }
      setLoaded(true);
    };

    void load();
  }, []);

  if (!loaded) return null;
  if (!page) return <>{fallback}</>;

  return (
    <section className="mt-8">
      <Text variant="display-1">{page.title}</Text>
      <TipTapContent content={page.content} />
    </section>
  );
}
