"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Text } from '@gravity-ui/uikit';
import StaticPageEditor from '@/app/components/static-pages/StaticPageEditor';

export default function NewStaticPage() {
  const searchParams = useSearchParams();
  const pageId = searchParams?.get('pageId');
  const [initialPage, setInitialPage] = useState<any>(null);
  const [loading, setLoading] = useState(!!pageId);

  useEffect(() => {
    const loadPage = async () => {
      if (!pageId) return;

      const response = await fetch('/api/static-pages', { credentials: 'include' });
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const pages = await response.json();
      const page = pages.find((p: any) => p.id === pageId);
      setInitialPage(page ?? null);
      setLoading(false);
    };

    void loadPage();
  }, [pageId]);

  if (loading) {
    return <div className="container max-w-4xl mx-auto p-4"><Text>Loading...</Text></div>;
  }

  return <StaticPageEditor initialPage={initialPage ?? undefined} />;
}
