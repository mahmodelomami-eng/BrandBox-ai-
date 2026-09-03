BEGIN;

CREATE TABLE IF NOT EXISTS public.social_publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'tiktok', 'youtube', 'linkedin')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 4 CHECK (max_attempts BETWEEN 1 AND 10),
  worker_id TEXT,
  leased_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  provider_publication_id TEXT,
  provider_publication_url TEXT,
  error_code TEXT,
  error_summary TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, connection_id),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_social_publish_jobs_due
  ON public.social_publish_jobs(status, next_attempt_at, scheduled_at)
  WHERE status IN ('queued', 'publishing');

CREATE INDEX IF NOT EXISTS idx_social_publish_jobs_post
  ON public.social_publish_jobs(post_id, status);

CREATE INDEX IF NOT EXISTS idx_social_publish_jobs_user
  ON public.social_publish_jobs(user_id, created_at DESC);

ALTER TABLE public.social_publish_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_publish_jobs FROM anon, authenticated;
GRANT ALL ON public.social_publish_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_social_post_jobs_atomic(
  p_user_id UUID,
  p_post_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_targets JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target JSONB;
  v_connection_id UUID;
  v_provider TEXT;
  v_target_count INTEGER;
BEGIN
  IF p_scheduled_at IS NULL OR p_scheduled_at <= NOW() + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'SCHEDULE_TIME_TOO_SOON';
  END IF;

  IF jsonb_typeof(p_targets) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_SOCIAL_TARGETS';
  END IF;

  v_target_count := jsonb_array_length(p_targets);
  IF v_target_count < 1 OR v_target_count > 4 THEN
    RAISE EXCEPTION 'INVALID_SOCIAL_TARGETS';
  END IF;

  PERFORM 1
  FROM public.social_posts
  WHERE id = p_post_id
    AND user_id = p_user_id
    AND status IN ('draft', 'cancelled', 'failed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_POST_NOT_SCHEDULABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = p_post_id AND status IN ('publishing', 'published')
  ) THEN
    RAISE EXCEPTION 'SOCIAL_POST_ALREADY_IN_FLIGHT';
  END IF;

  UPDATE public.social_publish_jobs
  SET status = 'cancelled',
      worker_id = NULL,
      leased_at = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE post_id = p_post_id
    AND status IN ('queued', 'failed');

  FOR v_target IN SELECT * FROM jsonb_array_elements(p_targets)
  LOOP
    BEGIN
      v_connection_id := (v_target ->> 'connectionId')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_SOCIAL_CONNECTION_ID';
    END;
    v_provider := v_target ->> 'provider';

    IF v_provider NOT IN ('meta', 'tiktok', 'youtube', 'linkedin') THEN
      RAISE EXCEPTION 'SOCIAL_PROVIDER_NOT_SUPPORTED';
    END IF;

    PERFORM 1
    FROM public.social_connections
    WHERE id = v_connection_id
      AND user_id = p_user_id
      AND provider = v_provider
      AND status = 'connected';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SOCIAL_CONNECTION_REQUIRED';
    END IF;

    INSERT INTO public.social_publish_jobs (
      user_id,
      post_id,
      connection_id,
      provider,
      status,
      scheduled_at,
      next_attempt_at,
      attempt_count,
      max_attempts,
      idempotency_key,
      worker_id,
      leased_at,
      lease_expires_at,
      error_code,
      error_summary,
      provider_publication_id,
      provider_publication_url,
      published_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_post_id,
      v_connection_id,
      v_provider,
      'queued',
      p_scheduled_at,
      p_scheduled_at,
      0,
      4,
      'social_publish_' || p_post_id::TEXT || '_' || v_connection_id::TEXT,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NOW()
    )
    ON CONFLICT (post_id, connection_id) DO UPDATE SET
      provider = EXCLUDED.provider,
      status = 'queued',
      scheduled_at = EXCLUDED.scheduled_at,
      next_attempt_at = EXCLUDED.next_attempt_at,
      attempt_count = 0,
      max_attempts = EXCLUDED.max_attempts,
      worker_id = NULL,
      leased_at = NULL,
      lease_expires_at = NULL,
      error_code = NULL,
      error_summary = NULL,
      provider_publication_id = NULL,
      provider_publication_url = NULL,
      published_at = NULL,
      updated_at = NOW();
  END LOOP;

  UPDATE public.social_posts
  SET status = 'scheduled',
      scheduled_at = p_scheduled_at,
      published_at = NULL,
      error_summary = NULL,
      updated_at = NOW()
  WHERE id = p_post_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_social_post_jobs_atomic(
  p_user_id UUID,
  p_post_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.social_posts WHERE id = p_post_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_POST_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = p_post_id AND status IN ('publishing', 'published')
  ) THEN
    RAISE EXCEPTION 'SOCIAL_POST_ALREADY_IN_FLIGHT';
  END IF;

  UPDATE public.social_publish_jobs
  SET status = 'cancelled',
      worker_id = NULL,
      leased_at = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE post_id = p_post_id
    AND user_id = p_user_id
    AND status IN ('queued', 'failed');

  UPDATE public.social_posts
  SET status = 'cancelled',
      scheduled_at = NULL,
      error_summary = NULL,
      updated_at = NOW()
  WHERE id = p_post_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_social_publish_jobs(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.social_publish_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_worker_id IS NULL OR length(trim(p_worker_id)) < 8 THEN
    RAISE EXCEPTION 'INVALID_SOCIAL_WORKER_ID';
  END IF;

  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.social_publish_jobs j
    WHERE j.attempt_count < j.max_attempts
      AND (
        (j.status = 'queued' AND j.next_attempt_at <= NOW() AND j.scheduled_at <= NOW())
        OR
        (j.status = 'publishing' AND j.lease_expires_at IS NOT NULL AND j.lease_expires_at <= NOW())
      )
    ORDER BY j.next_attempt_at ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 25))
  ), claimed AS (
    UPDATE public.social_publish_jobs j
    SET status = 'publishing',
        worker_id = p_worker_id,
        leased_at = NOW(),
        lease_expires_at = NOW() + INTERVAL '5 minutes',
        attempt_count = j.attempt_count + 1,
        updated_at = NOW()
    FROM picked
    WHERE j.id = picked.id
    RETURNING j.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_social_post_jobs_atomic(UUID, UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_social_post_jobs_atomic(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_social_publish_jobs(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_social_post_jobs_atomic(UUID, UUID, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_social_post_jobs_atomic(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_social_publish_jobs(TEXT, INTEGER) TO service_role;

COMMIT;
