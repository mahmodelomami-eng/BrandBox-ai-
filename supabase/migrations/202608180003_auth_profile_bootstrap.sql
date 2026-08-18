-- Phase 10.2: Supabase Auth -> public.profiles bootstrap
-- Create the application profile automatically for every newly registered auth user.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    role,
    status,
    credit_balance
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'USER'::public.app_role,
    'active',
    50
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill profiles for any existing auth users that do not have one yet.
INSERT INTO public.profiles (id, email, first_name, last_name, role, status, credit_balance)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data ->> 'first_name', ''),
  COALESCE(u.raw_user_meta_data ->> 'last_name', ''),
  'USER'::public.app_role,
  'active',
  50
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
