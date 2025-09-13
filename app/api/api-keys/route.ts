import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { withApiAuth } from '@/app/auth/withApiAuth';
import crypto from 'crypto';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Функция для генерации API ключа
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12); // Первые 12 символов для отображения
  return { key, hash, prefix };
}

// GET - получить список API ключей пользователя
export const GET = withApiAuth(async (req: NextRequest, user: { id: string }) => {
  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Error in GET /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - создать новый API ключ
export const POST = withApiAuth(async (req: NextRequest, user: { id: string }) => {
  try {
    const body = await req.json();
    const { name, permissions = {}, expires_at } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Проверяем лимит API ключей на пользователя (максимум 10)
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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

    const { count } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (count && count >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of API keys reached (10)' },
        { status: 400 }
      );
    }

    // Генерируем новый API ключ
    const { key, hash, prefix } = generateApiKey();

    // Сохраняем в базу данных
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        expires_at: expires_at || null,
      })
      .select('id, name, key_prefix, permissions, expires_at, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Возвращаем созданный ключ с полным значением (только один раз!)
    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key, // Полный ключ возвращается только при создании
      },
      message: 'API key created successfully. Save it securely - you won\'t be able to see it again!'
    });
  } catch (error) {
    console.error('Error in POST /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE - удалить API ключ
export const DELETE = withApiAuth(async (req: NextRequest, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PATCH - обновить API ключ (деактивировать/активировать, изменить имя)
export const PATCH = withApiAuth(async (req: NextRequest, user: { id: string }) => {
  try {
    const body = await req.json();
    const { id, name, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating API key:', error);
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiKey, message: 'API key updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});