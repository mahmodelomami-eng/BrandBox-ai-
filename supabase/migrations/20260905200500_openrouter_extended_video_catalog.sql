BEGIN;

-- Extended general-purpose OpenRouter video catalog for Brand Box.
-- These models share OpenRouter's async /videos lifecycle and fit the current
-- text/image-to-video workspace. New paid models remain disabled/hidden by
-- default in production. Staging may enable them for capability/UI validation.
-- Sora 2 Pro is intentionally excluded because OpenRouter states it will be
-- removed on 2026-09-24.

WITH video_catalog (
  model_id, display_name_ar, display_name_en, vendor_name,
  provider_floor_usd_per_second, minimum_credits, sort_order, metadata,
  public_description_ar, public_description_en
) AS (
  VALUES
  (
    'kwaivgi/kling-v3.0-pro', 'Kling Video 3.0 Pro', 'Kling Video 3.0 Pro', 'OpenRouter / Kuaishou',
    0.112::numeric, 60, 100,
    '{"brandbox_badge":"Kling Pro","catalog_curated_on":"2026-09-05","minimum_duration_seconds":3,"maximum_duration_seconds":15,"supported_ratios":["16:9","9:16","1:1"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'نسخة Kling الاحترافية لجودة أعلى، 3–15 ثانية، مع تحكم أول وآخر إطار وصوت اختياري.',
    'Premium Kling model with higher visual quality, 3–15 second clips, first/last-frame control and optional audio.'
  ),
  (
    'kwaivgi/kling-v3.0-std', 'Kling Video 3.0 Standard', 'Kling Video 3.0 Standard', 'OpenRouter / Kuaishou',
    0.084::numeric, 45, 105,
    '{"brandbox_badge":"Kling","catalog_curated_on":"2026-09-05","minimum_duration_seconds":3,"maximum_duration_seconds":15,"supported_ratios":["16:9","9:16","1:1"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Kling Standard لتوليد الفيديو من النص أو الصورة بمدة 3–15 ثانية وصوت اختياري.',
    'Kling Standard for text/image-to-video with 3–15 second clips and optional native audio.'
  ),
  (
    'kwaivgi/kling-video-o1', 'Kling Video O1', 'Kling Video O1', 'OpenRouter / Kuaishou',
    0.112::numeric, 45, 110,
    '{"brandbox_badge":"سينمائي","catalog_curated_on":"2026-09-05","supported_durations":[5,10],"supported_ratios":["16:9","9:16","1:1"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Kling O1 للمحتوى السينمائي بمقاطع 5 أو 10 ثوانٍ وتحكم أول وآخر إطار.',
    'Kling O1 for cinematic 5 or 10 second clips with first/last-frame control.'
  ),
  (
    'google/veo-3.1', 'Veo 3.1', 'Veo 3.1', 'OpenRouter / Google',
    0.20::numeric, 100, 115,
    '{"brandbox_badge":"Google أعلى جودة","catalog_curated_on":"2026-09-05","supported_durations":[4,6,8],"supported_resolutions":["1080p","4K"],"supported_ratios":["16:9","9:16"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'أعلى فئة Veo للجودة النهائية، 1080p و4K، مع صوت متزامن وتحكم بالإطارات.',
    'Top-tier Veo for final-production fidelity at 1080p/4K with synchronized audio and frame control.'
  ),
  (
    'alibaba/wan-2.7', 'Wan 2.7', 'Wan 2.7', 'OpenRouter / Alibaba',
    0.10::numeric, 45, 120,
    '{"brandbox_badge":"Wan متقدم","catalog_curated_on":"2026-09-05","minimum_duration_seconds":2,"maximum_duration_seconds":10,"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Wan 2.7 للنص والصورة والمراجع، 2–10 ثوانٍ، مع أول وآخر إطار وصوت متزامن.',
    'Wan 2.7 for text, image and reference-guided video, 2–10 seconds, with first/last frames and audio.'
  ),
  (
    'alibaba/wan-2.6', 'Wan 2.6', 'Wan 2.6', 'OpenRouter / Alibaba',
    0.04::numeric, 35, 125,
    '{"brandbox_badge":"اقتصادي 1080p","catalog_curated_on":"2026-09-05","supported_durations":[5,10],"supported_resolutions":["480p","720p","1080p"],"supported_ratios":["16:9","9:16","1:1"],"supported_frame_images":["first_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Wan 2.6 اقتصادي مع 480p–1080p وصوت متزامن ومقاطع 5 أو 10 ثوانٍ.',
    'Cost-efficient Wan model with 480p–1080p, synchronized audio and 5/10 second clips.'
  ),
  (
    'bytedance/seedance-1-5-pro', 'Seedance 1.5 Pro', 'Seedance 1.5 Pro', 'OpenRouter / ByteDance',
    0.02306::numeric, 30, 130,
    '{"brandbox_badge":"صوت + Lip Sync","catalog_curated_on":"2026-09-05","minimum_duration_seconds":4,"maximum_duration_seconds":12,"supported_frame_images":["first_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Seedance 1.5 Pro لتوليد الصوت والفيديو معًا، حتى 1080p و4–12 ثانية.',
    'Seedance 1.5 Pro generates audio and video together, up to 1080p for 4–12 second clips.'
  ),
  (
    'minimax/hailuo-2.3', 'Hailuo 2.3', 'Hailuo 2.3', 'OpenRouter / MiniMax',
    0.0817::numeric, 35, 135,
    '{"brandbox_badge":"حركة واقعية","catalog_curated_on":"2026-09-05","supported_durations":[6,10],"supported_frame_images":["first_frame"],"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Hailuo 2.3 للحركة الواقعية وتوليد الفيديو من النص أو الصورة بمقاطع 6 أو 10 ثوانٍ.',
    'Hailuo 2.3 for realistic motion and text/image-to-video in 6 or 10 second clips.'
  ),
  (
    'minimax/hailuo-3-max', 'MiniMax H3 Max', 'MiniMax H3 Max', 'OpenRouter / MiniMax',
    0.05::numeric, 35, 140,
    '{"brandbox_badge":"MiniMax سريع","catalog_curated_on":"2026-09-05","minimum_duration_seconds":5,"maximum_duration_seconds":15,"supported_resolutions":["480p","768p"],"supported_ratios":["21:9","16:9","4:3","1:1","3:4","9:16"],"supported_frame_images":["first_frame","last_frame"],"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'H3 Max سريع للنص أو الصورة مع 480p/768p ومدد 5–15 ثانية وتحكم بالإطارات.',
    'Fast H3 Max text/image-to-video at 480p/768p with 5–15 second clips and keyframe control.'
  ),
  (
    'alibaba/happyhorse-1.1', 'HappyHorse 1.1', 'HappyHorse 1.1', 'OpenRouter / Alibaba',
    0.0988::numeric, 40, 145,
    '{"brandbox_badge":"Social Video","catalog_curated_on":"2026-09-05","minimum_duration_seconds":3,"maximum_duration_seconds":15,"supported_frame_images":["first_frame"],"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'HappyHorse 1.1 لمقاطع السوشيال وتحريك الصور، حتى 1080p ومدد 3–15 ثانية.',
    'HappyHorse 1.1 for social clips and image animation, up to 1080p with 3–15 second durations.'
  ),
  (
    'alibaba/wan-3.0-prime', 'Wan 3.0 Prime', 'Wan 3.0 Prime', 'OpenRouter / Alibaba',
    0.068::numeric, 40, 150,
    '{"brandbox_badge":"Wan Fast","catalog_curated_on":"2026-09-05","supported_frame_images":["first_frame"],"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'نسخة Prime السريعة من Wan 3.0 للنص أو أول إطار، مع اكتشاف الإعدادات حيًا من OpenRouter.',
    'Fast Wan 3.0 Prime for text-to-video and first-frame image-to-video; exact settings are discovered live.'
  )
)
INSERT INTO public.ai_model_catalog (
  model_id, provider, generation_type, display_name_ar, display_name_en,
  pricing_mode, provider_cost_per_second_usd, reservation_multiplier,
  minimum_credits, is_enabled, is_visible_to_users, sort_order, metadata,
  pricing_checked_at, vendor_name, tool_category, public_description_ar,
  public_description_en, minimum_plan_id, is_featured, updated_at
)
SELECT
  model_id, 'openrouter', 'video', display_name_ar, display_name_en,
  'second', provider_floor_usd_per_second, 1,
  minimum_credits, FALSE, FALSE, sort_order, metadata,
  NOW(), vendor_name, 'video', public_description_ar,
  public_description_en, 'pro', FALSE, NOW()
FROM video_catalog
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  generation_type = EXCLUDED.generation_type,
  display_name_ar = EXCLUDED.display_name_ar,
  display_name_en = EXCLUDED.display_name_en,
  vendor_name = EXCLUDED.vendor_name,
  tool_category = EXCLUDED.tool_category,
  public_description_ar = EXCLUDED.public_description_ar,
  public_description_en = EXCLUDED.public_description_en,
  sort_order = EXCLUDED.sort_order,
  provider_cost_per_second_usd = EXCLUDED.provider_cost_per_second_usd,
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  updated_at = NOW();

COMMIT;
