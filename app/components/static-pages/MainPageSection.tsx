"use client";

import { useEffect, useState } from 'react';
import { Text } from '@gravity-ui/uikit';
import TipTapContent from '@/app/components/blog/TipTapContent';

export default function MainPageSection() {
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
  if (!page) return null;

  return (
    <section className="mt-8">
      <Text variant="display-1">{page.title}</Text>
      <TipTapContent content={page.content} />
    </section>
  );
}
