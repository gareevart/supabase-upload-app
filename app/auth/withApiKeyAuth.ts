import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import crypto from 'crypto';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export interface ApiKeyUser {
  id: string;
  keyId: string;
  permissions: any;
}

export const withApiKeyAuth = (handler: (req: NextRequest, user: ApiKeyUser) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    try {
      // Получаем API ключ из заголовка Authorization
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization header is required' },
          { status: 401 }
        );
      }

      // Проверяем формат: "Bearer sk_..."
      const match = authHeader.match(/^Bearer\s+(sk_[a-f0-9]{64})$/);
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid API key format. Expected: Bearer sk_...' },
          { status: 401 }
        );
      }

      const apiKey = match[1];
      
      // Хешируем ключ для поиска в базе данных
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Создаем Supabase клиент с service role для доступа к функции validate_api_key
      const supabase = createServerClient<Database>(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
        {
          cookies: {
            get: (name: string) => req.cookies.get(name)?.value,
            set: (name: string, value: string, options: any) => {
              req.cookies.set({ name, value, ...options });
            },
            remove: (name: string, options: any) => {
              req.cookies.delete(name);
            },
          },
        }
      );

      // Валидируем API ключ через функцию базы данных
      const { data: validationResult, error } = await supabase
        .rpc('validate_api_key', { key_hash_param: keyHash });

      if (error) {
        console.error('Error validating API key:', error);
        return NextResponse.json(
          { error: 'Failed to validate API key' },
          { status: 500 }
        );
      }

      if (!validationResult || validationResult.length === 0) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }

      const keyData = validationResult[0];
      
      if (!keyData.is_valid) {
        return NextResponse.json(
          { error: 'API key is expired or inactive' },
          { status: 401 }
        );
      }

      // Создаем объект пользователя для передачи в handler
      const apiKeyUser: ApiKeyUser = {
        id: keyData.user_id,
        keyId: keyData.key_id,
        permissions: keyData.permissions || {},
      };

      // Вызываем основной handler
      const response = await handler(req, apiKeyUser);
      
      // Добавляем CORS заголовки
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    } catch (err) {
      console.error('API key auth middleware error:', {
        error: err,
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined
      });
      return NextResponse.json(
        { error: 'Authentication failed', details: err instanceof Error ? err.message : undefined },
        { status: 500 }
      );
    }
  };
};

// Комбинированный middleware, который поддерживает как сессионную аутентификацию, так и API ключи
export const withAuth = (handler: (req: NextRequest, user: { id: string }) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    
    // Если есть Bearer токен, используем API key аутентификацию
    if (authHeader && authHeader.startsWith('Bearer sk_')) {
      return withApiKeyAuth(async (req, apiKeyUser) => {
        return handler(req, { id: apiKeyUser.id });
      })(req);
    }
    
    // Иначе используем стандартную сессионную аутентификацию
    const { withApiAuth } = await import('./withApiAuth');
    return withApiAuth(handler)(req);
  };
};