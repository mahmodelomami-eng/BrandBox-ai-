BEGIN;

CREATE TABLE IF NOT EXISTS public.home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  link_url text,
  duration_seconds integer NOT NULL DEFAULT 7 CHECK (duration_seconds BETWEEN 3 AND 120),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home banners public read" ON public.home_banners;
CREATE POLICY "home banners public read" ON public.home_banners FOR SELECT USING (
  is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
);
DROP POLICY IF EXISTS "home banners admin all" ON public.home_banners;
CREATE POLICY "home banners admin all" ON public.home_banners FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-banners','home-banners',true,52428800,ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "home banner media public read" ON storage.objects;
CREATE POLICY "home banner media public read" ON storage.objects FOR SELECT USING (bucket_id = 'home-banners');
DROP POLICY IF EXISTS "home banner media admin insert" ON storage.objects;
CREATE POLICY "home banner media admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'home-banners' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN'))
);
DROP POLICY IF EXISTS "home banner media admin update" ON storage.objects;
CREATE POLICY "home banner media admin update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'home-banners' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN'))
);
DROP POLICY IF EXISTS "home banner media admin delete" ON storage.objects;
CREATE POLICY "home banner media admin delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'home-banners' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN'))
);

COMMIT;
