# API Ключи

Система API ключей позволяет пользователям создавать токены для доступа к функционалу сайта через API, аналогично MCP серверу.

## Возможности

- ✅ Создание API ключей через интерфейс профиля
- ✅ Управление ключами (просмотр, удаление)
- ✅ Безопасное хранение с хешированием
- ✅ Аутентификация через Bearer токены
- ✅ Совместимость с существующей сессионной аутентификацией
- ✅ Ограничение количества ключей (максимум 10 на пользователя)
- ✅ Отслеживание последнего использования
- ✅ Row Level Security (RLS) политики

## Структура базы данных

### Таблица `api_keys`

```sql
CREATE TABLE api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Функция валидации

```sql
CREATE OR REPLACE FUNCTION validate_api_key(key_hash_param TEXT)
RETURNS TABLE(
    user_id UUID,
    key_id UUID,
    permissions JSONB,
    is_valid BOOLEAN
);
```

## Использование

### 1. Создание API ключа

1. Войдите в систему
2. Перейдите в профиль (`/auth/profile`)
3. Найдите раздел "API Ключи"
4. Нажмите "Создать ключ"
5. Введите название ключа
6. Скопируйте созданный ключ (показывается только один раз!)

### 2. Использование API ключа

Добавьте заголовок Authorization к вашим HTTP запросам:

```bash
curl -H "Authorization: Bearer sk_your_api_key_here" \
     http://localhost:3000/api/blog-posts
```

### 3. Поддерживаемые endpoints

Все API endpoints, которые используют `withAuth` middleware, поддерживают как сессионную аутентификацию, так и API ключи:

- `GET /api/blog-posts` - получить список постов
- `POST /api/blog-posts` - создать пост
- `GET /api/api-keys` - получить свои API ключи
- `POST /api/api-keys` - создать новый API ключ
- `DELETE /api/api-keys?id=<key_id>` - удалить API ключ
- `PATCH /api/api-keys` - обновить API ключ

## Примеры использования

### JavaScript/Node.js

```javascript
const API_KEY = 'sk_your_api_key_here';
const BASE_URL = 'http://localhost:3000';

async function getBlogPosts() {
  const response = await fetch(`${BASE_URL}/api/blog-posts`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.json();
}

async function createBlogPost(title, content) {
  const response = await fetch(`${BASE_URL}/api/blog-posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, content }),
  });
  
  return response.json();
}
```

### Python

```python
import requests

API_KEY = 'sk_your_api_key_here'
BASE_URL = 'http://localhost:3000'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

# Получить посты
response = requests.get(f'{BASE_URL}/api/blog-posts', headers=headers)
posts = response.json()

# Создать пост
data = {
    'title': 'My New Post',
    'content': 'This is the content of my post.'
}
response = requests.post(f'{BASE_URL}/api/blog-posts', json=data, headers=headers)
new_post = response.json()
```

### cURL

```bash
# Получить список постов
curl -H "Authorization: Bearer sk_your_api_key_here" \
     http://localhost:3000/api/blog-posts

# Создать новый пост
curl -X POST \
     -H "Authorization: Bearer sk_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"title":"My Post","content":"Post content"}' \
     http://localhost:3000/api/blog-posts

# Получить свои API ключи
curl -H "Authorization: Bearer sk_your_api_key_here" \
     http://localhost:3000/api/api-keys
```

## Безопасность

### Формат ключей

- Префикс: `sk_` (secret key)
- Длина: 64 символа после префикса
- Формат: `sk_[64 hex символа]`
- Пример: `sk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### Хранение

- В базе данных хранится только SHA-256 хеш ключа
- Полный ключ показывается пользователю только при создании
- Префикс (первые 12 символов) сохраняется для отображения в интерфейсе

### Валидация

- Проверка формата ключа (Bearer sk_...)
- Проверка существования и активности ключа
- Проверка срока действия (если установлен)
- Обновление времени последнего использования

## Ограничения

- Максимум 10 активных API ключей на пользователя
- Ключи привязаны к конкретному пользователю
- Нет системы разрешений (permissions) - пока не используется
- Нет возможности установить срок действия через UI (только через API)

## Мониторинг

В интерфейсе профиля отображается:
- Название ключа
- Префикс ключа (первые 12 символов)
- Дата создания
- Дата последнего использования
- Статус (активен/неактивен)

## Совместимость с MCP сервером

API ключи полностью совместимы с функционалом MCP сервера `/Users/gareevda/Documents/Cline/MCP/supabase-app-server`. Вы можете использовать созданные ключи для:

- Получения списка постов блога
- Создания новых постов
- Управления подписчиками
- Работы с рассылками
- Получения статистики приложения

## Тестирование

Для тестирования функционала запустите:

```bash
node test-api-keys.js
```

Этот скрипт проверит:
- Защиту от неавторизованного доступа
- Валидацию формата API ключей
- Корректность работы middleware
- Структуру базы данных