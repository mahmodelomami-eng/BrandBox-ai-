BEGIN;

CREATE OR REPLACE FUNCTION public.apply_project_retention_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    NEW.purge_after := NULL;
  ELSIF TG_OP = 'INSERT' OR OLD.deleted_at IS NULL THEN
    -- The database, not the client, is authoritative for when the trash window starts.
    NEW.deleted_at := NOW();
    NEW.purge_after := NEW.deleted_at + INTERVAL '30 days';
    NEW.is_favorite := FALSE;
  ELSE
    -- A trashed project cannot extend or shorten its own recovery window through updates.
    NEW.deleted_at := OLD.deleted_at;
    NEW.purge_after := OLD.deleted_at + INTERVAL '30 days';
    NEW.is_favorite := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
