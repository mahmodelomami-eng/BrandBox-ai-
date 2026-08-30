-- Brand Box AI ظ¤ per-generation provider cost and margin snapshot
BEGIN;

CREATE TABLE IF NOT EXISTS public.generation_financials (
  generation_id TEXT PRIMARY KEY REFERENCES public.generations(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  provider_cost_usd NUMERIC(16,8),
  quoted_credits INTEGER NOT NULL CHECK (quoted_credits > 0),
  charged_credits INTEGER NOT NULL CHECK (charged_credits >= 0),
  market_usd_lyd NUMERIC(12,4) NOT NULL,
  openrouter_topup_fee_pct NUMERIC(7,4) NOT NULL,
  bank_transfer_fee_pct NUMERIC(7,4) NOT NULL,
  risk_buffer_pct NUMERIC(7,4) NOT NULL,
  target_gross_margin_pct NUMERIC(7,4) NOT NULL,
  reference_credit_value_lyd NUMERIC(12,4) NOT NULL,
  acquisition_cost_lyd NUMERIC(16,8),
  billed_reference_value_lyd NUMERIC(16,8) NOT NULL,
  realized_gross_margin_pct NUMERIC(9,4),
  pricing_version TEXT NOT NULL DEFAULT 'credits-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_financials_model_date
  ON public.generation_financials(model_id, created_at DESC);

ALTER TABLE public.generation_financials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.generation_financials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.generation_financials TO service_role;

COMMIT;
