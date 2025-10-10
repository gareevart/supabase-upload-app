# Руководство по применению миграции для поддержки файлов

## Применение миграции

### Шаг 1: Подключитесь к базе данных Supabase

Используйте Supabase Dashboard или SQL Editor:

1. Откройте [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел "SQL Editor"

### Шаг 2: Выполните миграцию

Скопируйте и выполните содержимое файла:
```
migrations/add_attachments_to_chat_messages.sql
```

Или выполните напрямую:

```sql
-- Add attachments column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the structure
COMMENT ON COLUMN chat_messages.attachments IS 'Array of file attachments in format: [{"name": "filename.ext", "url": "https://...", "type": "image/png", "size": 12345}]';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_attachments 
ON chat_messages USING GIN (attachments);
```

### Шаг 3: Проверьте миграцию

Выполните запрос для проверки:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
  AND column_name = 'attachments';
```

Ожидаемый результат:
```
column_name  | data_type | column_default
-------------|-----------|-----------------
attachments  | jsonb     | '[]'::jsonb
```

### Шаг 4: Проверьте индекс

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chat_messages' 
  AND indexname = 'idx_chat_messages_attachments';
```

### Шаг 5: Тестовая вставка

Проверьте, что можно сохранять файлы:

```sql
-- Создайте тестовое сообщение с файлом
INSERT INTO chat_messages (chat_id, role, content, attachments)
VALUES (
  'test-chat-id',
  'user',
  'Тестовое сообщение с файлом',
  '[{"name":"test.jpg","url":"https://example.com/test.jpg","type":"image/jpeg","size":12345}]'::jsonb
)
RETURNING *;
```

Если вставка прошла успешно, миграция применена корректно!

## Откат миграции (если нужно)

Если нужно откатить изменения:

```sql
-- Удалить индекс
DROP INDEX IF EXISTS idx_chat_messages_attachments;

-- Удалить колонку
ALTER TABLE chat_messages DROP COLUMN IF EXISTS attachments;
```

⚠️ **Внимание:** Откат удалит все сохранённые файлы из базы данных!

## Проверка работоспособности

После применения миграции:

1. Перезапустите приложение
2. Откройте чат
3. Попробуйте прикрепить файл
4. Отправьте сообщение
5. Проверьте, что файл отображается

## Устранение проблем

### Ошибка: "column already exists"
Колонка уже существует. Проверьте:
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'chat_messages' AND column_name = 'attachments';
```

### Ошибка: "permission denied"
Недостаточно прав. Используйте аккаунт с правами администратора.

### Индекс не создаётся
Проверьте поддержку GIN индексов:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'btree_gin';
```

## Дополнительные настройки

### RLS (Row Level Security)

Если у вас включен RLS, добавьте политики:

```sql
-- Разрешить пользователям видеть attachments в своих сообщениях
CREATE POLICY "Users can see attachments in their messages"
ON chat_messages FOR SELECT
USING (
  auth.uid() = user_id
);

-- Разрешить пользователям создавать сообщения с attachments
CREATE POLICY "Users can create messages with attachments"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);
```

### Ограничения на размер JSONB

По умолчанию PostgreSQL поддерживает JSONB до 1GB, но для чата рекомендуется:

```sql
-- Добавить constraint на количество файлов (максимум 10)
ALTER TABLE chat_messages
ADD CONSTRAINT check_attachments_count
CHECK (jsonb_array_length(attachments) <= 10);
```

## Мониторинг

### Проверка размера хранимых данных

```sql
SELECT 
  COUNT(*) as messages_with_files,
  AVG(jsonb_array_length(attachments)) as avg_files_per_message,
  MAX(jsonb_array_length(attachments)) as max_files_in_message
FROM chat_messages
WHERE attachments != '[]'::jsonb;
```

### Самые большие сообщения

```sql
SELECT 
  id,
  content,
  jsonb_array_length(attachments) as file_count,
  pg_column_size(attachments) as attachments_size_bytes
FROM chat_messages
WHERE attachments != '[]'::jsonb
ORDER BY pg_column_size(attachments) DESC
LIMIT 10;
```

## Готово! 🎉

Теперь ваш чат поддерживает прикрепление файлов!

