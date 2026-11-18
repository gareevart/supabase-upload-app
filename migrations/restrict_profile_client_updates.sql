BEGIN;

-- Profile owners keep the fields used by the profile and appearance forms.
REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (role) ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, username, avatar_url, bio, website, theme, updated_at)
  ON public.profiles TO authenticated;

DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     OR has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE') THEN
    RAISE EXCEPTION 'Client role still has UPDATE privilege on profiles.role';
  END IF;
END;
$$;

COMMIT;
