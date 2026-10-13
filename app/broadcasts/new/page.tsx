"use client";

import React, { useEffect, useState } from 'react';
import BroadcastFormWidget from '@/widgets/broadcast-form/ui/BroadcastFormWidget';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Skeleton, Text, Button, Card } from '@gravity-ui/uikit';
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
          <Card className="debug-page__card">
            <Text variant="display-1">{t('broadcast.page.accessDeniedTitle')}</Text>
            <Text variant="body-1">{t('broadcast.page.accessDeniedDescription')}</Text>
            <Button size="l" style={{ marginTop: '1rem' }} onClick={() => router.push('/auth/profile')}>
              {t('broadcast.page.loginButton')}
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return <BroadcastFormWidget />;
}

export default NewBroadcastPage;