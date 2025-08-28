-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sent_mails table
CREATE TABLE IF NOT EXISTS public.sent_mails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content JSONB NOT NULL,
  recipients TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  broadcast_id TEXT,
  total_recipients INTEGER NOT NULL,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.sent_mails ENABLE ROW LEVEL SECURITY;

-- Policy to allow admin and editor roles to see broadcasts
CREATE POLICY "Admin and editors can view broadcasts" 
  ON public.sent_mails 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'editor')
    )
  );

-- Policy to allow admin and editor roles to insert broadcasts
CREATE POLICY "Admin and editors can insert broadcasts"
  ON public.sent_mails
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'editor')
    )
  );

-- Policy to allow admin and editor roles to update broadcasts
CREATE POLICY "Admin and editors can update broadcasts"
  ON public.sent_mails
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'editor')
    )
  );

-- Policy to allow admin and editor roles to delete broadcasts
CREATE POLICY "Admin and editors can delete broadcasts"
  ON public.sent_mails
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'editor')
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_sent_mails_user_id ON public.sent_mails(user_id);
CREATE INDEX idx_sent_mails_status ON public.sent_mails(status);
CREATE INDEX idx_sent_mails_scheduled_for ON public.sent_mails(scheduled_for);
CREATE INDEX idx_sent_mails_created_at ON public.sent_mails(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_sent_mails_updated_at
BEFORE UPDATE ON public.sent_mails
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();