BEGIN;

-- Brand Box AI — runtime-verified OpenRouter video launch model.
-- Verified in Vercel Preview on 2026-09-05 with a real 4s / 480p / 16:9 generation.
-- OpenRouter public price checked 2026-09-05: from USD 0.01345/sec at 480p.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generation-video-assets',
  'generation-video-assets',
  FALSE,
  157286400,
  ARRAY['video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO public.ai_model_catalog (
  model_id,
  provider,
  generation_type,
  display_name_ar,
  display_name_en,
  pricing_mode,
  provider_cost_per_second_usd,
  reservation_multiplier,
  minimum_credits,
  is_enabled,
  is_visible_to_users,
  sort_order,
  metadata,
  pricing_checked_at,
  vendor_name,
  tool_category,
  public_description_ar,
  public_description_en,
  minimum_plan_id,
  is_featured,
  updated_at
) VALUES (
  'bytedance/seedance-2.0-mini',
  'openrouter',
  'video',
  'Seedance 2.0 Mini',
  'Seedance 2.0 Mini',
  'second',
  0.01345,
  1,
  20,
  TRUE,
  TRUE,
  5,
  jsonb_build_object(
    'brandbox_badge', 'مُثبت',
    'launch_catalog', 'video_v1',
    'runtime_verified', TRUE,
    'runtime_verified_at', '2026-09-05',
    'runtime_verified_resolution', '480p',
    'runtime_verified_duration_seconds', 4,
    'provider_async', TRUE,
    'provider_output_ephemeral', TRUE,
    'provider_usd_per_second_480p', 0.01345,
    'pricing_fx_lyd_per_usd', 13,
    'pricing_margin_floor_pct', 40,
    'brandbox_credits_per_second', 5,
    'supported_resolutions', jsonb_build_array('480p', '720p'),
    'supported_ratios', jsonb_build_array('16:9', '9:16'),
    'minimum_duration_seconds', 4,
    'maximum_duration_seconds', 15,
    'generate_audio_default', FALSE
  ),
  NOW(),
  'ByteDance',
  'video',
  'نموذج فيديو مُثبت فعليًا عبر OpenRouter لبدء الإطلاق، مع توليد غير متزامن وحفظ MP4 دائم داخل Brand Box.',
  'Runtime-verified OpenRouter video model for launch, with async generation and durable MP4 storage inside Brand Box.',
  'starter',
  TRUE,
  NOW()
)
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  generation_type = EXCLUDED.generation_type,
  display_name_ar = EXCLUDED.display_name_ar,
  display_name_en = EXCLUDED.display_name_en,
  pricing_mode = EXCLUDED.pricing_mode,
  provider_cost_per_second_usd = EXCLUDED.provider_cost_per_second_usd,
  reservation_multiplier = EXCLUDED.reservation_multiplier,
  minimum_credits = EXCLUDED.minimum_credits,
  is_enabled = TRUE,
  is_visible_to_users = TRUE,
  sort_order = LEAST(public.ai_model_catalog.sort_order, EXCLUDED.sort_order),
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  vendor_name = EXCLUDED.vendor_name,
  tool_category = EXCLUDED.tool_category,
  public_description_ar = EXCLUDED.public_description_ar,
  public_description_en = EXCLUDED.public_description_en,
  minimum_plan_id = EXCLUDED.minimum_plan_id,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();

COMMIT;
