# Исправление ошибки аутентификации в Safari

## Проблема

В Safari возникала ошибка `AuthError` / `AuthApiError` при работе с аутентификацией Supabase:

```
AuthError@http://localhost:3000/_next/static/chunks/node_modules_%40supabase_auth-js_dist_module_33324aae._.js:85:14
AuthApiError@http://localhost:3000/_next/static/chunks/node_modules_%40supabase_auth-js_dist_module_33324aae._.js:97:14
```

## Причины

1. **Дублирование клиентов Supabase** - использовались два файла с разными настройками:
   - `/lib/supabase.ts` - с `detectSessionInUrl: true` и сложной cookie-логикой
   - `/lib/client-supabase.ts` - с `detectSessionInUrl: false` и простой конфигурацией

2. **Проблемы с cookies в Safari** - Safari имеет более строгие правила для работы с cookies, особенно:
   - Установка cookies с явным доменом может блокироваться
   - Третьесторонние cookies часто блокируются по умолчанию
   - Cookies с атрибутом `secure` требуют HTTPS

3. **Конфликты в настройках хранилища** - кастомная логика для работы с cookies и localStorage могла вызывать конфликты

4. **Неправильная валидация Bearer токена на сервере** - `withApiAuth` использовал неправильный метод для проверки JWT токена, передавая его через global headers вместо прямой передачи в `getUser(token)`

## Решение

### 1. Унификация клиента Supabase

Обновлен `/lib/supabase.ts` для использования стандартного `localStorage` без кастомной cookie-логики:

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Используем стандартное хранилище localStorage для совместимости со всеми браузерами
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});
```

### 2. Удаление дублирования

Файл `/lib/client-supabase.ts` теперь просто реэкспортирует клиент из `/lib/supabase.ts`:

```typescript
"use client"

// Этот файл устарел, используйте @/lib/supabase вместо него
// Экспортируем из основного файла для обратной совместимости
export { supabase } from './supabase';
```

### 3. Улучшенная обработка ошибок в AuthContext

Обновлен `/app/contexts/AuthContext.tsx` для более безопасного получения сессии:

```typescript
// Сначала пробуем получить сессию
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError) {
  console.error('Error getting session:', sessionError);
  setUser(null);
  setLoading(false);
  return;
}

if (session?.user) {
  setUser(session.user);
} else {
  setUser(null);
}
```

## Почему это работает

1. **Использование localStorage** - стандартное API, которое работает одинаково во всех браузерах
2. **PKCE flow** - более безопасный метод OAuth без необходимости в cookies
3. **Явная обработка ошибок** - предотвращает падение приложения при проблемах с сессией
4. **Единый клиент** - исключает конфликты между разными конфигурациями

## Преимущества localStorage над cookies для SPA

1. **Простота** - не требует настройки домена, пути, атрибутов secure/SameSite
2. **Совместимость** - работает одинаково во всех браузерах
3. **Размер** - больше места для хранения (обычно 5-10MB vs 4KB для cookies)
4. **Безопасность с PKCE** - PKCE flow не требует cookies для безопасности

## Ограничения

1. **SSR** - localStorage недоступен на сервере, но Supabase корректно обрабатывает это
2. **XSS** - как и cookies без httpOnly, требует защиты от XSS атак
3. **Поддомены** - не шарится между поддоменами (в отличие от cookies с domain)

Для данного приложения это приемлемо, так как:
- Используется SPA подход (Client-Side Rendering)
- Нет необходимости в шаринге сессии между поддоменами
- PKCE flow обеспечивает безопасность

## Тестирование

Протестируйте следующие сценарии в Safari:

1. ✅ Вход через email/password
2. ✅ Вход через OAuth (Google, Yandex и т.д.)
3. ✅ Автоматическое обновление токена
4. ✅ Выход из системы
5. ✅ Перезагрузка страницы с активной сессией
6. ✅ Работа в приватном режиме

## Дополнительные рекомендации

Если в будущем потребуется поддержка SSR или работа с API routes, рекомендуется:

1. Использовать `@supabase/ssr` пакет для серверных компонентов
2. Настроить middleware для работы с cookies на сервере
3. Разделить клиенты для client-side и server-side

## Работа с API Routes

### Проблема с серверными endpoints

После перехода на `localStorage` возникла проблема: серверные API routes не имеют доступа к `localStorage` (только клиент). Решение - отправка токена в заголовке `Authorization`.

### Решение: authFetch helper

Создан helper `/lib/auth-fetch.ts`:

```typescript
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(url, { ...options, headers });
}
```

### Обновление withApiAuth

Обновлен `/app/auth/withApiAuth.ts` для поддержки `Authorization` header:

- Приоритет отдается токену из `Authorization` header
- Fallback к cookies для обратной совместимости
- Поддержка обоих методов аутентификации
- **Важно**: используется правильный метод валидации токена: `supabase.auth.getUser(token)` вместо передачи токена через global headers

```typescript
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  
  // Правильный способ - передать токен напрямую в getUser()
  const result = await supabase.auth.getUser(token);
  user = result.data.user;
  error = result.error;
}
```

### Использование в компонентах

**До:**
```typescript
const response = await fetch('/api/api-keys');
```

**После:**
```typescript
import { authFetch } from '@/lib/auth-fetch';

const response = await authFetch('/api/api-keys');
```

## Связанные файлы

- `/lib/supabase.ts` - основной клиент Supabase
- `/lib/client-supabase.ts` - устаревший файл (теперь реэкспорт)
- `/lib/auth-fetch.ts` - helper для authenticated запросов
- `/app/contexts/AuthContext.tsx` - контекст аутентификации
- `/app/auth/components/AuthCallback.tsx` - обработка OAuth колбэков
- `/app/auth/withApiAuth.ts` - middleware для API routes
- `/app/components/profile/ApiKeysManager.tsx` - пример использования authFetch

## Ссылки

- [Supabase Auth with PKCE](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [Safari Cookies Limitations](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [localStorage vs cookies](https://web.dev/storage-for-the-web/)

