"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Text } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';

export default function StaticPagesAdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [pages, setPages] = useState<any[]>([]);

  const loadData = async () => {
    const response = await fetch('/api/static-pages', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setPages(data);
    }
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAllowed(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const canManage = profile?.role === 'admin' || profile?.role === 'editor';
      setAllowed(canManage);

      if (canManage) {
        await loadData();
      }
    };

    void check();
  }, []);

  const setHomepage = async (page: any) => {
    await fetch(`/api/static-pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...page, is_homepage: true })
    });

    await loadData();
  };

  if (allowed === null) {
    return <div className="container max-w-4xl mx-auto p-4"><Text>Loading...</Text></div>;
  }

  if (!allowed) {
    return <div className="container max-w-4xl mx-auto p-4"><Text>Access denied</Text></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Text variant="display-1">Static pages</Text>
        <Button view="action" onClick={() => router.push('/admin/static-pages/new')}>Create page</Button>
      </div>

      {pages.map((page) => (
        <Card key={page.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Text variant="subheader-2">{page.title}</Text>
              <Text variant="body-1" color="secondary">/{page.slug} • {page.published ? 'published' : 'draft'}</Text>
              {page.is_homepage && <Text color="positive">Current homepage</Text>}
            </div>
            <div className="flex gap-2">
              <Button view="outlined" onClick={() => router.push(`/admin/static-pages/new?pageId=${page.id}`)}>Edit</Button>
              {!page.is_homepage && (
                <Button view="normal" onClick={() => void setHomepage(page)}>Set as homepage</Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
