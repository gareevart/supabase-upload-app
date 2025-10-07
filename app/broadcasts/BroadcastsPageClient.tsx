"use client";

import React, { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Spin, Text, Button } from '@gravity-ui/uikit';

// Dynamically import the widget to prevent SSR issues
const BroadcastListWidget = dynamicImport(
  () => import('@/widgets/broadcast-list/ui/BroadcastListWidget'),
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

export default function BroadcastsPageClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkAuth = async () => {
      try {
        // Dynamically import supabase to avoid SSR issues
        const { supabase } = await import('@/lib/supabase');
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No session found, redirecting to auth');
          window.location.href = '/auth';
          return;
        }

        // Get user profile and role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Profile error:', error);
          setUserRole(null);
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        console.log('User role:', profile.role);
        setUserRole(profile.role);
        
        // Check if user has admin or editor role
        const hasAccess = profile.role === 'admin' || profile.role === 'editor';
        setIsAuthorized(hasAccess);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center min-h-[400px]">
        <Spin size="l" />
        <Text variant="body-1">Проверка прав доступа...</Text>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="display-1" className="mb-4">
            Доступ запрещён
          </Text>
          <Text variant="body-1" className="mb-4">
            {userRole 
              ? `Ваша роль: ${userRole}. Требуется роль admin или editor.`
              : 'У вас нет профиля или роли. Пожалуйста, настройте профиль.'}
          </Text>
          <div className="flex gap-4 justify-center">
            <Button
              view="action"
              size="l"
              onClick={() => window.location.href = '/debug'}
            >
              Настроить профиль
            </Button>
            <Button
              view="normal"
              size="l"
              onClick={() => window.location.href = '/'}
            >
              На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <BroadcastListWidget />;
}
