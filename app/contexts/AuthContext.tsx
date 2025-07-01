"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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

        const { data: { user } } = await supabase.auth.getUser();
        console.log('Initial user check:', user?.id || 'No user');
        setUser(user);
      } catch (error) {
        console.error('Error getting initial user:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // Подписываемся на изменения состояния авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id || 'No user');
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
          setUser(session?.user ?? null);
          if (session?.user) {
            localStorage.setItem('user_id', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          localStorage.clear();
          // Принудительно перезагружаем страницу для очистки всех состояний
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
          }
        } else if (event === 'USER_UPDATED') {
          console.log('User updated:', session?.user?.email);
          setUser(session?.user ?? null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed for user:', session?.user?.email);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
