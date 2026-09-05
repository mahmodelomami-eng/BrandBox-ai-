BEGIN;

-- OpenRouter publishes Kling v3 pricing by audio mode, not by resolution.
-- Brand Box therefore uses the v1 wildcard resolution (`*`) contract. The
-- wildcard is server-only pricing metadata and is never rendered as a user
-- resolution option.
--
-- pilot_v1 factor: ~331.156 Brand Box credits / provider USD-second.
-- Rates are rounded upward to whole credits so we never undercharge.

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
        'pricing_dimension', 'audio_mode',
        'resolution_independent', TRUE,
        'variants', jsonb_build_array(
          jsonb_build_object(
            'resolution', '*',
            'audio_mode', 'off',
            'credits_per_second', 28,
            'provider_usd_per_second', 0.084
          ),
          jsonb_build_object(
            'resolution', '*',
            'audio_mode', 'on',
            'credits_per_second', 42,
            'provider_usd_per_second', 0.126
          )
        )
      ),
      'brandbox_pricing_source', 'openrouter_model_pricing',
      'brandbox_pricing_verified_on', '2026-09-05'
    ),
    provider_cost_per_second_usd = 0.084,
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'kwaivgi/kling-v3.0-std'
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
        'pricing_dimension', 'audio_mode',
        'resolution_independent', TRUE,
        'variants', jsonb_build_array(
          jsonb_build_object(
            'resolution', '*',
            'audio_mode', 'off',
            'credits_per_second', 38,
            'provider_usd_per_second', 0.112
          ),
          jsonb_build_object(
            'resolution', '*',
            'audio_mode', 'on',
            'credits_per_second', 56,
            'provider_usd_per_second', 0.168
          )
        )
      ),
      'brandbox_pricing_source', 'openrouter_model_pricing',
      'brandbox_pricing_verified_on', '2026-09-05'
    ),
    provider_cost_per_second_usd = 0.112,
    pricing_checked_at = NOW(),
    updated_at = NOW()
FROM policy
WHERE catalog.model_id = 'kwaivgi/kling-v3.0-pro'
  AND catalog.provider = 'openrouter'
  AND catalog.generation_type = 'video';

COMMIT;
