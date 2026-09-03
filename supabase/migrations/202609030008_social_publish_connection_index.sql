BEGIN;

CREATE INDEX IF NOT EXISTS idx_social_publish_jobs_connection
  ON public.social_publish_jobs(connection_id);

COMMIT;
