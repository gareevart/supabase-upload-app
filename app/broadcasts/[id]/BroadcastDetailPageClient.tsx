"use client";

import React, { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Spin, Text } from '@gravity-ui/uikit';

// Dynamically import the widget to prevent SSR issues
const BroadcastDetailWidget = dynamicImport(
  () => import('@/widgets/broadcast-detail/ui/BroadcastDetailWidget'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center min-h-[400px]">
        <Spin size="l" />
        <Text variant="body-1">Загрузка...</Text>
      </div>
    )
  }
);

export default function BroadcastDetailPageClient() {
  const [id, setId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Get the ID from the URL path
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const broadcastId = pathParts[pathParts.length - 1];
      setId(broadcastId);
    }
    
    const checkAuth = async () => {
      try {
        // Dynamically import supabase to avoid SSR issues
        const { supabase } = await import('@/lib/supabase');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          window.location.href = '/auth';
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
          window.location.href = '/debug';
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
  
  if (!isClient || isLoading || !id) {
    return (
      <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center min-h-[400px]">
        <Spin size="l" />
        <Text variant="body-1">Загрузка...</Text>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }
  
  return <BroadcastDetailWidget id={id} />;
}
