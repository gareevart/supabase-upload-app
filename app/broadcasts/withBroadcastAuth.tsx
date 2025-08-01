"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text, Spin } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Higher-order component to restrict access to broadcast features
export const withBroadcastAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WithBroadcastAuth: React.FC<P> = (props) => {
    const router = useRouter();
    const { toast } = useToast();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    
    // First effect: Check authorization
    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Get the current user session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            setAuthError('Not authenticated');
            setIsAuthorized(false);
            return;
          }
          
          // Get the user's profile to check their role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profileError || !profile) {
            setAuthError('Failed to fetch user profile');
            setIsAuthorized(false);
            return;
          }
          
          // Check if the user has the required role (admin or editor)
          const hasRequiredRole = profile.role === 'admin' || profile.role === 'editor';
          
          if (!hasRequiredRole) {
            setAuthError('Insufficient permissions');
            setIsAuthorized(false);
            return;
          }
          
          setIsAuthorized(true);
          setAuthError(null);
        } catch (error) {
          console.error('Authorization error:', error);
          setAuthError('An unexpected error occurred');
          setIsAuthorized(false);
        }
      };
      
      checkAuth();
    }, []);
    
    // Second effect: Handle redirect and toast when authorization fails
    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      
      if (isAuthorized === false && authError) {
        timeoutId = setTimeout(() => {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this feature',
            variant: 'destructive',
          });
          
          // Redirect to home page
          router.push('/');
        }, 0);
      }
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [isAuthorized, authError]);
    
    // Show loading state while checking authorization
    if (isAuthorized === null) {
      return (
        <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center">
            <Spin size="l" />
            <Text variant="body-1">Checking permissions...</Text>
          </div>
      );
    }
    
    // If authorized, render the component
    if (isAuthorized) {
      return <Component {...props} />;
    }
    
    // If not authorized, this will be shown briefly before redirect
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1">You do not have permission to access this feature</Text>
        </div>
      </div>
    );
  };
  
  return WithBroadcastAuth;
};

export default withBroadcastAuth;