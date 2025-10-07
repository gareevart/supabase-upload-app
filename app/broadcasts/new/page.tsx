"use client";

import React, { useEffect, useState } from 'react';
import BroadcastFormWidget from '@/widgets/broadcast-form/ui/BroadcastFormWidget';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Spin, Text, Button } from '@gravity-ui/uikit';

function NewBroadcastPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push('/auth');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const hasAccess = profile?.role === 'admin' || profile?.role === 'editor';
        setIsAuthorized(hasAccess);
        
        if (!hasAccess) {
          router.push('/debug');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center min-h-[400px]">
        <Spin size="l" />
        <Text variant="body-1">Загрузка...</Text>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return <BroadcastFormWidget />;
}

export default NewBroadcastPage;