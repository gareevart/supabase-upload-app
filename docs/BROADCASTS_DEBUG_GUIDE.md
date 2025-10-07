# Руководство по отладке функционала Broadcasts

## Обзор проблемы

Если вы не можете получить доступ к интерфейсу управления рассылками (`/broadcasts`), эта инструкция поможет вам найти и исправить проблему.

## Быстрая диагностика

### Шаг 1: Запустите диагностический скрипт

```bash
npx ts-node test-broadcasts-access.ts
```

Этот скрипт проверит:
- ✅ Переменные окружения
- ✅ Сессию пользователя
- ✅ Профиль и роль
- ✅ Доступ к таблице `sent_mails`
- ✅ API эндпоинт `/api/broadcasts`

### Шаг 2: Используйте страницу отладки

Перейдите на http://localhost:3000/debug

Эта страница покажет:
- Информацию о текущем пользователе
- Информацию о профиле и роли
- Кнопки для установки роли и тестирования доступа

## Распространенные проблемы и решения

### 1. Ошибка "Unauthorized" или "No active session"

**Симптомы:**
- Не можете зайти на `/broadcasts`
- Видите сообщение "You are not logged in"
- API возвращает 401

**Причина:** Нет активной сессии или токен истек

**Решение:**
1. Откройте DevTools (F12) → Application → Cookies
2. Проверьте наличие cookie `sb-rajacaayhzgjoitquqvt-auth-token`
3. Если cookie нет или пустой:
   - Перейдите на `/auth`
   - Войдите в систему
4. Если cookie есть, но все равно ошибка:
   - Удалите cookie
   - Перелогиньтесь

### 2. Ошибка "User profile not found or missing role"

**Симптомы:**
- Авторизованы, но не можете зайти на `/broadcasts`
- Видите сообщение о недостающем профиле

**Причина:** Нет записи в таблице `profiles` или не установлена роль

**Решение:**
1. Перейдите на `/debug`
2. Нажмите "Set Admin Role"
3. Дождитесь успешного выполнения
4. Обновите страницу

**Альтернативное решение (через SQL):**
```sql
-- Проверьте, есть ли профиль
SELECT * FROM profiles WHERE id = 'ваш-user-id';

-- Если профиля нет, создайте его
INSERT INTO profiles (id, role) 
VALUES ('ваш-user-id', 'admin');

-- Если профиль есть, обновите роль
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'ваш-user-id';
```

### 3. Ошибка "Permission denied for sent_mails table"

**Симптомы:**
- Профиль есть, роль установлена
- API возвращает ошибку доступа к таблице

**Причина:** Неправильные RLS (Row Level Security) политики

**Решение:**
1. Откройте Supabase Dashboard → SQL Editor
2. Выполните миграцию:
   ```
   migrations/fix_broadcasts_rls_policies.sql
   ```
3. Эта миграция создаст:
   - Функцию `has_broadcast_access()` для проверки прав
   - Правильные RLS политики для таблицы `sent_mails`

### 4. Ошибка "The sent_mails table does not exist"

**Симптомы:**
- Ошибка о несуществующей таблице

**Причина:** Таблица не создана в базе данных

**Решение:**
Выполните миграции в следующем порядке:
1. `migrations/create_sent_mails_table.sql`
2. `migrations/add_content_html_to_sent_mails.sql`
3. `migrations/add_delete_policy_sent_mails.sql`
4. `migrations/fix_broadcasts_rls_policies.sql`

### 5. Ошибка "Invalid Refresh Token"

**Симптомы:**
- Ошибка при попытке обновить токен
- Сообщение "Refresh Token Not Found"

**Причина:** Поврежденный или отсутствующий refresh token в cookie

**Решение:**
Код уже обновлен для автоматического использования `access_token` напрямую из cookie. Просто:
1. Обновите страницу (F5)
2. Если не помогло, очистите cookies и перелогиньтесь

### 6. Ошибка "Forbidden: Requires admin or editor role"

**Симптомы:**
- Авторизованы, профиль есть
- Но роль не `admin` или `editor`

**Причина:** Недостаточные права доступа

**Решение:**
1. Перейдите на `/debug`
2. Проверьте текущую роль в разделе "Profile Information"
3. Нажмите "Set Admin Role"
4. Или обновите роль через SQL:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = 'ваш-user-id';
   ```

## Проверка конфигурации

### Переменные окружения

Убедитесь, что в `.env.local` установлены:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=your-resend-key
```

### Структура базы данных

Таблица `profiles` должна иметь:
- `id` (uuid, primary key)
- `role` (text или enum: 'admin', 'editor', 'user')
- `created_at` (timestamp)
- `updated_at` (timestamp)

