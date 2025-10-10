-- Скрипт для удаления пустых сообщений из чата
-- ВАЖНО: Запустите это в SQL Editor вашего Supabase проекта

-- Шаг 1: Посмотрите, сколько пустых сообщений есть
SELECT COUNT(*) as empty_messages_count
FROM chat_messages
WHERE content IS NULL OR TRIM(content) = '';

-- Шаг 2: Посмотрите эти сообщения детально
SELECT 
  id,
  chat_id,
  role,
  content,
  created_at,
  LENGTH(COALESCE(content, '')) as length
FROM chat_messages
WHERE content IS NULL OR TRIM(content) = ''
ORDER BY created_at DESC;

-- Шаг 3: УДАЛИТЕ пустые сообщения
-- Раскомментируйте следующую строку и запустите:
DELETE FROM chat_messages
WHERE content IS NULL OR TRIM(content) = '';

-- Проверка: должно вернуть 0
SELECT COUNT(*) as remaining_empty_messages
FROM chat_messages
WHERE content IS NULL OR TRIM(content) = '';

