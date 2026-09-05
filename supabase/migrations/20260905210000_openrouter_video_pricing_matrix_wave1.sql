BEGIN;

-- Brand Box pilot_v1 video pricing policy.
--
-- Commercial assumptions already approved for the pilot:
--   market FX                  11.00 LYD / USD
--   bank conversion fee        2.50%
--   OpenRouter fee             5.50%
--   currency reserve          25.00%
--   target gross margin       60.00%
--   revenue floor              0.11225 LYD / credit (Business plan)
--
-- These assumptions imply ~331.156 credits per provider USD/second before
-- rounding upward to a whole Brand Box credit. The explicit variants below are
-- authoritative; runtime billing does not recompute from client-visible values.
--
-- Production safety: this migration changes pricing metadata only. It never
-- enables or exposes a paid model. Staging may keep models visible for QA.

WITH policy AS (
  SELECT jsonb_build_object(
    'id', 'pilot_v1',
    'fx_lyd_per_usd', 11,
    'bank_conversion_fee_pct', 2.5,
    'openrouter_fee_pct', 5.5,
    'currency_reserve_pct', 25,
    'target_gross_margin_pct', 60,
    'revenue_floor_lyd_per_credit', 0.11225,
    'credits_per_provider_usd_second', 331.1560412026725,
    'pricing_checked_on', '2026-09-05',
    'rounding', 'ceil_to_whole_credit'
  ) AS value
)
UPDATE public.ai_model_catalog AS catalog
SET metadata = COALESCE(catalog.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'brandbox_pricing_policy', policy.value,
      'brandbox_video_pricing_matrix', jsonb_build_object(
        'version', 1,
        'variants', jsonb_build_array(
          jsonb_build_object('resolution', '480p', 'audio_mode', 'off', 'credits_per_second', 5,  'provider_usd_per_second', 0.01345),
          jsonb_build_object('resolution', '480p', 'audio_mode', 'on',  'credits_per_second', 5,  'provider_usd_per_second', 0.01345),
          jsonb_build_object('resolution', '720p', 'audio_mode', 'off', 'credits_per_second', 11, 'provider_usd_per_second', 0.03024),
          jsonb_build_object('resolution', '720p', 'audio_mode', 'on',  'credits_per_second', 11, 'provider_usd_per_second', 0.03024)
        )
      )
    ),
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'bytedance/seedance-2.0-mini'
  AND catalog.provider = 'openrouter'
  AND catalog.generation_type = 'video';

WITH policy AS (
  SELECT jsonb_build_object(
    'id', 'pilot_v1',
    'fx_lyd_per_usd', 11,
    'bank_conversion_fee_pct', 2.5,
    'openrouter_fee_pct', 5.5,
    'currency_reserve_pct', 25,
    'target_gross_margin_pct', 60,
    'revenue_floor_lyd_per_credit', 0.11225,
    'credits_per_provider_usd_second', 331.1560412026725,
    'pricing_checked_on', '2026-09-05',
    'rounding', 'ceil_to_whole_credit'
  ) AS value
)
UPDATE public.ai_model_catalog AS catalog
SET metadata = COALESCE(catalog.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'brandbox_pricing_policy', policy.value,
      'brandbox_video_pricing_matrix', jsonb_build_object(
        'version', 1,
        'variants', jsonb_build_array(
          jsonb_build_object('resolution', '480p', 'audio_mode', 'off', 'credits_per_second', 35, 'provider_usd_per_second', 0.1028),
          jsonb_build_object('resolution', '480p', 'audio_mode', 'on',  'credits_per_second', 35, 'provider_usd_per_second', 0.1028),
          jsonb_build_object('resolution', '720p', 'audio_mode', 'off', 'credits_per_second', 77, 'provider_usd_per_second', 0.2311),
          jsonb_build_object('resolution', '720p', 'audio_mode', 'on',  'credits_per_second', 77, 'provider_usd_per_second', 0.2311)
        )
      )
    ),
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'bytedance/seedance-2.5'
  AND catalog.provider = 'openrouter'
  AND catalog.generation_type = 'video';

WITH policy AS (
  SELECT jsonb_build_object(
    'id', 'pilot_v1',
    'fx_lyd_per_usd', 11,
    'bank_conversion_fee_pct', 2.5,
    'openrouter_fee_pct', 5.5,
    'currency_reserve_pct', 25,
    'target_gross_margin_pct', 60,
    'revenue_floor_lyd_per_credit', 0.11225,
    'credits_per_provider_usd_second', 331.1560412026725,
    'pricing_checked_on', '2026-09-05',
    'rounding', 'ceil_to_whole_credit'
  ) AS value
)
UPDATE public.ai_model_catalog AS catalog
SET metadata = COALESCE(catalog.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'brandbox_pricing_policy', policy.value,
      'brandbox_video_pricing_matrix', jsonb_build_object(
        'version', 1,
        'variants', jsonb_build_array(
          jsonb_build_object('resolution', '720p',  'audio_mode', 'off', 'credits_per_second', 10, 'provider_usd_per_second', 0.03),
          jsonb_build_object('resolution', '720p',  'audio_mode', 'on',  'credits_per_second', 17, 'provider_usd_per_second', 0.05),
          jsonb_build_object('resolution', '1080p', 'audio_mode', 'off', 'credits_per_second', 17, 'provider_usd_per_second', 0.05),
          jsonb_build_object('resolution', '1080p', 'audio_mode', 'on',  'credits_per_second', 27, 'provider_usd_per_second', 0.08)
        )
      )
    ),
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'google/veo-3.1-lite'
  AND catalog.provider = 'openrouter'
  AND catalog.generation_type = 'video';

WITH policy AS (
  SELECT jsonb_build_object(
    'id', 'pilot_v1',
    'fx_lyd_per_usd', 11,
    'bank_conversion_fee_pct', 2.5,
    'openrouter_fee_pct', 5.5,
    'currency_reserve_pct', 25,
    'target_gross_margin_pct', 60,
    'revenue_floor_lyd_per_credit', 0.11225,
    'credits_per_provider_usd_second', 331.1560412026725,
    'pricing_checked_on', '2026-09-05',
    'rounding', 'ceil_to_whole_credit'
  ) AS value
)
UPDATE public.ai_model_catalog AS catalog
SET metadata = COALESCE(catalog.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'brandbox_pricing_policy', policy.value,
      'brandbox_video_pricing_matrix', jsonb_build_object(
        'version', 1,
        'variants', jsonb_build_array(
          jsonb_build_object('resolution', '720p', 'audio_mode', 'off', 'credits_per_second', 27,  'provider_usd_per_second', 0.08),
          jsonb_build_object('resolution', '720p', 'audio_mode', 'on',  'credits_per_second', 34,  'provider_usd_per_second', 0.10),
          jsonb_build_object('resolution', '4K',   'audio_mode', 'off', 'credits_per_second', 83,  'provider_usd_per_second', 0.25),
          jsonb_build_object('resolution', '4K',   'audio_mode', 'on',  'credits_per_second', 100, 'provider_usd_per_second', 0.30)
        )
      ),
      'brandbox_unpriced_resolutions', jsonb_build_array('1080p')
    ),
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'google/veo-3.1-fast'
  AND catalog.provider = 'openrouter'
  AND catalog.generation_type = 'video';

COMMIT;
