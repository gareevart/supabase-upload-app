# Миграция на authFetch для API запросов

## Зачем это нужно

После исправления проблемы с аутентификацией в Safari, мы переместили хранение токенов из cookies в `localStorage`. Это означает, что серверные API routes больше не могут автоматически получить токен из cookies.

**Решение**: Использовать helper `authFetch`, который автоматически добавляет токен из `localStorage` в заголовок `Authorization`.

## Как мигрировать компонент

### Шаг 1: Импортировать authFetch

**До:**
```typescript
"use client";
import { useState } from 'react';
```

**После:**
```typescript
"use client";
import { useState } from 'react';
import { authFetch } from '@/lib/auth-fetch';
```

### Шаг 2: Заменить fetch на authFetch

**До:**
```typescript
const response = await fetch('/api/some-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

**После:**
```typescript
const response = await authFetch('/api/some-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### Шаг 3: Обработка ошибок

`authFetch` выбросит ошибку, если нет активной сессии:

```typescript
try {
  const response = await authFetch('/api/endpoint');
  if (!response.ok) {
    throw new Error('Request failed');
  }
  const data = await response.json();
  // ...
} catch (error) {
  if (error.message === 'No active session') {
    // Пользователь не авторизован
    router.push('/auth');
  } else {
    // Другая ошибка
    console.error(error);
  }
}
```

## Когда НЕ нужно использовать authFetch

### 1. Публичные API endpoints

Если endpoint доступен без авторизации:

```typescript
// ✅ Используйте обычный fetch
const response = await fetch('/api/public/posts');
```

### 2. Внешние API

Для запросов к внешним сервисам:

```typescript
// ✅ Используйте обычный fetch
const response = await fetch('https://api.example.com/data');
```

### 3. Серверные компоненты

`authFetch` работает только на клиенте (использует `window.localStorage`):

```typescript
// ❌ НЕ используйте в серверных компонентах
// ✅ Используйте supabase server client вместо этого
```

## Список endpoints, требующих миграции

Все endpoints, использующие `withApiAuth` или `withApiKeyAuth`:

### API Keys
- ✅ `/api/api-keys` - МИГРИРОВАН (`ApiKeysManager.tsx`)

### Broadcasts (Рассылки)
- ⚠️ `/api/broadcasts` - ТРЕБУЕТ МИГРАЦИИ
- ⚠️ `/api/broadcasts/[id]` - ТРЕБУЕТ МИГРАЦИИ
- ⚠️ `/api/broadcast-groups` - ТРЕБУЕТ МИГРАЦИИ

### Blog Posts
- ⚠️ `/api/blog-posts` - ТРЕБУЕТ МИГРАЦИИ (если используется withApiAuth)

### Storage
- ⚠️ `/api/storage/*` - ТРЕБУЕТ МИГРАЦИИ

### Subscribers
- ⚠️ `/api/subscribers` - ТРЕБУЕТ МИГРАЦИИ

### User Apps
- ⚠️ `/api/user-apps/*` - ТРЕБУЕТ МИГРАЦИИ

### Generate (AI)
- ⚠️ `/api/generate-text` - ТРЕБУЕТ МИГРАЦИИ
- ⚠️ `/api/generate-image` - ТРЕБУЕТ МИГРАЦИИ

## Проверка миграции

### 1. Локальная проверка

```bash
# Запустите dev сервер
npm run dev

# Откройте DevTools → Console
# Не должно быть ошибок 401 Unauthorized
```

### 2. Проверьте Network tab

1. Откройте DevTools → Network
2. Выполните действие, которое делает API запрос
3. Проверьте запрос:
   - ✅ Должен быть заголовок `Authorization: Bearer <token>`
   - ✅ Статус должен быть 200 OK
   - ❌ Если 401 Unauthorized - миграция не завершена

### 3. Проверьте в Safari

Особенно важно проверить в Safari, так как именно там была изначальная проблема:

1. Откройте Safari
2. Войдите в приложение
3. Выполните действия с API
4. Проверьте Console на наличие ошибок

## Примеры миграции

### Пример 1: Простой GET запрос

**До:**
```typescript
const fetchData = async () => {
  const response = await fetch('/api/broadcasts');
  const data = await response.json();
  setBroadcasts(data);
};
```

**После:**
```typescript
import { authFetch } from '@/lib/auth-fetch';

const fetchData = async () => {
  try {
    const response = await authFetch('/api/broadcasts');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setBroadcasts(data);
  } catch (error) {
    console.error('Error:', error);
    // Обработка ошибки
  }
};
```

### Пример 2: POST запрос с данными

**До:**
```typescript
const createBroadcast = async (data: BroadcastData) => {
  const response = await fetch('/api/broadcasts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};
```

**После:**
```typescript
import { authFetch } from '@/lib/auth-fetch';

const createBroadcast = async (data: BroadcastData) => {
  const response = await authFetch('/api/broadcasts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create broadcast');
  return response.json();
};
```

### Пример 3: DELETE запрос

**До:**
```typescript
const deleteBroadcast = async (id: string) => {
  await fetch(`/api/broadcasts/${id}`, {
    method: 'DELETE',
  });
};
```

**После:**
```typescript
import { authFetch } from '@/lib/auth-fetch';

const deleteBroadcast = async (id: string) => {
  const response = await authFetch(`/api/broadcasts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete broadcast');
};
```

## Автоматический поиск

Найти все места, где используется fetch с API endpoints:

```bash
# Поиск всех fetch запросов к /api/
grep -r "fetch('/api/" app/

# Или с помощью ripgrep
rg "fetch\(['\\\"]\/api\/" app/
```

## Тестирование после миграции

1. **Войдите в приложение** - проверьте, что аутентификация работает
2. **Выполните CRUD операции** - создание, чтение, обновление, удаление
3. **Проверьте во всех браузерах** - Chrome, Safari, Firefox
4. **Проверьте приватный режим** Safari
5. **Проверьте перезагрузку страницы** - токен должен сохраняться

## Чеклист миграции компонента

- [ ] Добавлен импорт `authFetch`
- [ ] Все `fetch('/api/...)` заменены на `authFetch('/api/...)`
- [ ] Добавлена обработка ошибок `No active session`
- [ ] Проверено в браузере (Chrome/Safari)
- [ ] Проверено в DevTools → Network (есть Authorization header)
- [ ] Нет ошибок 401 Unauthorized
- [ ] Функционал работает как ожидалось

## Помощь

Если возникли проблемы:

1. Проверьте, что пользователь авторизован: `localStorage` должен содержать ключи Supabase
2. Проверьте Network tab: должен быть заголовок `Authorization`
3. Проверьте Console: не должно быть ошибок `AuthError`
4. Обратитесь к `/docs/SAFARI_AUTH_FIX.md` для подробностей

## Ссылки

- [SAFARI_AUTH_FIX.md](/docs/SAFARI_AUTH_FIX.md) - основная документация по исправлению
- [SAFARI_AUTH_TESTING.md](/docs/SAFARI_AUTH_TESTING.md) - руководство по тестированию
- [auth-fetch.ts](/lib/auth-fetch.ts) - исходный код helper'а

