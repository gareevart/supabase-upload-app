# Диагностика проблем с Broadcasts - Итоговый отчет

## Проведенный анализ

Я провел полный анализ функционала broadcasts и выявил потенциальные проблемы, которые могут препятствовать доступу к интерфейсу управления рассылками.

## Найденные проблемы и решения

### ✅ 1. Структура FSD (Feature-Sliced Design)

**Статус:** Исправлено

**Проблема:** Отсутствовал индексный файл для экспорта модулей auth

**Решение:** Создан файл `features/auth/index.ts` с правильными экспортами:
```typescript
export { useAuth } from './model/useAuth';
export { withAuth } from './ui/withAuth';
export { AuthService } from '@/shared/lib/auth';
```

### ✅ 2. Тесты для useBroadcastList

**Статус:** Создано

**Файл:** `features/broadcast-list/model/__tests__/useBroadcastList.test.ts`

Покрывает:
- Инициализацию и загрузку
- Фильтрацию broadcasts
- Удаление broadcasts
- Отправку broadcasts
- Отмену расписания
- Обновление данных

### ✅ 3. Диагностический скрипт

**Статус:** Создан

**Файл:** `scripts/test-broadcasts-access.ts`

Проверяет:
- Переменные окружения
- Активную сессию
- Профиль пользователя
- Права доступа (роль)
- Доступ к таблице sent_mails
- API эндпоинт /api/broadcasts

**Использование:**
```bash
npx ts-node test-broadcasts-access.ts
```

### ✅ 4. Документация

**Статус:** Создана

**Файлы:**
- `docs/BROADCASTS_DEBUG_GUIDE.md` - Полное руководство по отладке
- `BROADCASTS_DIAGNOSTIC_SUMMARY.md` - Этот файл

## Архитектура проверки доступа

```
Пользователь → /broadcasts
    ↓
withBroadcastAuth (HOC)
    ↓
withAuth (HOC) с requiredRoles: ['admin', 'editor']
    ↓
useAuth hook
    ↓
AuthService.getCurrentUser()
    ↓
Supabase: getSession() + profiles query
    ↓
Проверка роли: hasRole(['admin', 'editor'])
    ↓
Если OK → BroadcastListWidget
Если НЕТ → Редирект на /debug
```

## Возможные причины проблемы

### 1. Проблемы с аутентификацией

**Симптомы:**
- Ошибка "Unauthorized"
- Ошибка "No active session"
- Редирект на /auth

**Проверка:**
```javascript
// В консоли браузера
const cookies = document.cookie;
console.log('Auth cookie:', cookies.includes('sb-rajacaayhzgjoitquqvt-auth-token'));
```

**Решение:**
1. Проверьте наличие cookie с токеном
2. Если токена нет - перелогиньтесь на `/auth`
3. Если токен есть, но не работает - удалите cookie и перелогиньтесь

### 2. Проблемы с профилем

**Симптомы:**
- Ошибка "User profile not found"
- Ошибка "Missing role"

**Проверка:**
```sql
SELECT * FROM profiles WHERE id = 'ваш-user-id';
```

**Решение:**
1. Перейдите на `/debug`
2. Нажмите "Set Admin Role"
3. Или выполните SQL:
```sql
INSERT INTO profiles (id, role) 
VALUES ('ваш-user-id', 'admin')
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';
```

### 3. Проблемы с RLS политиками

**Симптомы:**
- Ошибка "Permission denied for sent_mails table"
- Профиль есть, роль установлена, но доступа нет

**Проверка:**
```sql
-- Проверьте, существует ли функция
SELECT * FROM pg_proc WHERE proname = 'has_broadcast_access';

-- Проверьте политики
SELECT * FROM pg_policies WHERE tablename = 'sent_mails';
```

**Решение:**
Выполните миграцию:
```bash
# В Supabase Dashboard → SQL Editor
migrations/fix_broadcasts_rls_policies.sql
```

### 4. Проблемы с таблицей sent_mails

**Симптомы:**
- Ошибка "The sent_mails table does not exist"

**Проверка:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'sent_mails';
```

**Решение:**
Выполните миграции по порядку:
1. `create_sent_mails_table.sql`
2. `add_content_html_to_sent_mails.sql`
3. `add_delete_policy_sent_mails.sql`
4. `fix_broadcasts_rls_policies.sql`

## Пошаговая инструкция по исправлению

### Шаг 1: Проверьте окружение

```bash
# Убедитесь, что переменные установлены
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Если не установлены, добавьте в `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=your-resend-key
```

### Шаг 2: Запустите диагностику

