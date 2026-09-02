BEGIN;

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_user
  ON public.social_oauth_states(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_project
  ON public.social_posts(project_id)
  WHERE project_id IS NOT NULL;

COMMIT;
