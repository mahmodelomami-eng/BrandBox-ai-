BEGIN;

-- Popular/stable OpenRouter media catalog curated from OpenRouter usage rankings
-- on 2026-09-05. New paid models are intentionally disabled and hidden by
-- default in production. Existing activation state is preserved on conflict.
-- Runtime capability discovery remains authoritative; metadata below is a
-- conservative fail-closed fallback when OpenRouter capability discovery is
-- temporarily unavailable.

WITH image_catalog (
  model_id, display_name_ar, display_name_en, vendor_name,
  minimum_credits, sort_order, metadata, public_description_ar, public_description_en
) AS (
  VALUES
  (
    'google/gemini-3.1-flash-image', 'Nano Banana 2 — Gemini 3.1 Flash Image', 'Nano Banana 2 — Gemini 3.1 Flash Image', 'Google',
    5, 5,
    '{"brandbox_badge":"الأكثر استخدامًا","catalog_curated_on":"2026-09-05","openrouter_usage_rank":1,"supported_resolutions":["512","1K","2K","4K"],"supported_ratios":["1:1","1:4","1:8","2:3","3:2","3:4","4:1","4:3","4:5","5:4","8:1","9:16","16:9","21:9"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":14}}'::jsonb,
    'خيار سريع وعالي الجودة لتوليد وتحرير الصور، ويتصدر استخدام نماذج الصور على OpenRouter.',
    'Fast high-quality image generation and editing; the current top image model by OpenRouter usage.'
  ),
  (
    'google/gemini-3.1-flash-lite-image', 'Nano Banana 2 Lite — Gemini 3.1 Flash Lite Image', 'Nano Banana 2 Lite — Gemini 3.1 Flash Lite Image', 'Google',
    4, 10,
    '{"brandbox_badge":"اقتصادي","catalog_curated_on":"2026-09-05","openrouter_usage_rank":2,"supported_resolutions":["1K"],"supported_ratios":["1:1","1:4","1:8","2:3","3:2","3:4","4:1","4:3","4:5","5:4","8:1","9:16","16:9","21:9"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":14}}'::jsonb,
    'نسخة اقتصادية وسريعة للإنتاج الكثيف، بدقة 1K حسب قدرات OpenRouter الحالية.',
    'Cost-efficient high-throughput image model; currently limited to 1K by OpenRouter capabilities.'
  ),
  (
    'google/gemini-2.5-flash-image', 'Nano Banana — Gemini 2.5 Flash Image', 'Nano Banana — Gemini 2.5 Flash Image', 'Google',
    4, 15,
    '{"brandbox_badge":"شائع","catalog_curated_on":"2026-09-05","openrouter_usage_rank":3,"supported_resolutions":[],"supported_ratios":["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":3}}'::jsonb,
    'موديل Google واسع الاستخدام لتوليد الصور وتحريرها بسرعة.',
    'Widely used Google image generation and editing model.'
  ),
  (
    'openai/gpt-image-2', 'GPT Image 2', 'GPT Image 2', 'OpenAI',
    6, 20,
    '{"brandbox_badge":"OpenAI","catalog_curated_on":"2026-09-05","openrouter_usage_rank":4,"supported_resolutions":[],"supported_ratios":["1:1","3:2","2:3","4:3","3:4","16:9","9:16","21:9","auto"],"count_range":{"min":1,"max":10},"input_reference_range":{"min":0,"max":16},"supported_quality_values":["auto","low","medium","high"],"supported_background_values":["auto","opaque"],"supports_streaming":true}'::jsonb,
    'موديل OpenAI المتخصص لتوليد الصور وتحريرها مع دعم جيد للنصوص والمراجع.',
    'OpenAI dedicated image generation/editing model with strong text and reference-image support.'
  ),
  (
    'google/gemini-3-pro-image', 'Nano Banana Pro — Gemini 3 Pro Image', 'Nano Banana Pro — Gemini 3 Pro Image', 'Google',
    8, 25,
    '{"brandbox_badge":"احترافي","catalog_curated_on":"2026-09-05","openrouter_usage_rank":7,"supported_resolutions":["1K","2K","4K"],"supported_ratios":["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":14}}'::jsonb,
    'نسخة Pro من Google للأعمال البصرية عالية الجودة والمركبة.',
    'Google Pro image model for high-fidelity and complex visual production.'
  ),
  (
    'openai/gpt-5.4-image-2', 'GPT-5.4 Image 2', 'GPT-5.4 Image 2', 'OpenAI',
    10, 30,
    '{"brandbox_badge":"متقدم","catalog_curated_on":"2026-09-05","openrouter_usage_rank":8,"supported_resolutions":[],"supported_ratios":["1:1","3:2","2:3","4:3","3:4","16:9","9:16","21:9","auto"],"count_range":{"min":1,"max":10},"input_reference_range":{"min":0,"max":16},"supported_quality_values":["auto","low","medium","high"],"supported_background_values":["auto","opaque"],"supports_streaming":true}'::jsonb,
    'موديل متعدد الوسائط من OpenAI يجمع التفكير المتقدم وتوليد الصور.',
    'Advanced OpenAI multimodal model combining reasoning with GPT Image 2 generation.'
  ),
  (
    'black-forest-labs/flux.2-pro', 'FLUX.2 Pro', 'FLUX.2 Pro', 'Black Forest Labs',
    6, 35,
    '{"brandbox_badge":"جودة عالية","catalog_curated_on":"2026-09-05","openrouter_usage_rank":9,"supported_resolutions":[],"supported_ratios":["1:1","4:3","3:4","3:2","2:3","16:9","9:16","21:9","auto"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":8},"supported_output_formats":["png","jpeg"],"supports_seed":true}'::jsonb,
    'FLUX احترافي لجودة بصرية عالية وثبات جيد مع الصور المرجعية.',
    'High-end FLUX model for strong visual quality and multi-reference consistency.'
  ),
  (
    'bytedance-seed/seedream-4.5', 'Seedream 4.5', 'Seedream 4.5', 'ByteDance Seed',
    4, 40,
    '{"brandbox_badge":"مُثبت","catalog_curated_on":"2026-09-05","supported_resolutions":["1K","2K","4K"],"supported_ratios":["1:1","1:2","2:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","9:19.5","19.5:9","9:20","20:9","9:21","21:9","auto"],"count_range":{"min":1,"max":10},"input_reference_range":{"min":0,"max":14},"supports_seed":true}'::jsonb,
    'موديل ByteDance مثبت في Brand Box، مناسب للتوليد والتحرير متعدد الصور.',
    'Brand Box verified ByteDance image model for generation and multi-image editing.'
  ),
  (
    'bytedance-seed/seedream-5-0-lite', 'Seedream 5.0 Lite', 'Seedream 5.0 Lite', 'ByteDance Seed',
    4, 45,
    '{"brandbox_badge":"سريع","catalog_curated_on":"2026-09-05","supported_resolutions":["2K","4K"],"supported_ratios":["1:1","1:2","2:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","9:19.5","19.5:9","9:20","20:9","9:21","21:9","auto"],"count_range":{"min":1,"max":4},"input_reference_range":{"min":0,"max":14},"supports_seed":true}'::jsonb,
    'Seedream سريع للإنتاج الاحترافي؛ لا يعرض 1K لأن OpenRouter يدعم له 2K و4K فقط حاليًا.',
    'Fast Seedream production model; OpenRouter currently exposes only 2K and 4K resolutions.'
  ),
  (
    'bytedance-seed/seedream-5-0-pro', 'Seedream 5.0 Pro', 'Seedream 5.0 Pro', 'ByteDance Seed',
    5, 50,
    '{"brandbox_badge":"Pro","catalog_curated_on":"2026-09-05","supported_resolutions":["1K","2K"],"supported_ratios":["1:1","1:2","2:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","9:19.5","19.5:9","9:20","20:9","9:21","21:9","auto"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":14},"supports_seed":true}'::jsonb,
    'Seedream Pro للصور التجارية الدقيقة والتحرير عالي الجودة.',
    'Seedream Pro for precise commercial image generation and editing.'
  ),
  (
    'x-ai/grok-imagine-image-quality', 'Grok Imagine Image Quality', 'Grok Imagine Image Quality', 'xAI',
    6, 55,
    '{"brandbox_badge":"واقعي","catalog_curated_on":"2026-09-05","supported_resolutions":["1K","2K"],"supported_ratios":["1:1","3:4","4:3","9:16","16:9","2:3","3:2","9:19.5","19.5:9","9:20","20:9","1:2","2:1","auto"],"count_range":{"min":1,"max":1},"input_reference_range":{"min":0,"max":3}}'::jsonb,
    'موديل xAI عالي الواقعية ومفيد للبوسترات والإعلانات والنصوص داخل الصور.',
    'High-fidelity xAI image model suited to posters, ads and multilingual text rendering.'
  )
)
INSERT INTO public.ai_model_catalog (
  model_id, provider, generation_type, display_name_ar, display_name_en,
  pricing_mode, reservation_multiplier, minimum_credits,
  is_enabled, is_visible_to_users, sort_order, metadata, pricing_checked_at,
  vendor_name, tool_category, public_description_ar, public_description_en,
  is_featured, updated_at
)
SELECT
  model_id, 'openrouter', 'image', display_name_ar, display_name_en,
  'image', 1, minimum_credits,
  FALSE, FALSE, sort_order, metadata, NOW(),
  vendor_name, 'image', public_description_ar, public_description_en,
  sort_order <= 25, NOW()
