"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spin, Text } from '@gravity-ui/uikit';

const AuthCallback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка авторизации...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Получаем параметры из URL (как из search params, так и из hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Объединяем параметры
        const allParams = new URLSearchParams();
        urlParams.forEach((value, key) => allParams.set(key, value));
        hashParams.forEach((value, key) => allParams.set(key, value));

        console.log('Auth callback params:', Object.fromEntries(allParams));

        // Проверяем наличие токенов
        const accessToken = allParams.get('access_token');
        const refreshToken = allParams.get('refresh_token');
        const error = allParams.get('error');
        const errorDescription = allParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(`Ошибка авторизации: ${errorDescription || error}`);
          setTimeout(() => router.push('/auth'), 3000);
          return;
        }

        if (accessToken && refreshToken) {
          console.log('Setting session with tokens...');
          
          // Устанавливаем сессию с полученными токенами
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setStatus('error');
            setMessage(`Ошибка установки сессии: ${sessionError.message}`);
            setTimeout(() => router.push('/auth'), 3000);
            return;
          }

          if (data.user) {
            console.log('User authenticated successfully:', data.user.id);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Проверяем сохраненный return URL или используем профиль по умолчанию
            const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('returnUrl') : null;
            const redirectPath = returnUrl || '/auth/profile';
            if (returnUrl) {
              sessionStorage.removeItem('returnUrl');
            }
            
            // Небольшая задержка для показа сообщения об успехе
            setTimeout(() => {
              router.push(redirectPath);
            }, 1500);
          } else {
            setStatus('error');
            setMessage('Не удалось получить данные пользователя');
            setTimeout(() => router.push('/auth'), 3000);
          }
        } else {
          // Если токенов нет, пробуем получить сессию другим способом
          console.log('No tokens in URL, checking session...');
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session check error:', sessionError);
            setStatus('error');
            setMessage(`Ошибка проверки сессии: ${sessionError.message}`);
            setTimeout(() => router.push('/auth'), 3000);
            return;
          }

          if (session?.user) {
            console.log('Existing session found:', session.user.id);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Проверяем сохраненный return URL или используем профиль по умолчанию
            const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('returnUrl') : null;
            const redirectPath = returnUrl || '/auth/profile';
            if (returnUrl) {
              sessionStorage.removeItem('returnUrl');
            }
            
            setTimeout(() => router.push(redirectPath), 1500);
          } else {
            console.log('No session found, redirecting to auth');
            setStatus('error');
            setMessage('Сессия не найдена. Перенаправление на страницу входа...');
            setTimeout(() => router.push('/auth'), 3000);
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(`Неожиданная ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
        setTimeout(() => router.push('/auth'), 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="auth-layout">
      <div className="login-container">
        <div className="login" style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="l" />
          <div style={{ marginTop: '20px' }}>
            <Text variant="header-2" color={status === 'error' ? 'danger' : 'primary'}>
              {status === 'loading' && 'Обработка авторизации...'}
              {status === 'success' && 'Успешно!'}
              {status === 'error' && 'Ошибка'}
            </Text>
            <Text variant="body-1" color="secondary" style={{ marginTop: '10px' }}>
              {message}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