Таблица `sent_mails` должна иметь:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `subject` (text)
- `content` (jsonb)
- `content_html` (text)
- `recipients` (text[])
- `status` (text или enum)
- `scheduled_for` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- И другие поля...

## Отладка через консоль браузера

### Проверка токена

```javascript
// Откройте консоль браузера (F12)
const cookies = document.cookie;
console.log('Cookies:', cookies);

// Проверьте Supabase токен
const authCookie = cookies.split(';').find(c => c.includes('sb-rajacaayhzgjoitquqvt-auth-token'));
console.log('Auth cookie:', authCookie);
```

### Проверка сессии

```javascript
// В консоли браузера
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User:', data.session?.user);
```

### Проверка профиля

```javascript
// В консоли браузера
import { supabase } from '@/lib/supabase';

const { data: session } = await supabase.auth.getSession();
const userId = session.session?.user?.id;

const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

console.log('Profile:', profile);
console.log('Role:', profile?.role);
```

## Архитектура проверки прав

```
┌─────────────────────────────────────────────────────────┐
│ 1. Пользователь заходит на /broadcasts                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. withBroadcastAuth проверяет права                     │
│    - Вызывает withAuth с requiredRoles: ['admin','editor']│
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. withAuth использует useAuth hook                      │
│    - Получает текущего пользователя                      │
│    - Проверяет роль через hasRole()                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. useAuth использует AuthService                        │
│    - AuthService.getCurrentUser()                        │
│    - Получает сессию из Supabase                         │
│    - Загружает профиль из таблицы profiles              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Если роль подходит → показывает BroadcastListWidget  │
│    Если нет → редирект на /debug                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. BroadcastListWidget использует useBroadcastList      │
│    - Вызывает BroadcastApi.getBroadcasts()              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. BroadcastApi делает fetch к /api/broadcasts          │
│    - Передает credentials: 'include' для cookies        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 8. API route использует withApiAuth                     │
│    - Проверяет токен из cookie или Authorization header │
│    - Проверяет роль в таблице profiles                  │
│    - Выполняет запрос к sent_mails с RLS                │
└─────────────────────────────────────────────────────────┘
```

## Логи для отладки

### Серверные логи (Next.js)

Проверьте терминал, где запущен `npm run dev`:

```
Auth middleware request details: { ... }
withApiAuth: Authorization header: Present/Missing
withApiAuth: Token validation result: { ... }
GET /api/broadcasts request: { ... }
User ID: ...
Profile query result: { ... }
```

### Клиентские логи (Browser Console)

Откройте консоль браузера (F12):

```
Auth check error: ...
Error fetching broadcasts: ...
API auth check failed: ...
```

## Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Тесты для broadcasts
npm test features/broadcast-list

# Тесты для auth
npm test features/auth
```

### Ручное тестирование API

```bash
# Получите токен из cookie или DevTools
TOKEN="your-access-token"

# Тест GET /api/broadcasts
curl -X GET http://localhost:3000/api/broadcasts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Тест POST /api/broadcasts
curl -X POST http://localhost:3000/api/broadcasts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "content": {"type": "doc", "content": []},
    "recipients": ["test@example.com"]
  }'
```

## Контрольный список

Перед обращением за помощью, проверьте:

- [ ] Переменные окружения установлены
- [ ] Сервер разработки запущен (`npm run dev`)
- [ ] Вы авторизованы (есть cookie с токеном)
- [ ] Профиль существует в таблице `profiles`
- [ ] Роль установлена как `admin` или `editor`
- [ ] Таблица `sent_mails` существует
- [ ] RLS политики настроены правильно
- [ ] Нет ошибок в консоли браузера
- [ ] Нет ошибок в логах сервера

## Дополнительные ресурсы

- [BROADCASTS_FIX_README.md](../BROADCASTS_FIX_README.md) - Быстрое исправление
- [BROADCASTS_ACCESS_FIX.md](./BROADCASTS_ACCESS_FIX.md) - Детальное руководство
- [BROADCASTS_FSD_MIGRATION.md](./BROADCASTS_FSD_MIGRATION.md) - Миграция на FSD
- `/debug` - Страница отладки в приложении
- `test-broadcasts-access.ts` - Диагностический скрипт

## Получение помощи

Если проблема не решается:

1. Запустите диагностический скрипт и сохраните вывод
2. Проверьте логи в консоли браузера
3. Проверьте логи сервера Next.js
4. Проверьте логи Supabase в Dashboard → Logs
5. Создайте issue с:
   - Описанием проблемы
   - Выводом диагностического скрипта
   - Скриншотами ошибок
   - Логами из консоли и сервера
