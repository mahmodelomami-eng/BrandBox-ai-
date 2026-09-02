BEGIN;

-- Server-only social account metadata and encrypted credential envelopes.
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'tiktok', 'youtube', 'linkedin')),
  provider_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  account_type TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'reauth_required', 'revoked', 'error')),
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  credential_ciphertext TEXT,
  credential_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, provider_account_id)
);

-- OAuth state is intentionally server-only and short-lived.
CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'tiktok', 'youtube', 'linkedin')),
  pkce_verifier_ciphertext TEXT,
  return_uri TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  media_asset_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  target_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_connections_user ON public.social_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON public.social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_schedule ON public.social_posts(status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_social_oauth_states_expiry ON public.social_oauth_states(expires_at);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- These tables are consumed through authenticated server routes. Keeping them out of
-- direct Data API access prevents credential envelopes and scheduling internals from
-- leaking to a compromised mobile client.
REVOKE ALL ON public.social_connections FROM anon, authenticated;
REVOKE ALL ON public.social_oauth_states FROM anon, authenticated;
REVOKE ALL ON public.social_posts FROM anon, authenticated;
GRANT ALL ON public.social_connections TO service_role;
GRANT ALL ON public.social_oauth_states TO service_role;
GRANT ALL ON public.social_posts TO service_role;

COMMIT;
