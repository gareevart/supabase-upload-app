"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Text, Spin } from '@gravity-ui/uikit';
import { useAuth } from '../model/useAuth';
import { UserRole } from '@/entities/user/model';

interface WithAuthOptions {
  requiredRoles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) => {
  const WithAuth: React.FC<P> = (props) => {
    const { user, isLoading, canAccessBroadcasts, hasRole, error } = useAuth();
    const router = useRouter();
    const { requiredRoles = ['admin', 'editor'], redirectTo = '/auth', fallback } = options;

    useEffect(() => {
      if (!isLoading && !user) {
        console.log('withAuth: No user found, redirecting to', redirectTo);
        router.push(redirectTo);
      }
    }, [isLoading, user, router, redirectTo]);

    useEffect(() => {
      if (!isLoading && user && requiredRoles.length > 0) {
        const hasRequiredRole = hasRole(requiredRoles);
        console.log('withAuth: Checking role', { user: user.id, role: user.role, hasRequiredRole, requiredRoles });
        if (!hasRequiredRole) {
          console.log('withAuth: Insufficient permissions, redirecting to /debug');
          router.push('/debug');
        }
      }
    }, [isLoading, user, requiredRoles, hasRole, router]);

    if (isLoading) {
      return (
        <div className="flex flex-col gap-4 py-8 px-4 text-center justify-center items-center">
          <Spin size="l" />
          <Text variant="body-1">Checking permissions...</Text>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-8">
            <Text variant="body-1" className="mb-4">
              You are not logged in. Redirecting to login page...
            </Text>
          </div>
        </div>
      );
    }

    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-8">
            <Text variant="body-1" className="mb-4">
              You need {requiredRoles.join(' or ')} role to access this feature. Please visit the debug page.
            </Text>
            <button
              onClick={() => router.push('/debug')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Debug Page
            </button>
          </div>
        </div>
      );
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return <Component {...props} />;
  };

  WithAuth.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WithAuth;
};
