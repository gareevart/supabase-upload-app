-- Fix subscribe table structure
-- This migration handles the case where subscribe table might already exist

-- Check if subscribe table exists and add missing columns
DO $$
BEGIN
    -- Check if subscribe table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscribe') THEN
        -- Table exists, check and add missing columns
        
        -- Add email column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'email') THEN
            ALTER TABLE public.subscribe ADD COLUMN email TEXT;
            
            -- Update existing rows with empty emails to have unique placeholder values
            UPDATE public.subscribe
            SET email = 'placeholder_' || id::text || '@example.com'
            WHERE email IS NULL OR email = '';
            
            -- Now make the column NOT NULL
            ALTER TABLE public.subscribe ALTER COLUMN email SET NOT NULL;
            
            -- Add unique constraint
            ALTER TABLE public.subscribe ADD CONSTRAINT subscribe_email_unique UNIQUE (email);
        ELSE
            -- Column exists, but check if we need to clean up duplicates
            -- Remove rows with empty emails first
            DELETE FROM public.subscribe WHERE email IS NULL OR email = '';
            
            -- Check if unique constraint exists
            IF NOT EXISTS (
                SELECT FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                AND table_name = 'subscribe'
                AND constraint_name = 'subscribe_email_unique'
            ) THEN
                -- Remove any remaining duplicates by keeping only the first occurrence
                DELETE FROM public.subscribe
                WHERE id NOT IN (
                    SELECT DISTINCT ON (email) id
                    FROM public.subscribe
                    ORDER BY email, created_at ASC
                );
                
                -- Add unique constraint
                ALTER TABLE public.subscribe ADD CONSTRAINT subscribe_email_unique UNIQUE (email);
            END IF;
        END IF;
        
        -- Add name column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'name') THEN
            ALTER TABLE public.subscribe ADD COLUMN name TEXT;
        END IF;
        
        -- Add is_active column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'is_active') THEN
            ALTER TABLE public.subscribe ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        
        -- Add subscribed_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'subscribed_at') THEN
            ALTER TABLE public.subscribe ADD COLUMN subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        -- Add unsubscribed_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'unsubscribed_at') THEN
            ALTER TABLE public.subscribe ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'created_at') THEN
            ALTER TABLE public.subscribe ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscribe' AND column_name = 'updated_at') THEN
            ALTER TABLE public.subscribe ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        RAISE NOTICE 'Updated existing subscribe table with missing columns';
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE public.subscribe (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            is_active BOOLEAN DEFAULT true,
            subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            unsubscribed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        RAISE NOTICE 'Created new subscribe table';
    END IF;
END
$$;