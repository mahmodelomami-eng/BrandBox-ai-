BEGIN;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_social_posts_user_client_request
  ON public.social_posts(user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

COMMIT;
