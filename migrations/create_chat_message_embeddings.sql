-- Enable pgvector if not enabled
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Per-chat message embeddings for RAG over user documents/messages
CREATE TABLE IF NOT EXISTS chat_message_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  message_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(256) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_chat_message_embeddings_chat ON chat_message_embeddings (chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_embeddings_message ON chat_message_embeddings (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_embeddings_embedding ON chat_message_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS, tied to chat ownership via chat_sessions.user_id
ALTER TABLE chat_message_embeddings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_embeddings' AND policyname = 'Allow select own chats'
  ) THEN
    CREATE POLICY "Allow select own chats"
      ON chat_message_embeddings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM chat_sessions cs
          WHERE cs.id = chat_message_embeddings.chat_id
            AND cs.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_embeddings' AND policyname = 'Allow insert own chats'
  ) THEN
    CREATE POLICY "Allow insert own chats"
      ON chat_message_embeddings
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chat_sessions cs
          WHERE cs.id = chat_message_embeddings.chat_id
            AND cs.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_embeddings' AND policyname = 'Allow delete own chats'
  ) THEN
    CREATE POLICY "Allow delete own chats"
      ON chat_message_embeddings
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM chat_sessions cs
          WHERE cs.id = chat_message_embeddings.chat_id
            AND cs.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RPC: match_chat_messages(query_embedding, chat_id, match_threshold, match_count)
CREATE OR REPLACE FUNCTION match_chat_messages (
  query_embedding vector(256),
  match_chat_id uuid,
  match_threshold double precision DEFAULT 0.05,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  message_id uuid,
  content text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cme.message_id,
    cme.content,
    1 - (cme.embedding <=> query_embedding) as similarity
  FROM chat_message_embeddings cme
  WHERE cme.chat_id = match_chat_id
    AND (1 - (cme.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