FROM image_catalog
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
  is_featured = EXCLUDED.is_featured,
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  updated_at = NOW();

WITH video_catalog (
  model_id, display_name_ar, display_name_en, vendor_name,
  provider_floor_usd_per_second, minimum_credits, sort_order, metadata,
  public_description_ar, public_description_en
) AS (
  VALUES
  (
    'bytedance/seedance-2.0-mini', 'Seedance 2.0 Mini', 'Seedance 2.0 Mini', 'OpenRouter / ByteDance',
    0.01345::numeric, 20, 5,
    '{"brandbox_badge":"الأكثر استخدامًا","catalog_curated_on":"2026-09-05","openrouter_usage_rank":1,"supported_durations":[4,5,6,7,8,9,10,11,12,13,14,15],"supported_resolutions":["480p","720p"],"supported_ratios":["21:9","16:9","4:3","1:1","3:4","9:16"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'الخيار الأكثر استخدامًا على OpenRouter للفيديو حاليًا، اقتصادي ويدعم 4–15 ثانية.',
    'Current most-used OpenRouter video model; cost-efficient with 4–15 second generation.'
  ),
  (
    'bytedance/seedance-2.5', 'Seedance 2.5', 'Seedance 2.5', 'OpenRouter / ByteDance',
    0.1028::numeric, 40, 10,
    '{"brandbox_badge":"قصص طويلة","catalog_curated_on":"2026-09-05","openrouter_usage_rank":2,"supported_durations":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"supported_resolutions":["480p","720p"],"supported_ratios":["16:9","4:3","1:1","3:4","9:16","21:9"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Seedance أحدث للقصص الأطول والمراجع المتعددة والصوت المولد اختياريًا.',
    'Newer Seedance model for longer storytelling, multimodal references and optional generated audio.'
  ),
  (
    'google/veo-3.1-lite', 'Veo 3.1 Lite', 'Veo 3.1 Lite', 'OpenRouter / Google',
    0.05::numeric, 30, 15,
    '{"brandbox_badge":"Google اقتصادي","catalog_curated_on":"2026-09-05","openrouter_usage_rank":3,"supported_durations":[4,6,8],"supported_resolutions":["720p","1080p"],"supported_ratios":["16:9","9:16"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Veo اقتصادي من Google بدقة 720p و1080p مع صوت متزامن.',
    'Cost-efficient Google Veo model with 720p/1080p and synchronized audio.'
  ),
  (
    'bytedance/seedance-2.0-fast', 'Seedance 2.0 Fast', 'Seedance 2.0 Fast', 'OpenRouter / ByteDance',
    0.04035::numeric, 30, 20,
    '{"brandbox_badge":"سريع","catalog_curated_on":"2026-09-05","openrouter_usage_rank":4,"minimum_duration_seconds":4,"maximum_duration_seconds":15,"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'نسخة Seedance تركز على سرعة التوليد وتكلفة أقل.',
    'Speed-focused Seedance variant for faster, lower-cost generation.'
  ),
  (
    'bytedance/seedance-2.0', 'Seedance 2.0', 'Seedance 2.0', 'OpenRouter / ByteDance',
    0.06726::numeric, 35, 25,
    '{"brandbox_badge":"جودة","catalog_curated_on":"2026-09-05","openrouter_usage_rank":5,"minimum_duration_seconds":4,"maximum_duration_seconds":15,"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Seedance 2.0 بجودة أعلى وثبات جيد للشخصيات وحركة الكاميرا.',
    'Higher-quality Seedance generation with strong character/style and camera-motion consistency.'
  ),
  (
    'x-ai/grok-imagine-video', 'Grok Imagine Video', 'Grok Imagine Video', 'OpenRouter / xAI',
    0.05::numeric, 30, 30,
    '{"brandbox_badge":"مرن","catalog_curated_on":"2026-09-05","openrouter_usage_rank":6,"minimum_duration_seconds":1,"maximum_duration_seconds":15,"supported_resolutions":["480p","720p"],"supported_ratios":["16:9","9:16","1:1","4:3","3:4","3:2","2:3"],"supported_frame_images":["first_frame"],"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Grok للفيديو السريع مع نسب متعددة ومدة مرنة من 1 إلى 15 ثانية.',
    'Fast xAI video model with multiple aspect ratios and flexible 1–15 second clips.'
  ),
  (
    'minimax/hailuo-3', 'MiniMax H3', 'MiniMax H3', 'OpenRouter / MiniMax',
    0.13::numeric, 40, 35,
    '{"brandbox_badge":"2K + صوت","catalog_curated_on":"2026-09-05","openrouter_usage_rank":7,"minimum_duration_seconds":5,"maximum_duration_seconds":15,"supported_resolutions":["2K"],"supported_ratios":["21:9","16:9","4:3","1:1","3:4","9:16"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'MiniMax H3 للإنتاج التجاري بدقة 2K مع مخرجات سمعية بصرية.',
    'Commercial MiniMax video model with 2K output and native audiovisual generation.'
  ),
  (
    'google/veo-3.1-fast', 'Veo 3.1 Fast', 'Veo 3.1 Fast', 'OpenRouter / Google',
    0.10::numeric, 50, 40,
    '{"brandbox_badge":"Google سريع","catalog_curated_on":"2026-09-05","openrouter_usage_rank":8,"supported_durations":[4,6,8],"supported_resolutions":["720p","1080p","4K"],"supported_ratios":["16:9","9:16"],"supported_frame_images":["first_frame","last_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Veo سريع من Google يوازن بين السرعة والجودة مع صوت متزامن.',
    'Google Veo mid-tier model balancing speed and quality with synchronized audio.'
  ),
  (
    'alibaba/wan-3.0', 'Wan 3.0', 'Wan 3.0', 'OpenRouter / Alibaba',
    0.0425::numeric, 30, 45,
    '{"brandbox_badge":"حتى 30ث","catalog_curated_on":"2026-09-05","openrouter_usage_rank":9,"minimum_duration_seconds":2,"maximum_duration_seconds":30,"supported_resolutions":["480p","720p","1080p"],"supported_ratios":["16:9","4:3","1:1","3:4","9:16"],"supported_frame_images":["first_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Wan 3.0 من Alibaba بمدد تصل إلى 30 ثانية و480p/720p/1080p.',
    'Alibaba Wan 3.0 with up to 30-second clips and 480p/720p/1080p output.'
  ),
  (
    'x-ai/grok-imagine-video-1.5', 'Grok Imagine Video 1.5', 'Grok Imagine Video 1.5', 'OpenRouter / xAI',
    0.08::numeric, 40, 50,
    '{"brandbox_badge":"صوت + 1080p","catalog_curated_on":"2026-09-05","openrouter_usage_rank":10,"minimum_duration_seconds":1,"maximum_duration_seconds":15,"supported_resolutions":["480p","720p","1080p"],"supported_ratios":["16:9","9:16","1:1","4:3","3:4","3:2","2:3"],"supported_frame_images":["first_frame"],"generate_audio":true,"provider_async":true,"provider_output_ephemeral":true}'::jsonb,
    'Grok Imagine 1.5 حتى 1080p مع إمكانية توليد مؤثرات وصوت متزامن.',
    'Grok Imagine 1.5 up to 1080p with synchronized sound generation capabilities.'
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
  public_description_en, 'pro', sort_order <= 15, NOW()
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
  is_featured = EXCLUDED.is_featured,
  metadata = COALESCE(public.ai_model_catalog.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  pricing_checked_at = EXCLUDED.pricing_checked_at,
  updated_at = NOW();

COMMIT;
