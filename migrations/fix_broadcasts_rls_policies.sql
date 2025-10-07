-- Fix RLS policies for sent_mails table to work correctly with auth context
-- This migration recreates the policies to ensure they work properly

-- First, drop existing policies
DROP POLICY IF EXISTS "Admin and editors can view broadcasts" ON public.sent_mails;
DROP POLICY IF EXISTS "Admin and editors can insert broadcasts" ON public.sent_mails;
DROP POLICY IF EXISTS "Admin and editors can update broadcasts" ON public.sent_mails;
DROP POLICY IF EXISTS "Admin and editors can delete broadcasts" ON public.sent_mails;

-- Create a helper function to check if user has required role
CREATE OR REPLACE FUNCTION public.has_broadcast_access()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the current user's role from profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Return true if user has admin or editor role
  RETURN user_role IN ('admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the helper function
CREATE POLICY "Admin and editors can view broadcasts"
  ON public.sent_mails
  FOR SELECT
  USING (public.has_broadcast_access());

CREATE POLICY "Admin and editors can insert broadcasts"
  ON public.sent_mails
  FOR INSERT
  WITH CHECK (public.has_broadcast_access());

CREATE POLICY "Admin and editors can update broadcasts"
  ON public.sent_mails
  FOR UPDATE
  USING (public.has_broadcast_access())
  WITH CHECK (public.has_broadcast_access());

CREATE POLICY "Admin and editors can delete broadcasts"
  ON public.sent_mails
  FOR DELETE
  USING (public.has_broadcast_access());

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.has_broadcast_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_broadcast_access() TO anon;
