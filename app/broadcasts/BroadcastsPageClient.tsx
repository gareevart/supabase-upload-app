"use client";

import React, { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Spin, Text, TabProvider, TabList, Tab, TabPanel } from '@gravity-ui/uikit';
import { useRouter, useSearchParams } from 'next/navigation';
import { SubscriberManagementWidget } from '@/widgets/subscriber-management/SubscriberManagementWidget';
import { useI18n } from '@/app/contexts/I18nContext';

const BroadcastListWidget = dynamicImport(
  () => import('@/widgets/broadcast-list/ui/BroadcastListWidget'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <Spin size="l" />
        <Text variant="body-1">Loading...</Text>
      </div>
    ),
  }
);

type MailingsTab = 'broadcasts' | 'subscribers' | 'groups';

export default function BroadcastsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const requestedTab = searchParams.get('tab');
  const activeTab: MailingsTab = requestedTab === 'subscribers' || requestedTab === 'groups'
    ? requestedTab
    : 'broadcasts';

  useEffect(() => {
    setIsClient(true);
    const checkAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          window.location.href = '/auth';
          return;
        }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const role = profile?.role ?? null;
        setUserRole(role);
        setIsAuthorized(!error && (role === 'admin' || role === 'editor'));
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleTabChange = (value: string) => {
    const tab = value as MailingsTab;
    router.replace(tab === 'broadcasts' ? '/broadcasts' : `/broadcasts?tab=${tab}`, { scroll: false });
  };

  if (!isClient || isLoading) {
    return <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 py-8 text-center"><Spin size="l" /><Text variant="body-1">Checking access...</Text></div>;
  }

  if (!isAuthorized) {
    return <div className="container mx-auto px-4 py-8 text-center"><Text variant="display-1">Access denied</Text><Text variant="body-1">{userRole ? `Your role: ${userRole}. Admin or editor access is required.` : 'Your profile or role is not configured.'}</Text></div>;
  }

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Text variant="display-1">{t('broadcastsPage.title')}</Text>
        <Text variant="body-1" color="secondary">{t('broadcastsPage.description')}</Text>
      </header>
      <TabProvider value={activeTab} onUpdate={handleTabChange}>
        <TabList size="l">
          <Tab value="broadcasts">{t('broadcastsPage.broadcastsTab')}</Tab>
          <Tab value="subscribers">{t('broadcastsPage.subscribersTab')}</Tab>
          <Tab value="groups">{t('broadcastsPage.groupsTab')}</Tab>
        </TabList>
        <TabPanel value="broadcasts"><BroadcastListWidget /></TabPanel>
        <TabPanel value="subscribers"><SubscriberManagementWidget mode="subscribers" /></TabPanel>
        <TabPanel value="groups"><SubscriberManagementWidget mode="groups" /></TabPanel>
      </TabProvider>
    </main>
  );
}
