-- Add attachments column to chat_messages table
-- This will store file attachments as a JSON array

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the structure
COMMENT ON COLUMN chat_messages.attachments IS 'Array of file attachments in format: [{"name": "filename.ext", "url": "https://...", "type": "image/png", "size": 12345}]';

-- Create an index for better query performance when filtering by messages with attachments
CREATE INDEX IF NOT EXISTS idx_chat_messages_attachments ON chat_messages USING GIN (attachments);

