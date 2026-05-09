CREATE OR REPLACE FUNCTION increment_chat_tokens(chat_id UUID, amount INTEGER)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE chat_sessions
  SET tokens_used = COALESCE(tokens_used, 0) + amount,
      updated_at = NOW()
  WHERE id = chat_id;
$$;
