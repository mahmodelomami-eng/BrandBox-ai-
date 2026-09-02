BEGIN;

-- Keep generated videos isolated from the image bucket so video size/MIME rules
-- do not weaken the stricter image-generation storage policy.
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
  'gen4.5',
  'runway',
  'video',
  'Runway Gen-4.5',
  'Runway Gen-4.5',
  'second',
  NULL,
  1,
  0,
  FALSE,
  FALSE,
  10,
  jsonb_build_object(
    'launch_catalog', 'video_v1',
    'provider_runway_credits_per_second', 12,
    'brandbox_credits_per_second', 0,
    'supported_ratios', jsonb_build_array('1280:720', '720:1280'),
    'minimum_duration_seconds', 2,
    'maximum_duration_seconds', 10,
    'provider_async', TRUE,
    'provider_output_ephemeral', TRUE
  ),
  NOW(),
  'Runway',
  'video',
  'نموذج فيديو احترافي من النص، مهيأ للبنية غير المتزامنة ولا يُفعّل قبل إعداد المفتاح وتسعير Brand Box.',
  'Professional text-to-video model prepared for the asynchronous lifecycle. It remains disabled until server credentials and Brand Box pricing are explicitly configured.',
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
      'launch_catalog', 'video_v1',
      'provider_runway_credits_per_second', 12,
      'supported_ratios', jsonb_build_array('1280:720', '720:1280'),
      'minimum_duration_seconds', 2,
      'maximum_duration_seconds', 10,
      'provider_async', TRUE,
      'provider_output_ephemeral', TRUE
    ),
  updated_at = NOW();

COMMIT;
