BEGIN;

INSERT INTO public.ai_model_catalog (
  model_id,
  provider,
  generation_type,
  display_name_ar,
  display_name_en,
  pricing_mode,
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
  'bytedance-seed/seedream-4.5',
  'openrouter',
  'image',
  'Seedream 4.5',
  'Seedream 4.5',
  'image',
  1,
  4,
  TRUE,
  TRUE,
  5,
  jsonb_build_object(
    'brandbox_badge', 'مُثبت',
    'launch_catalog', 'image_v1',
    'runtime_verified', TRUE,
    'runtime_verified_at', '2026-09-05'
  ),
  NOW(),
  'ByteDance Seed',
  'image',
  'نموذج صور مُثبت فعليًا في بيئة Brand Box للإطلاق، مناسب للتوليد السريع والنتائج التجارية.',
  'Runtime-verified image model for Brand Box launch, suitable for fast generation and commercial visuals.',
  'starter',
  TRUE,
  NOW()
)
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  generation_type = EXCLUDED.generation_type,
  display_name_ar = EXCLUDED.display_name_ar,
  display_name_en = EXCLUDED.display_name_en,
  vendor_name = EXCLUDED.vendor_name,
  tool_category = EXCLUDED.tool_category,
  public_description_ar = EXCLUDED.public_description_ar,
  public_description_en = EXCLUDED.public_description_en,
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  sort_order = LEAST(public.ai_model_catalog.sort_order, EXCLUDED.sort_order),
  updated_at = NOW();

COMMIT;
