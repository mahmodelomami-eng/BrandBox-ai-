BEGIN;
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT 'USER' NOT NULL,
ADD COLUMN IF NOT EXISTS before_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS after_state JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_id, created_at DESC);
COMMIT;
