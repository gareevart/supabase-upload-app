-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: subscribe table should be created/updated using fix_subscribe_table.sql first

-- Create broadcast_groups table for managing recipient groups
CREATE TABLE IF NOT EXISTS public.broadcast_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_subscribers table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.group_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.broadcast_groups(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.subscribe(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, subscriber_id)
);

-- Add RLS policies for subscribe table
ALTER TABLE public.subscribe ENABLE ROW LEVEL SECURITY;

-- Policy to allow admin and editor roles to manage subscribers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'subscribe'
        AND policyname = 'Admin and editors can view subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can view subscribers"
          ON public.subscribe
          FOR SELECT
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'subscribe'
        AND policyname = 'Admin and editors can insert subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can insert subscribers"
          ON public.subscribe
          FOR INSERT
          WITH CHECK (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'subscribe'
        AND policyname = 'Admin and editors can update subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can update subscribers"
          ON public.subscribe
          FOR UPDATE
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;
END
$$;

-- Add RLS policies for broadcast_groups table
ALTER TABLE public.broadcast_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'broadcast_groups'
        AND policyname = 'Admin and editors can view groups'
    ) THEN
        CREATE POLICY "Admin and editors can view groups"
          ON public.broadcast_groups
          FOR SELECT
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'broadcast_groups'
        AND policyname = 'Admin and editors can insert groups'
    ) THEN
        CREATE POLICY "Admin and editors can insert groups"
          ON public.broadcast_groups
          FOR INSERT
          WITH CHECK (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'broadcast_groups'
        AND policyname = 'Admin and editors can update groups'
    ) THEN
        CREATE POLICY "Admin and editors can update groups"
          ON public.broadcast_groups
          FOR UPDATE
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'broadcast_groups'
        AND policyname = 'Admin and editors can delete groups'
    ) THEN
        CREATE POLICY "Admin and editors can delete groups"
          ON public.broadcast_groups
          FOR DELETE
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;
END
$$;

-- Add RLS policies for group_subscribers table
ALTER TABLE public.group_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'group_subscribers'
        AND policyname = 'Admin and editors can view group subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can view group subscribers"
          ON public.group_subscribers
          FOR SELECT
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'group_subscribers'
        AND policyname = 'Admin and editors can insert group subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can insert group subscribers"
          ON public.group_subscribers
          FOR INSERT
          WITH CHECK (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'group_subscribers'
        AND policyname = 'Admin and editors can delete group subscribers'
    ) THEN
        CREATE POLICY "Admin and editors can delete group subscribers"
          ON public.group_subscribers
          FOR DELETE
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles
              WHERE role IN ('admin', 'editor')
            )
          );
    END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscribe_email ON public.subscribe(email);
CREATE INDEX IF NOT EXISTS idx_subscribe_is_active ON public.subscribe(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_groups_user_id ON public.broadcast_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_groups_is_default ON public.broadcast_groups(is_default);
CREATE INDEX IF NOT EXISTS idx_group_subscribers_group_id ON public.group_subscribers(group_id);
CREATE INDEX IF NOT EXISTS idx_group_subscribers_subscriber_id ON public.group_subscribers(subscriber_id);

-- Create triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_subscribe_updated_at'
    ) THEN
        CREATE TRIGGER update_subscribe_updated_at
        BEFORE UPDATE ON public.subscribe
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_broadcast_groups_updated_at'
    ) THEN
        CREATE TRIGGER update_broadcast_groups_updated_at
        BEFORE UPDATE ON public.broadcast_groups
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Create a function to add subscriber to default group automatically
CREATE OR REPLACE FUNCTION add_subscriber_to_default_group()
RETURNS TRIGGER AS $$
DECLARE
  default_group_id UUID;
BEGIN
  -- Get the default group ID
  SELECT id INTO default_group_id
  FROM public.broadcast_groups
  WHERE is_default = true
  LIMIT 1;
  
  -- Add subscriber to default group if it exists and subscriber is active
  IF default_group_id IS NOT NULL AND NEW.is_active = true THEN
    INSERT INTO public.group_subscribers (group_id, subscriber_id)
    VALUES (default_group_id, NEW.id)
    ON CONFLICT (group_id, subscriber_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default group with all active subscribers
INSERT INTO public.broadcast_groups (name, description, is_default)
VALUES ('Все подписчики', 'Группа по умолчанию, содержащая всех активных подписчиков', true)
ON CONFLICT DO NOTHING;

-- Add all existing active subscribers to the default group
DO $$
DECLARE
    default_group_id UUID;
    subscriber_record RECORD;
BEGIN
    -- Get the default group ID
    SELECT id INTO default_group_id
    FROM public.broadcast_groups
    WHERE is_default = true
    LIMIT 1;
    
    -- Add all existing active subscribers to the default group
    IF default_group_id IS NOT NULL THEN
        FOR subscriber_record IN
            SELECT id FROM public.subscribe WHERE is_active = true
        LOOP
            INSERT INTO public.group_subscribers (group_id, subscriber_id)
            VALUES (default_group_id, subscriber_record.id)
            ON CONFLICT (group_id, subscriber_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Added existing subscribers to default group';
    END IF;
END
$$;

-- Create trigger to automatically add new subscribers to default group
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'add_to_default_group_trigger'
    ) THEN
        CREATE TRIGGER add_to_default_group_trigger
        AFTER INSERT ON public.subscribe
        FOR EACH ROW
        EXECUTE FUNCTION add_subscriber_to_default_group();
    END IF;
END
$$;

-- Create a function to get all emails from a group (created last to ensure all dependencies exist)
CREATE OR REPLACE FUNCTION public.get_group_emails(group_id_param UUID)
RETURNS TEXT[] AS $$
DECLARE
  emails TEXT[];
BEGIN
  -- Check if it's the default group
  IF EXISTS (SELECT 1 FROM public.broadcast_groups WHERE id = group_id_param AND is_default = true) THEN
    -- Return all active subscribers
    SELECT ARRAY_AGG(email) INTO emails
    FROM public.subscribe
    WHERE is_active = true;
  ELSE
    -- Return emails from specific group
    SELECT ARRAY_AGG(s.email) INTO emails
    FROM public.subscribe s
    JOIN public.group_subscribers gs ON s.id = gs.subscriber_id
    WHERE gs.group_id = group_id_param AND s.is_active = true;
  END IF;
  
  RETURN COALESCE(emails, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;