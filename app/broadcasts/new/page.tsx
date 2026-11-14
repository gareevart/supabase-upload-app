"use client";

import React, { useEffect, useState } from 'react';
import BroadcastFormWidget from '@/widgets/broadcast-form/ui/BroadcastFormWidget';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Skeleton, Card, PlaceholderContainer } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import '../../page-styles.css';
import '../broadcast-pages.css';

function NewBroadcastPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return setIsAuthorized(false);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const hasAccess = profile?.role === 'admin' || profile?.role === 'editor';
        setIsAuthorized(hasAccess);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="page-container">
        <main className="page-main">
          <Card>
            <Skeleton style={{ height: '24rem', width: '100%' }} />
          </Card>
        </main>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="page-container">
        <main className="page-main">
          <PlaceholderContainer
            className="debug-page__card"
            size="l"
            direction="column"
            title={t('broadcast.page.accessDeniedTitle')}
            description={t('broadcast.page.accessDeniedDescription')}
            image={{ src: '/file.svg', alt: '' }}
            actions={[{
              text: t('broadcast.page.loginButton'),
              view: 'action',
              size: 'l',
              onClick: () => router.push('/auth/profile'),
            }]}
          />
        </main>
      </div>
    );
  }

  return <BroadcastFormWidget />;
}

export default NewBroadcastPage;
