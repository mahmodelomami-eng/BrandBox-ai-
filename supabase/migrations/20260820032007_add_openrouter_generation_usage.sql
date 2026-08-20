BEGIN;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS result_content TEXT,
  ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS provider_cost_usd NUMERIC(14, 8);

CREATE INDEX IF NOT EXISTS idx_generations_provider_request_id
  ON public.generations(provider_request_id)
  WHERE provider_request_id IS NOT NULL;

COMMIT;
