"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Text } from '@gravity-ui/uikit';
import { useToast } from '@/hooks/use-toast';
import { SubscriberManagementWidget } from '@/widgets/subscriber-management/SubscriberManagementWidget';
import withBroadcastAuth from '../broadcasts/withBroadcastAuth';
import { supabase } from '@/lib/supabase';

function SubscribersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        if (!session) {
          toast({
            title: 'Authorization required',
            description: 'Enter the system to access subscriber management',
            variant: 'destructive',
          });
          router.push('/auth');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        router.push('/auth');
      }
    };
    
    checkAuth();
  }, [router, toast]);

  if (isAuthenticated === false) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1" className="mb-4">Необходимо войти в систему</Text>
          <Button
            view="action"
            size="l"
            onClick={() => router.push('/auth')}
          >
            Перейти к авторизации
          </Button>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return null; // Still checking authentication
  }

  return <SubscriberManagementWidget />;
}

export default withBroadcastAuth(SubscribersPage);