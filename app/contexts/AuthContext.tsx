"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const wasAuthenticatedRef = useRef(false);

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
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const hasOAuthParams = urlParams.has('access_token') || hashParams.has('access_token') ||
      urlParams.has('code') || hashParams.has('code');

    if (hasOAuthParams) {
      console.log('OAuth parameters detected in URL, waiting for callback processing...');
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user_id');

        if (wasAuthenticatedRef.current && typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }

        wasAuthenticatedRef.current = false;
      } else {
        setUser(session?.user ?? null);

        if (session?.user) {
          localStorage.setItem('user_id', session.user.id);
          wasAuthenticatedRef.current = true;
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleUnhandledError, handleUnhandledRejection]);

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
