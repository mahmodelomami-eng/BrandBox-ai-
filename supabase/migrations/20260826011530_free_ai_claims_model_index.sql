BEGIN;
CREATE INDEX IF NOT EXISTS idx_free_ai_claims_model_id
  ON public.free_ai_request_claims(model_id);
COMMIT;
