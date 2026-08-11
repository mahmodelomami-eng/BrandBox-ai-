BEGIN;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('USER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'USER'::public.app_role NOT NULL;
COMMIT;
