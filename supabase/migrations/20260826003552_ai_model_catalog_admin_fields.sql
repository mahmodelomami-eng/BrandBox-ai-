BEGIN;

ALTER TABLE public.ai_model_catalog
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS tool_category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS public_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS public_description_en TEXT,
  ADD COLUMN IF NOT EXISTS minimum_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS fallback_model_id TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.ai_model_catalog
  DROP CONSTRAINT IF EXISTS ai_model_catalog_tool_category_check,
  ADD CONSTRAINT ai_model_catalog_tool_category_check
    CHECK (
      tool_category IN (
        'chat',
        'image',
        'video',
        'audio',
        'vision',
        'agent',
        'general'
      )
    );

ALTER TABLE public.ai_model_catalog
  DROP CONSTRAINT IF EXISTS ai_model_catalog_minimum_plan_check,
  ADD CONSTRAINT ai_model_catalog_minimum_plan_check
    CHECK (
      minimum_plan_id IS NULL
      OR minimum_plan_id IN (
        'free',
        'starter',
        'pro',
        'business'
      )
    );

UPDATE public.ai_model_catalog
SET
  display_name_ar = 'Gemini 3.7 Flash',
  display_name_en = 'Gemini 3.7 Flash',
  vendor_name = 'Google',
  tool_category = 'chat',
  public_description_ar = 'محادثة وكتابة وتحليل سريع متعدد الوسائط.',
  public_description_en = 'Fast multimodal chat, writing and analysis.',
  minimum_plan_id = 'free',
  is_featured = TRUE,
  metadata =
    COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'brandbox_alias',
      'Brand Box Smart',
      'show_real_model_name',
      true
    ),
  updated_at = NOW()
WHERE model_id = 'google/gemini-3.7-flash';

CREATE INDEX IF NOT EXISTS idx_ai_model_catalog_visibility
  ON public.ai_model_catalog (
    generation_type,
    is_enabled,
    is_visible_to_users,
    sort_order
  );

COMMIT;
