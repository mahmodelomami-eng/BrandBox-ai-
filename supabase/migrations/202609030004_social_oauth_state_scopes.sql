BEGIN;

ALTER TABLE public.social_oauth_states
  ADD COLUMN IF NOT EXISTS requested_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_provider_expiry
  ON public.social_oauth_states(provider, expires_at)
  WHERE consumed_at IS NULL;

COMMIT;
