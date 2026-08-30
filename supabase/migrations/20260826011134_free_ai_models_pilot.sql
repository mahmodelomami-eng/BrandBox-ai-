BEGIN;

ALTER TABLE public.ai_model_catalog
  DROP CONSTRAINT IF EXISTS ai_model_catalog_minimum_credits_check;
ALTER TABLE public.ai_model_catalog
  ADD CONSTRAINT ai_model_catalog_minimum_credits_check CHECK (minimum_credits >= 0);

ALTER TABLE public.ai_model_catalog
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS daily_free_user_limit INTEGER,
  ADD COLUMN IF NOT EXISTS supports_vision BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_tier_note TEXT;

ALTER TABLE public.ai_model_catalog
  DROP CONSTRAINT IF EXISTS ai_model_catalog_daily_free_user_limit_check;
ALTER TABLE public.ai_model_catalog
  ADD CONSTRAINT ai_model_catalog_daily_free_user_limit_check
  CHECK (daily_free_user_limit IS NULL OR daily_free_user_limit BETWEEN 1 AND 1000);

ALTER TABLE public.billing_settings
  ADD COLUMN IF NOT EXISTS openrouter_free_global_daily_limit INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS free_user_daily_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS free_models_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.billing_settings
  DROP CONSTRAINT IF EXISTS billing_settings_free_limits_check;
ALTER TABLE public.billing_settings
  ADD CONSTRAINT billing_settings_free_limits_check CHECK (
    openrouter_free_global_daily_limit BETWEEN 1 AND 1000
    AND free_user_daily_limit BETWEEN 1 AND 100
  );

UPDATE public.billing_settings
SET openrouter_free_global_daily_limit = 40,
    free_user_daily_limit = 5,
    free_models_enabled = TRUE,
    updated_at = NOW()
WHERE id = 'default';

INSERT INTO public.ai_model_catalog (
  model_id, provider, generation_type, display_name_ar, display_name_en,
  pricing_mode, input_cost_per_million_usd, output_cost_per_million_usd,
  reservation_multiplier, minimum_credits, is_enabled, is_visible_to_users,
  sort_order, metadata, pricing_checked_at, vendor_name, tool_category,
  public_description_ar, public_description_en, minimum_plan_id,
  fallback_model_id, is_featured, is_free, daily_free_user_limit,
  supports_vision, free_tier_note, updated_at
) VALUES
  (
    'openrouter/free', 'openrouter', 'chat', 'Free Models Router', 'Free Models Router',
    'token', 0, 0, 1, 0, TRUE, TRUE,
    1, jsonb_build_object('pilot', TRUE, 'free_router', TRUE, 'price_source', 'openrouter'), NOW(),
    'OpenRouter', 'chat',
    '┘à┘ê╪ش┘ّ┘ç ┘à╪ش╪د┘┘è ┘è╪«╪ز╪د╪▒ ┘┘à┘ê╪░╪ش┘ï╪د ┘à╪ش╪د┘┘è┘ï╪د ┘à╪ز┘ê╪د┘┘é┘ï╪د ╪ز┘┘é╪د╪خ┘è┘ï╪د. ┘è╪»╪╣┘à ╪د┘┘╪╡ ┘ê┘è┘à┘â┘┘ç ╪د╪«╪ز┘è╪د╪▒ ┘┘à┘ê╪░╪ش ┘è╪»╪╣┘à ┘┘ç┘à ╪د┘╪╡┘ê╪▒ ╪╣┘╪» ╪ح╪▒╪│╪د┘ ╪╡┘ê╪▒╪ر.',
    'Free router that automatically selects a compatible free model.',
    'free', NULL, TRUE, TRUE, 5, TRUE,
    '┘à╪ش╪د┘┘è ╪╢┘à┘ ╪ص╪»┘ê╪» OpenRouter ╪د┘┘è┘ê┘à┘è╪ر ┘ê┘é╪» ┘è╪ز╪║┘è╪▒ ╪د┘┘┘à┘ê╪░╪ش ╪د┘┘à╪│╪ز╪«╪»┘à ┘à┘ ╪╖┘╪ذ ┘╪ت╪«╪▒.', NOW()
  ),
  (
    'nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter', 'chat', 'Nemotron 3 Ultra', 'Nemotron 3 Ultra',
    'token', 0, 0, 1, 0, TRUE, TRUE,
    2, jsonb_build_object('pilot', TRUE, 'free_variant', TRUE, 'price_source', 'openrouter'), NOW(),
    'NVIDIA', 'agent',
    '┘┘à┘ê╪░╪ش ┘à╪ش╪د┘┘è ┘é┘ê┘è ┘┘╪د╪│╪ز╪»┘╪د┘ ┘ê╪د┘┘â╪ز╪د╪ذ╪ر ┘ê╪د┘┘à┘ç╪د┘à ╪د┘╪╖┘ê┘è┘╪ر ┘ê╪د┘╪ذ╪▒┘à╪ش╪ر ┘ê╪د┘┘ê┘â┘╪د╪ة.',
    'Free reasoning and agentic model for writing, coding, and long tasks.',
    'free', 'openrouter/free', TRUE, TRUE, 5, FALSE,
    '┘à╪ش╪د┘┘è ╪╢┘à┘ ╪ص╪»┘ê╪» OpenRouter ╪د┘┘è┘ê┘à┘è╪ر╪î ┘ê┘é╪» ╪ز╪ز╪║┘è╪▒ ╪ح╪ز╪د╪ص╪ز┘ç ┘â╪ث┘è ┘┘à┘ê╪░╪ش ┘à╪ش╪د┘┘è.', NOW()
  )
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  generation_type = EXCLUDED.generation_type,
  display_name_ar = EXCLUDED.display_name_ar,
  display_name_en = EXCLUDED.display_name_en,
  pricing_mode = EXCLUDED.pricing_mode,
  input_cost_per_million_usd = EXCLUDED.input_cost_per_million_usd,
  output_cost_per_million_usd = EXCLUDED.output_cost_per_million_usd,
  reservation_multiplier = EXCLUDED.reservation_multiplier,
  minimum_credits = EXCLUDED.minimum_credits,
  is_enabled = EXCLUDED.is_enabled,
  is_visible_to_users = EXCLUDED.is_visible_to_users,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  vendor_name = EXCLUDED.vendor_name,
  tool_category = EXCLUDED.tool_category,
  public_description_ar = EXCLUDED.public_description_ar,
  public_description_en = EXCLUDED.public_description_en,
  minimum_plan_id = EXCLUDED.minimum_plan_id,
  fallback_model_id = EXCLUDED.fallback_model_id,
  is_featured = EXCLUDED.is_featured,
  is_free = EXCLUDED.is_free,
  daily_free_user_limit = EXCLUDED.daily_free_user_limit,
  supports_vision = EXCLUDED.supports_vision,
  free_tier_note = EXCLUDED.free_tier_note,
  updated_at = NOW();

COMMIT;
