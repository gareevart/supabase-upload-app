-- Исправление функции has_role для корректной обработки анонимных пользователей
-- Проблема: функция has_role некорректно обрабатывала случай когда auth.uid() равен NULL
-- для неавторизованных пользователей, что приводило к ошибкам в RLS политиках
-- и блокировало доступ анонимных пользователей к публичному контенту (например, постам блога)

-- Решение: добавляем проверку на NULL значение _user_id и возвращаем false
-- вместо попытки выполнить запрос с NULL значением

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND role = _role
    )
  END
$$;

-- Комментарий к функции для документации
COMMENT ON FUNCTION public.has_role(_user_id uuid, _role text) IS 
'Проверяет, имеет ли пользователь указанную роль. 
Корректно обрабатывает случай анонимных пользователей (NULL user_id), 
возвращая false вместо ошибки.';