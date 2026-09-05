BEGIN;

-- The existing Brand Box rate for Seedance 2.0 Mini was verified against the
-- 480p/no-audio launch envelope. Live OpenRouter capability discovery may expose
-- additional resolutions/audio, but those settings must not inherit this rate.
-- #227 will replace this narrow scope with a complete settings-aware price matrix.
UPDATE public.ai_model_catalog
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'brandbox_priced_resolutions', jsonb_build_array('480p'),
      'brandbox_priced_audio_modes', jsonb_build_array('off'),
      'brandbox_pricing_scope_verified_on', '2026-09-05'
    ),
    updated_at = NOW()
WHERE model_id = 'bytedance/seedance-2.0-mini'
  AND provider = 'openrouter'
  AND generation_type = 'video';

COMMIT;
