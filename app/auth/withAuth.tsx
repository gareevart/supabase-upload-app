'use client';

import { ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Spin } from '@gravity-ui/uikit';

const withAuth = <P extends object>(Component: ComponentType<P>) => {
  const WithAuth = (props: P) => {
    const router = useRouter();
    const { user, loading } = useAuth();

    // Показываем загрузку пока проверяем авторизацию
    if (loading) {
      return (
        <div className="auth-loading">
          <Spin size="l" />
        </div>
      );
    }

    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!user) {
      router.push('/auth');
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
