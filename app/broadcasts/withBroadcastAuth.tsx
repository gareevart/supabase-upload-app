"use client";

import React from 'react';
import { withAuth } from '@/features/auth/ui/withAuth';

// Higher-order component to restrict access to broadcast features
export const withBroadcastAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return withAuth(Component, {
    requiredRoles: ['admin', 'editor'],
    redirectTo: '/auth',
  });
};

export default withBroadcastAuth;