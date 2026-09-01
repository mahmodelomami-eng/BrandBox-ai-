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
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.deleted_at := NOW();
    NEW.purge_after := NEW.deleted_at + INTERVAL '30 days';
    NEW.is_favorite := FALSE;
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NULL THEN
    NEW.deleted_at := NOW();
    NEW.purge_after := NEW.deleted_at + INTERVAL '30 days';
    NEW.is_favorite := FALSE;
    RETURN NEW;
  END IF;

  NEW.deleted_at := OLD.deleted_at;
  NEW.purge_after := OLD.deleted_at + INTERVAL '30 days';
  NEW.is_favorite := FALSE;
  RETURN NEW;
END;
$$;

COMMIT;
