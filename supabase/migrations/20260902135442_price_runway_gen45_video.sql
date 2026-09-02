-- Brand Box AI — verified Runway Gen-4.5 launch pricing.
-- Provider rate verified 2026-09-02: 12 Runway credits/sec = USD 0.12/sec.
-- Brand Box launch rate uses a conservative 13 LYD/USD planning FX assumption.

UPDATE public.ai_model_catalog
SET minimum_credits = 50,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'brandbox_credits_per_second', 25,
      'provider_runway_credits_per_second', 12,
      'provider_usd_per_second', 0.12,
      'pricing_fx_lyd_per_usd', 13,
      'pricing_margin_floor_pct', 40,
      'pricing_verified_at', '2026-09-02',
      'pricing_source', 'Runway Developer API pricing'
    ),
    updated_at = NOW()
WHERE model_id = 'gen4.5'
  AND provider = 'runway'
  AND generation_type = 'video';
