-- Add content_html column to sent_mails table
ALTER TABLE public.sent_mails
ADD COLUMN IF NOT EXISTS content_html TEXT;

-- Update existing rows to have content_html
UPDATE public.sent_mails
SET content_html = content::text
WHERE content_html IS NULL;