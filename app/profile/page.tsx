"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Spin } from '@gravity-ui/uikit';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Если пользователь авторизован, перенаправляем на страницу профиля в auth
        router.push('/auth/profile');
      } else {
        // Если не авторизован, перенаправляем на страницу входа
        router.push('/auth');
      }
    }
  }, [user, loading, router]);

  // Показываем загрузку пока определяем куда перенаправить
  return (
    <div className="auth-loading">
      <Spin size="l" />
    </div>
  );
}
