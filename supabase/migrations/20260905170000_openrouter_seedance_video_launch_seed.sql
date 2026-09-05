BEGIN;

-- OpenRouter video launch entry. It is intentionally disabled by default so a
-- production deployment cannot expose paid video generation merely by applying
-- this migration. Staging/admin activation remains an explicit operation after
-- the provider key and pricing are verified.
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
  FALSE,
  FALSE,
  5,
  jsonb_build_object(
    'launch_catalog', 'video_v1_openrouter',
    'brandbox_credits_per_second', 5,
    'provider_openrouter_usd_per_second_480p', 0.01345,
    'supported_ratios', jsonb_build_array('16:9', '9:16'),
    'supported_resolutions', jsonb_build_array('480p'),
    'minimum_duration_seconds', 4,
    'maximum_duration_seconds', 15,
    'generate_audio', FALSE,
    'provider_async', TRUE,
    'provider_output_ephemeral', TRUE,
    'runtime_verified_on', '2026-09-05'
  ),
  NOW(),
  'OpenRouter / ByteDance',
  'video',
  'توليد فيديو اقتصادي من النص عبر OpenRouter وSeedance، مع حفظ النتيجة داخل Brand Box بعد اكتمال المهمة.',
  'Cost-efficient text-to-video through OpenRouter Seedance, persisted into Brand Box after asynchronous completion.',
  'pro',
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
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'launch_catalog', 'video_v1_openrouter',
      'provider_openrouter_usd_per_second_480p', 0.01345,
      'supported_ratios', jsonb_build_array('16:9', '9:16'),
      'supported_resolutions', jsonb_build_array('480p'),
      'minimum_duration_seconds', 4,
      'maximum_duration_seconds', 15,
      'generate_audio', FALSE,
      'provider_async', TRUE,
      'provider_output_ephemeral', TRUE,
      'runtime_verified_on', '2026-09-05'
    ),
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  updated_at = NOW();

COMMIT;
