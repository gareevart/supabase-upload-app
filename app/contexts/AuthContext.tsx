"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  // Глобальный обработчик ошибок для перехвата ошибок refresh token
  const handleUnhandledError = useCallback((event: ErrorEvent) => {
    const error = event.error;
    if (error?.message?.includes('Refresh Token') || 
        error?.message?.includes('refresh_token') ||
        error?.message?.includes('Invalid Refresh Token')) {
      console.warn('Unhandled refresh token error detected, clearing session...', error);
      // Предотвращаем дальнейшую обработку ошибки
      event.preventDefault();
      // Очищаем сессию
      supabase.auth.signOut().catch((err) => {
        console.error('Error signing out after refresh token error:', err);
      });
    }
  }, []);

  // Обработчик необработанных отклонений промисов (для асинхронных ошибок)
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason;
    if (error?.message?.includes('Refresh Token') || 
        error?.message?.includes('refresh_token') ||
        error?.message?.includes('Invalid Refresh Token')) {
      console.warn('Unhandled refresh token promise rejection detected, clearing session...', error);
      // Предотвращаем дальнейшую обработку ошибки
      event.preventDefault();
      // Очищаем сессию
      supabase.auth.signOut().catch((err) => {
        console.error('Error signing out after refresh token error:', err);
      });
    }
  }, []);

  useEffect(() => {
    // Получаем текущего пользователя при загрузке
    const getInitialUser = async () => {
      try {
        // Сначала проверяем, есть ли параметры OAuth в URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const hasOAuthParams = urlParams.has('access_token') || hashParams.has('access_token') ||
                              urlParams.has('code') || hashParams.has('code');
        
        if (hasOAuthParams) {
          console.log('OAuth parameters detected in URL, waiting for callback processing...');
          // Если есть OAuth параметры, не загружаем пользователя сразу
          // Пусть AuthCallback обработает их
          setLoading(false);
          return;
        }

        // Сначала пробуем получить сессию
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          
          // Если ошибка связана с refresh token, очищаем сессию
          if (sessionError.message?.includes('Refresh Token') || 
              sessionError.message?.includes('refresh_token') ||
              sessionError.message?.includes('Invalid Refresh Token')) {
            console.warn('Refresh token error detected, signing out...');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Error signing out after refresh token error:', signOutError);
            }
          }
          
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setWasAuthenticated(true);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // Подписываемся на изменения состояния авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          setWasAuthenticated(true);
          if (session?.user) {
            localStorage.setItem('user_id', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Очищаем только auth-related данные из localStorage
          localStorage.removeItem('user_id');
          // Перенаправляем на /auth только если пользователь был авторизован
          if (wasAuthenticated && typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
          }
          setWasAuthenticated(false);
        } else if (event === 'USER_UPDATED') {
          
          setUser(session?.user ?? null);
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // Добавляем глобальные обработчики ошибок
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleUnhandledError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      subscription.unsubscribe();
      // Удаляем обработчики ошибок при размонтировании
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleUnhandledError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [wasAuthenticated, handleUnhandledError, handleUnhandledRejection]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Состояние обновится автоматически через onAuthStateChange
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
