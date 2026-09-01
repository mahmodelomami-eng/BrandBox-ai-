BEGIN;

-- Projects remain active indefinitely until the owner explicitly moves them to trash.
-- Trashed projects remain recoverable for 30 days before they become eligible for
-- a separate storage-aware permanent cleanup process.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.deleted_at IS
  'Soft-delete timestamp. NULL means the project is active and retained indefinitely.';
COMMENT ON COLUMN public.projects.purge_after IS
  'Earliest date when a trashed project is eligible for permanent cleanup. Managed by trigger.';

CREATE OR REPLACE FUNCTION public.apply_project_retention_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    NEW.purge_after := NULL;
  ELSE
    NEW.purge_after := NEW.deleted_at + INTERVAL '30 days';
    NEW.is_favorite := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_retention_window ON public.projects;
CREATE TRIGGER trg_project_retention_window
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.apply_project_retention_window();

CREATE INDEX IF NOT EXISTS idx_projects_owner_active_updated
  ON public.projects(owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner_trashed
  ON public.projects(owner_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_purge_after
  ON public.projects(purge_after)
  WHERE purge_after IS NOT NULL;

-- Replace the legacy FOR ALL project policy with action-specific policies.
-- Normal authenticated users can read/create/update their own rows, which is enough
-- for soft-delete + restore. Permanent DELETE remains admin-only.
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can permanently delete projects" ON public.projects;

CREATE POLICY "Users can read own projects" ON public.projects
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = owner_id
  OR public.get_user_role((SELECT auth.uid())) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
);

CREATE POLICY "Users can create own projects" ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = owner_id
  OR public.get_user_role((SELECT auth.uid())) IN ('SUPER_ADMIN', 'ADMIN')
);

CREATE POLICY "Users can update own projects" ON public.projects
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = owner_id
  OR public.get_user_role((SELECT auth.uid())) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
)
WITH CHECK (
  (SELECT auth.uid()) = owner_id
  OR public.get_user_role((SELECT auth.uid())) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
);

CREATE POLICY "Admins can permanently delete projects" ON public.projects
FOR DELETE
TO authenticated
USING (
  public.get_user_role((SELECT auth.uid())) IN ('SUPER_ADMIN', 'ADMIN')
);

COMMIT;
