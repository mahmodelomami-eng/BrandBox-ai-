-- Brand Box AI ظ¤ Billing & Credits v1 foundation
BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id TEXT PRIMARY KEY,
  market_usd_lyd NUMERIC(12,4) NOT NULL CHECK (market_usd_lyd > 0),
  openrouter_topup_fee_pct NUMERIC(7,4) NOT NULL CHECK (openrouter_topup_fee_pct >= 0 AND openrouter_topup_fee_pct < 100),
  bank_transfer_fee_pct NUMERIC(7,4) NOT NULL CHECK (bank_transfer_fee_pct >= 0 AND bank_transfer_fee_pct < 100),
  risk_buffer_pct NUMERIC(7,4) NOT NULL CHECK (risk_buffer_pct >= 0 AND risk_buffer_pct < 100),
  target_gross_margin_pct NUMERIC(7,4) NOT NULL CHECK (target_gross_margin_pct >= 0 AND target_gross_margin_pct < 100),
  reference_credit_value_lyd NUMERIC(12,4) NOT NULL CHECK (reference_credit_value_lyd > 0),
  minimum_operation_credits INTEGER NOT NULL DEFAULT 1 CHECK (minimum_operation_credits > 0),
  max_bonus_pct NUMERIC(7,4) NOT NULL DEFAULT 20 CHECK (max_bonus_pct >= 0 AND max_bonus_pct <= 20),
  emergency_fx_threshold_lyd NUMERIC(12,4) NOT NULL DEFAULT 18 CHECK (emergency_fx_threshold_lyd > 0),
  hard_stop_fx_threshold_lyd NUMERIC(12,4) NOT NULL DEFAULT 22 CHECK (hard_stop_fx_threshold_lyd > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.billing_settings (
  id, market_usd_lyd, openrouter_topup_fee_pct, bank_transfer_fee_pct,
  risk_buffer_pct, target_gross_margin_pct, reference_credit_value_lyd,
  minimum_operation_credits, max_bonus_pct, emergency_fx_threshold_lyd, hard_stop_fx_threshold_lyd
) VALUES (
  'default', 11.0000, 5.5000, 2.5000, 25.0000, 60.0000, 0.1000, 1, 20.0000, 18.0000, 22.0000
)
ON CONFLICT (id) DO UPDATE SET
  market_usd_lyd = EXCLUDED.market_usd_lyd,
  openrouter_topup_fee_pct = EXCLUDED.openrouter_topup_fee_pct,
  bank_transfer_fee_pct = EXCLUDED.bank_transfer_fee_pct,
  risk_buffer_pct = EXCLUDED.risk_buffer_pct,
  target_gross_margin_pct = EXCLUDED.target_gross_margin_pct,
  reference_credit_value_lyd = EXCLUDED.reference_credit_value_lyd,
  minimum_operation_credits = EXCLUDED.minimum_operation_credits,
  max_bonus_pct = EXCLUDED.max_bonus_pct,
  emergency_fx_threshold_lyd = EXCLUDED.emergency_fx_threshold_lyd,
  hard_stop_fx_threshold_lyd = EXCLUDED.hard_stop_fx_threshold_lyd,
  updated_at = NOW();

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.ai_model_catalog (
  model_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  generation_type TEXT NOT NULL CHECK (generation_type IN ('chat','image','video','audio')),
  display_name_ar TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  pricing_mode TEXT NOT NULL CHECK (pricing_mode IN ('token','image','second','dynamic')),
  input_cost_per_million_usd NUMERIC(14,6),
  output_cost_per_million_usd NUMERIC(14,6),
  fixed_provider_cost_usd NUMERIC(14,6),
  provider_cost_per_second_usd NUMERIC(14,6),
  reservation_multiplier NUMERIC(8,4) NOT NULL DEFAULT 1.25 CHECK (reservation_multiplier >= 1),
  minimum_credits INTEGER NOT NULL DEFAULT 1 CHECK (minimum_credits > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_to_users BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_model_catalog (
  model_id, provider, generation_type, display_name_ar, display_name_en, pricing_mode,
  input_cost_per_million_usd, output_cost_per_million_usd, reservation_multiplier,
  minimum_credits, is_enabled, is_visible_to_users, sort_order, metadata, pricing_checked_at
) VALUES (
  'google/gemini-3.7-flash', 'openrouter', 'chat', 'Brand Box Smart', 'Brand Box Smart', 'token',
  0.375000, 1.875000, 1.25, 1, TRUE, TRUE, 10,
  jsonb_build_object('pilot', TRUE, 'openrouter_model_pinned', TRUE), NOW()
)
ON CONFLICT (model_id) DO UPDATE SET
  input_cost_per_million_usd = EXCLUDED.input_cost_per_million_usd,
  output_cost_per_million_usd = EXCLUDED.output_cost_per_million_usd,
  reservation_multiplier = EXCLUDED.reservation_multiplier,
  minimum_credits = EXCLUDED.minimum_credits,
  is_enabled = EXCLUDED.is_enabled,
  is_visible_to_users = EXCLUDED.is_visible_to_users,
  metadata = EXCLUDED.metadata,
  pricing_checked_at = NOW(),
  updated_at = NOW();

ALTER TABLE public.ai_model_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_model_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_model_catalog TO service_role;

CREATE TABLE IF NOT EXISTS public.legal_policy_versions (
  policy_type TEXT NOT NULL CHECK (policy_type IN ('terms','privacy')),
  version TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  public_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (policy_type, version)
);

INSERT INTO public.legal_policy_versions (policy_type, version, effective_at, is_active, public_path)
VALUES
  ('terms','2026-08-26-v1',NOW(),TRUE,'/terms'),
  ('privacy','2026-08-26-v1',NOW(),TRUE,'/privacy')
ON CONFLICT (policy_type, version) DO NOTHING;

ALTER TABLE public.legal_policy_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legal_policy_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.legal_policy_versions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_policy_versions TO service_role;
DROP POLICY IF EXISTS legal_policy_versions_public_read ON public.legal_policy_versions;
CREATE POLICY legal_policy_versions_public_read
ON public.legal_policy_versions FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

CREATE TABLE IF NOT EXISTS public.user_legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_ip_hash TEXT,
  accepted_user_agent TEXT,
  auth_provider TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, terms_version, privacy_version)
);
CREATE INDEX IF NOT EXISTS idx_user_legal_consents_user_date
  ON public.user_legal_consents(user_id, accepted_at DESC);
ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_legal_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_legal_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_legal_consents TO service_role;
DROP POLICY IF EXISTS user_legal_consents_self_read ON public.user_legal_consents;
CREATE POLICY user_legal_consents_self_read
ON public.user_legal_consents FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS rollover_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rollover_cap_pct INTEGER NOT NULL DEFAULT 100 CHECK (rollover_cap_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS rollover_max_cycles INTEGER NOT NULL DEFAULT 1 CHECK (rollover_max_cycles BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS renewal_grace_days INTEGER NOT NULL DEFAULT 7 CHECK (renewal_grace_days BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS monthly_bonus_credits INTEGER NOT NULL DEFAULT 0 CHECK (monthly_bonus_credits >= 0),
  ADD COLUMN IF NOT EXISTS bonus_valid_days INTEGER NOT NULL DEFAULT 30 CHECK (bonus_valid_days BETWEEN 1 AND 365);

UPDATE public.plans
SET rollover_enabled = CASE WHEN id = 'free' THEN FALSE ELSE TRUE END,
    rollover_cap_pct = CASE WHEN id = 'free' THEN 0 ELSE 100 END,
    rollover_max_cycles = CASE WHEN id = 'free' THEN 0 ELSE 1 END,
    renewal_grace_days = CASE WHEN id = 'free' THEN 0 ELSE 7 END,
    updated_at = NOW();

ALTER TABLE public.credit_lots
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rollover_cycles INTEGER NOT NULL DEFAULT 0 CHECK (rollover_cycles BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.credit_lots
  DROP CONSTRAINT IF EXISTS credit_lots_source_type_check,
  DROP CONSTRAINT IF EXISTS credit_lots_expiry_rule;
ALTER TABLE public.credit_lots
  ADD CONSTRAINT credit_lots_source_type_check
    CHECK (source_type IN ('purchase','bonus','subscription','rollover')),
  ADD CONSTRAINT credit_lots_expiry_rule
    CHECK (
      (source_type = 'purchase' AND expires_at IS NULL)
      OR
      (source_type IN ('bonus','subscription','rollover') AND expires_at IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_credit_lots_expiring_consumption
  ON public.credit_lots(user_id, expires_at, created_at)
  WHERE remaining_amount > 0 AND source_type IN ('bonus','subscription','rollover');

CREATE OR REPLACE FUNCTION public.organize_subscription_credit_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_reference TEXT;
BEGIN
  v_order_reference := NULLIF(NEW.metadata ->> 'order_reference', '');
  IF v_order_reference IS NULL THEN RETURN NEW; END IF;
  UPDATE public.credit_lots
  SET source_type = 'subscription',
      expires_at = NEW.current_period_end,
      plan_id = NEW.plan_id,
      subscription_id = NEW.id,
      cycle_start = NEW.current_period_start,
      cycle_end = NEW.current_period_end,
      rollover_cycles = 0,
      metadata = metadata || jsonb_build_object('subscription_credit', TRUE)
  WHERE user_id = NEW.user_id
    AND order_reference = v_order_reference
    AND source_type = 'purchase';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.organize_subscription_credit_cycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organize_subscription_credit_cycle() TO service_role;

DROP TRIGGER IF EXISTS on_subscription_credit_cycle ON public.subscriptions;
CREATE TRIGGER on_subscription_credit_cycle
AFTER INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.organize_subscription_credit_cycle();

COMMIT;
