-- Проверка пустых сообщений в чате
-- Запустите это в SQL Editor в Supabase

-- Найти все пустые или почти пустые сообщения
SELECT 
  id,
  chat_id,
  role,
  content,
  LENGTH(content) as content_length,
  LENGTH(TRIM(content)) as trimmed_length,
  created_at
FROM chat_messages
WHERE 
  content IS NULL 
  OR TRIM(content) = ''
  OR LENGTH(TRIM(content)) = 0
ORDER BY created_at DESC;

-- Найти чаты с пустыми сообщениями
SELECT DISTINCT chat_id
FROM chat_messages
WHERE 
  content IS NULL 
  OR TRIM(content) = ''
  OR LENGTH(TRIM(content)) = 0;

-- Удалить пустые сообщения (осторожно!)
-- DELETE FROM chat_messages
-- WHERE 
--   content IS NULL 
--   OR TRIM(content) = ''
--   OR LENGTH(TRIM(content)) = 0;

