BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_links (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile links" ON public.profile_links;
CREATE POLICY "Users can read own profile links"
ON public.profile_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile links" ON public.profile_links;
CREATE POLICY "Users can insert own profile links"
ON public.profile_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile links" ON public.profile_links;
CREATE POLICY "Users can update own profile links"
ON public.profile_links
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.profile_links FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_links TO authenticated;

COMMIT;
