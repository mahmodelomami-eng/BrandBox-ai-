BEGIN;

CREATE TABLE IF NOT EXISTS public.free_ai_request_claims (
  generation_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES public.ai_model_catalog(model_id) ON DELETE RESTRICT,
  claim_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_ai_claims_date
  ON public.free_ai_request_claims(claim_date, created_at);
CREATE INDEX IF NOT EXISTS idx_free_ai_claims_user_date
  ON public.free_ai_request_claims(user_id, claim_date, created_at);

ALTER TABLE public.free_ai_request_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.free_ai_request_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.free_ai_request_claims TO service_role;
DROP POLICY IF EXISTS free_ai_request_claims_deny_all ON public.free_ai_request_claims;
CREATE POLICY free_ai_request_claims_deny_all
  ON public.free_ai_request_claims
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE OR REPLACE FUNCTION public.claim_free_ai_request(
  p_user_id UUID,
  p_model_id TEXT,
  p_generation_id TEXT
)
RETURNS TABLE(
  allowed BOOLEAN,
  message TEXT,
  user_used INTEGER,
  user_limit INTEGER,
  global_used INTEGER,
  global_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::date;
  v_model RECORD;
  v_settings RECORD;
  v_user_used INTEGER;
  v_global_used INTEGER;
  v_user_limit INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_model_id IS NULL OR btrim(p_model_id) = ''
     OR p_generation_id IS NULL OR btrim(p_generation_id) = '' THEN
    RETURN QUERY SELECT FALSE, 'INVALID_FREE_AI_CLAIM'::TEXT, 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT model_id, is_free, is_enabled, daily_free_user_limit
    INTO v_model
  FROM public.ai_model_catalog
  WHERE model_id = p_model_id;

  IF NOT FOUND OR NOT v_model.is_enabled OR NOT v_model.is_free THEN
    RETURN QUERY SELECT FALSE, 'MODEL_NOT_FREE_OR_DISABLED'::TEXT, 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT free_models_enabled, free_user_daily_limit, openrouter_free_global_daily_limit
    INTO v_settings
  FROM public.billing_settings
  WHERE id = 'default';

  IF NOT FOUND OR NOT v_settings.free_models_enabled THEN
    RETURN QUERY SELECT FALSE, 'FREE_MODELS_DISABLED'::TEXT, 0, 0, 0, 0;
    RETURN;
  END IF;

  v_user_limit := LEAST(
    v_settings.free_user_daily_limit,
    COALESCE(v_model.daily_free_user_limit, v_settings.free_user_daily_limit)
  );

  PERFORM pg_advisory_xact_lock(hashtext('brandbox-free-ai-' || v_today::text));

  IF EXISTS (SELECT 1 FROM public.free_ai_request_claims WHERE generation_id = p_generation_id) THEN
    SELECT COUNT(*)::INTEGER INTO v_user_used
      FROM public.free_ai_request_claims
      WHERE claim_date = v_today AND user_id = p_user_id;
    SELECT COUNT(*)::INTEGER INTO v_global_used
      FROM public.free_ai_request_claims
      WHERE claim_date = v_today;
    RETURN QUERY SELECT TRUE, 'IDEMPOTENT_DUPLICATE'::TEXT, v_user_used, v_user_limit,
      v_global_used, v_settings.openrouter_free_global_daily_limit;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_user_used
    FROM public.free_ai_request_claims
    WHERE claim_date = v_today AND user_id = p_user_id;
  SELECT COUNT(*)::INTEGER INTO v_global_used
    FROM public.free_ai_request_claims
    WHERE claim_date = v_today;

  IF v_user_used >= v_user_limit THEN
    RETURN QUERY SELECT FALSE, 'FREE_USER_DAILY_LIMIT_REACHED'::TEXT, v_user_used, v_user_limit,
      v_global_used, v_settings.openrouter_free_global_daily_limit;
    RETURN;
  END IF;

  IF v_global_used >= v_settings.openrouter_free_global_daily_limit THEN
    RETURN QUERY SELECT FALSE, 'FREE_GLOBAL_DAILY_LIMIT_REACHED'::TEXT, v_user_used, v_user_limit,
      v_global_used, v_settings.openrouter_free_global_daily_limit;
    RETURN;
  END IF;

  INSERT INTO public.free_ai_request_claims(generation_id, user_id, model_id, claim_date)
  VALUES(p_generation_id, p_user_id, p_model_id, v_today);

  v_user_used := v_user_used + 1;
  v_global_used := v_global_used + 1;

  RETURN QUERY SELECT TRUE, 'SUCCESS'::TEXT, v_user_used, v_user_limit,
    v_global_used, v_settings.openrouter_free_global_daily_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_free_ai_request(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_ai_request(UUID, TEXT, TEXT) TO service_role;

COMMIT;
