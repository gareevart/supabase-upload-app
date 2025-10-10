"use client";

import { supabase } from './supabase';

/**
 * Выполняет authenticated fetch запрос с автоматическим добавлением токена авторизации
 * из Supabase session в заголовок Authorization
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Получаем текущую сессию
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('authFetch: Error getting session:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      console.error('authFetch: No active session found');
      throw new Error('No active session');
    }

    // Добавляем Authorization header с токеном
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);

    // Выполняем запрос с добавленным токеном
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error('authFetch: Error:', error);
    throw error;
  }
}

