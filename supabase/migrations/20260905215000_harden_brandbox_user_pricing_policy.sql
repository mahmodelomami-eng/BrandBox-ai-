BEGIN;

-- Brand Box user pricing policy:
-- 1) Provider-free does NOT mean user-free. User access is sold in Brand Box
--    credits whenever the catalog contains a positive Brand Box price.
-- 2) Direct provider-free bypass is disabled.
-- 3) Align the admin reference credit value with the cheapest approved active
--    subscription economics (Business pilot_v1 = 449 / 4000 = 0.11225 LYD).
-- 4) Normalize current catalog visibility: models without a positive Brand Box
--    user price remain admin-manageable but are hidden from users.

UPDATE public.billing_settings
SET reference_credit_value_lyd = 0.11225,
    free_models_enabled = FALSE,
    updated_at = NOW()
WHERE id = 'default';

-- Non-video tools currently use minimum_credits as the Brand Box user price.
UPDATE public.ai_model_catalog
SET is_visible_to_users = FALSE,
    updated_at = NOW()
WHERE generation_type <> 'video'
  AND (minimum_credits IS NULL OR minimum_credits < 1);

-- Video tools require either a valid v1 pricing matrix with at least one
-- positive credit rate, or the legacy positive Brand Box credits/sec contract.
UPDATE public.ai_model_catalog
SET is_visible_to_users = FALSE,
    updated_at = NOW()
WHERE generation_type = 'video'
  AND NOT (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(metadata->'brandbox_video_pricing_matrix'->'variants') = 'array'
            THEN metadata->'brandbox_video_pricing_matrix'->'variants'
          ELSE '[]'::jsonb
        END
      ) AS variant
      WHERE COALESCE((variant->>'credits_per_second')::numeric, 0) > 0
    )
    OR COALESCE((metadata->>'brandbox_credits_per_second')::numeric, 0) > 0
  );

COMMIT;
