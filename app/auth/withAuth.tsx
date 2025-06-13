'use client';

import { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Spin } from '@gravity-ui/uikit';

const withAuth = <P extends object>(Component: ComponentType<P>) => {
  const WithAuth = (props: P) => {
    const router = useRouter();
    const { user, loading } = useAuth();
    
    // Use useEffect for navigation to avoid state updates during render
    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth');
      }
    }, [loading, user, router]);

    // Показываем загрузку пока проверяем авторизацию или если пользователь не авторизован
    if (loading || !user) {
      return (
        <div className="auth-loading">
          <Spin size="l" />
        </div>
      );
    }

    // Если пользователь авторизован, показываем компонент
    return <Component {...props} />;
  };

  return WithAuth;
};

export default withAuth;
