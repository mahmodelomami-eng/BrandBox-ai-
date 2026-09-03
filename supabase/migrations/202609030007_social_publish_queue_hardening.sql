BEGIN;

-- All queue RPCs are invoked only through the server-side service_role client.
-- SECURITY INVOKER keeps execution within the caller's privileges instead of
-- introducing an unnecessary privilege-escalation boundary.
ALTER FUNCTION public.schedule_social_post_jobs_atomic(UUID, UUID, TIMESTAMPTZ, JSONB) SECURITY INVOKER;
ALTER FUNCTION public.cancel_social_post_jobs_atomic(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.claim_due_social_publish_jobs(TEXT, INTEGER) SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.finalize_social_publish_job_atomic(
  p_worker_id TEXT,
  p_job_id UUID,
  p_result TEXT,
  p_provider_publication_id TEXT DEFAULT NULL,
  p_provider_publication_url TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_summary TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.social_publish_jobs%ROWTYPE;
  v_post_status TEXT;
  v_post_published_at TIMESTAMPTZ;
  v_effective_result TEXT;
BEGIN
  IF p_worker_id IS NULL OR length(trim(p_worker_id)) < 8 THEN
    RAISE EXCEPTION 'INVALID_SOCIAL_WORKER_ID';
  END IF;

  IF p_result NOT IN ('published', 'retry', 'failed', 'reauth_required') THEN
    RAISE EXCEPTION 'INVALID_SOCIAL_PUBLISH_RESULT';
  END IF;

  SELECT * INTO v_job
  FROM public.social_publish_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PUBLISH_JOB_NOT_FOUND';
  END IF;

  -- The worker id is a lease fence. A stale worker cannot overwrite a job that
  -- has already been reclaimed after lease expiry.
  IF v_job.status <> 'publishing' OR v_job.worker_id IS DISTINCT FROM p_worker_id THEN
    RAISE EXCEPTION 'SOCIAL_PUBLISH_JOB_LEASE_MISMATCH';
  END IF;

  v_effective_result := p_result;
  IF p_result = 'retry' AND v_job.attempt_count >= v_job.max_attempts THEN
    v_effective_result := 'failed';
  END IF;

  IF v_effective_result = 'published' THEN
    UPDATE public.social_publish_jobs
    SET status = 'published',
        provider_publication_id = NULLIF(left(COALESCE(p_provider_publication_id, ''), 500), ''),
        provider_publication_url = NULLIF(left(COALESCE(p_provider_publication_url, ''), 2000), ''),
        error_code = NULL,
        error_summary = NULL,
        published_at = NOW(),
        worker_id = NULL,
        leased_at = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
  ELSIF v_effective_result = 'retry' THEN
    UPDATE public.social_publish_jobs
    SET status = 'queued',
        next_attempt_at = GREATEST(COALESCE(p_retry_at, NOW() + INTERVAL '2 minutes'), NOW() + INTERVAL '15 seconds'),
        error_code = NULLIF(left(COALESCE(p_error_code, ''), 120), ''),
        error_summary = NULLIF(left(COALESCE(p_error_summary, ''), 1000), ''),
        worker_id = NULL,
        leased_at = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
  ELSE
    UPDATE public.social_publish_jobs
    SET status = 'failed',
        error_code = NULLIF(left(COALESCE(p_error_code, ''), 120), ''),
        error_summary = NULLIF(left(COALESCE(p_error_summary, ''), 1000), ''),
        worker_id = NULL,
        leased_at = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;

    IF v_effective_result = 'reauth_required' THEN
      UPDATE public.social_connections
      SET status = 'reauth_required',
          credential_ciphertext = NULL,
          credential_expires_at = NULL,
          updated_at = NOW()
      WHERE id = v_job.connection_id
        AND user_id = v_job.user_id;
    END IF;
  END IF;

  -- Aggregate delivery state back onto the parent post. A post is published
  -- only when every provider job has completed successfully.
  IF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id AND status = 'publishing'
  ) THEN
    v_post_status := 'publishing';
  ELSIF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id AND status = 'queued'
  ) THEN
    v_post_status := 'scheduled';
  ELSIF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id AND status = 'failed'
  ) THEN
    v_post_status := 'failed';
  ELSIF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id AND status <> 'published'
  ) THEN
    v_post_status := 'published';
  ELSIF EXISTS (
    SELECT 1 FROM public.social_publish_jobs
    WHERE post_id = v_job.post_id AND status = 'cancelled'
  ) THEN
    v_post_status := 'cancelled';
  ELSE
    v_post_status := 'draft';
  END IF;

  SELECT MAX(published_at) INTO v_post_published_at
  FROM public.social_publish_jobs
  WHERE post_id = v_job.post_id AND status = 'published';

  UPDATE public.social_posts
  SET status = v_post_status,
      published_at = CASE WHEN v_post_status = 'published' THEN v_post_published_at ELSE NULL END,
      error_summary = CASE
        WHEN v_post_status = 'failed' THEN NULLIF(left(COALESCE(p_error_summary, p_error_code, 'SOCIAL_PUBLISH_FAILED'), 1000), '')
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE id = v_job.post_id
    AND user_id = v_job.user_id;

  RETURN jsonb_build_object(
    'jobId', p_job_id,
    'jobResult', v_effective_result,
    'postId', v_job.post_id,
    'postStatus', v_post_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_social_publish_job_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_social_publish_job_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMIT;
