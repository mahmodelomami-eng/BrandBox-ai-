BEGIN;

CREATE INDEX IF NOT EXISTS idx_social_connections_expiry
  ON public.social_connections(status, credential_expires_at)
  WHERE status = 'connected' AND credential_expires_at IS NOT NULL;

COMMIT;