```bash
npm run diagnose
```

Скрипт покажет, на каком этапе возникает проблема.

### Шаг 3: Используйте страницу отладки

1. Перейдите на http://localhost:3000/debug
2. Проверьте информацию о пользователе
3. Проверьте информацию о профиле
4. Нажмите "Set Admin Role" если роль не установлена
5. Нажмите "Test Broadcasts Access" для проверки API

### Шаг 4: Проверьте базу данных

В Supabase Dashboard → SQL Editor:

```sql
-- 1. Проверьте профиль
SELECT * FROM profiles WHERE id = auth.uid();

-- 2. Проверьте таблицу sent_mails
SELECT * FROM sent_mails LIMIT 1;

-- 3. Проверьте функцию has_broadcast_access
SELECT has_broadcast_access();

-- 4. Проверьте RLS политики
SELECT * FROM pg_policies WHERE tablename = 'sent_mails';
```

### Шаг 5: Выполните необходимые миграции

Если что-то не так, выполните миграции:

```sql
-- В Supabase Dashboard → SQL Editor
-- Скопируйте и выполните содержимое файлов:
-- 1. migrations/create_sent_mails_table.sql (если таблицы нет)
-- 2. migrations/fix_broadcasts_rls_policies.sql (всегда)
```

### Шаг 6: Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C)
# Запустите снова
npm run dev
```

### Шаг 7: Проверьте доступ

1. Откройте http://localhost:3000/broadcasts
2. Если все работает - вы увидите список рассылок
3. Если нет - проверьте консоль браузера (F12) и логи сервера

## Быстрая проверка (Checklist)

Перед тем как обращаться за помощью, убедитесь:

- [ ] Сервер запущен (`npm run dev`)
- [ ] Переменные окружения установлены
- [ ] Вы авторизованы (зашли через `/auth`)
- [ ] Cookie с токеном присутствует
- [ ] Профиль существует в таблице `profiles`
- [ ] Роль установлена как `admin` или `editor`
- [ ] Таблица `sent_mails` существует
- [ ] RLS политики настроены (выполнена миграция)
- [ ] Функция `has_broadcast_access()` существует
- [ ] Нет ошибок в консоли браузера (F12)
- [ ] Нет ошибок в логах сервера

## Команды для быстрой диагностики

```bash
# 1. Проверьте, запущен ли сервер
curl http://localhost:3000/api/broadcasts

# 2. Запустите диагностический скрипт
npm run diagnose

# 3. Проверьте логи сервера
# Смотрите терминал где запущен npm run dev

# 4. Запустите тесты
npm test
```

## Логи для анализа

### Где искать логи

1. **Браузер (F12 → Console):**
   - Ошибки аутентификации
   - Ошибки API запросов
   - Ошибки React компонентов

2. **Сервер (терминал с npm run dev):**
   - Auth middleware логи
   - API route логи
   - Database query логи

3. **Supabase Dashboard → Logs:**
   - Database queries
   - Auth events
   - API requests

### Что искать в логах

**Признаки проблем с аутентификацией:**
```
Auth middleware request details: { ... }
withApiAuth: Token validation result: { hasUser: false }
API auth check failed: { error: "No active session" }
```

**Признаки проблем с профилем:**
```
Profile query result: { profile: null, profileError: ... }
User profile not found or missing role
```

**Признаки проблем с RLS:**
```
Error fetching broadcasts: { message: "permission denied" }
Permission denied for sent_mails table
```

## Дополнительные ресурсы

- **Документация:**
  - [BROADCASTS_DEBUG_GUIDE.md](docs/BROADCASTS_DEBUG_GUIDE.md)
  - [BROADCASTS_FIX_README.md](BROADCASTS_FIX_README.md)
  - [BROADCASTS_ACCESS_FIX.md](docs/BROADCASTS_ACCESS_FIX.md)

- **Инструменты:**
  - `/debug` - Страница отладки
  - `scripts/test-broadcasts-access.ts` - Диагностический скрипт
  - `features/broadcast-list/model/__tests__/` - Тесты

- **Миграции:**
  - `migrations/create_sent_mails_table.sql`
  - `migrations/fix_broadcasts_rls_policies.sql`
  - `migrations/fix_has_role_function_for_anonymous_users.sql`

## Контакты

Если проблема не решается после выполнения всех шагов:

1. Запустите `npm run diagnose`
2. Сохраните вывод скрипта
3. Сохраните логи из консоли браузера
4. Сохраните логи из терминала сервера
5. Создайте issue с этой информацией

---

**Последнее обновление:** 2025-10-07
**Версия:** 1.0.0
