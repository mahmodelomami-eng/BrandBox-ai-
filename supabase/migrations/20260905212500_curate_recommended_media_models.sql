BEGIN;

-- Curate the small Brand Box recommended set without changing provider
-- activation, visibility, pricing or capability metadata.
-- Browser presentation remains driven by server catalog fields.

UPDATE public.ai_model_catalog
SET is_featured = CASE model_id
      WHEN 'google/gemini-3.1-flash-image' THEN TRUE
      WHEN 'google/gemini-3.1-flash-lite-image' THEN TRUE
      WHEN 'openai/gpt-image-2' THEN TRUE
      WHEN 'bytedance-seed/seedream-4.5' THEN TRUE
      WHEN 'black-forest-labs/flux.2-pro' THEN TRUE
      ELSE FALSE
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'brandbox_badge', CASE model_id
        WHEN 'google/gemini-3.1-flash-image' THEN 'موصى به'
        WHEN 'google/gemini-3.1-flash-lite-image' THEN 'اقتصادي'
        WHEN 'openai/gpt-image-2' THEN 'أعلى جودة'
        WHEN 'bytedance-seed/seedream-4.5' THEN 'احترافي'
        WHEN 'black-forest-labs/flux.2-pro' THEN 'احترافي'
        ELSE COALESCE(metadata->>'brandbox_badge', 'متاح')
      END
    ),
    updated_at = NOW()
WHERE provider = 'openrouter'
  AND generation_type = 'image';

UPDATE public.ai_model_catalog
SET is_featured = CASE model_id
      WHEN 'bytedance/seedance-2.0-mini' THEN TRUE
      WHEN 'google/veo-3.1-lite' THEN TRUE
      WHEN 'bytedance/seedance-2.5' THEN TRUE
      WHEN 'google/veo-3.1-fast' THEN TRUE
      WHEN 'kwaivgi/kling-v3.0-std' THEN TRUE
      WHEN 'kwaivgi/kling-v3.0-pro' THEN TRUE
      ELSE FALSE
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'brandbox_badge', CASE model_id
        WHEN 'bytedance/seedance-2.0-mini' THEN 'موصى به'
        WHEN 'google/veo-3.1-lite' THEN 'اقتصادي'
        WHEN 'bytedance/seedance-2.5' THEN 'أعلى جودة'
        WHEN 'google/veo-3.1-fast' THEN 'سريع'
        WHEN 'kwaivgi/kling-v3.0-std' THEN 'احترافي'
        WHEN 'kwaivgi/kling-v3.0-pro' THEN 'احترافي'
        ELSE COALESCE(metadata->>'brandbox_badge', 'متاح')
      END
    ),
    updated_at = NOW()
WHERE provider = 'openrouter'
  AND generation_type = 'video';

COMMIT;
