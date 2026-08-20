BEGIN;

-- Phase A/B: Profile privilege hardening.
--
-- public.profiles mixes user-editable identity fields with privileged account
-- state. RLS policies are row-level controls; they do not restrict which
-- columns an authenticated user may change. Remove browser-role table writes
-- and expose one deliberately narrow RPC for self-service profile edits.
--
-- The auth.users -> public.profiles bootstrap trigger remains compatible:
-- handle_new_auth_user is SECURITY DEFINER and runs as its function owner,
-- not as the browser's anon/authenticated database role.

-- Browser clients must never create, delete, or directly mutate profile rows.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- This policy was intended to protect non-role fields, but RLS is row-based
-- and therefore allowed users to update privileged columns on their own row.
DROP POLICY IF EXISTS "Users can update own non-role fields" ON public.profiles;

-- Defense in depth: reject privileged column changes made in a request that
-- carries an authenticated user JWT. The safe self-service function below
-- marks its own transaction-local update so it may set updated_at internally.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_privileged_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server/service workflows and the auth bootstrap trigger do not carry a
  -- browser user identity. Their authorization remains outside Phase A/B.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- update_own_profile() is the only browser-callable path allowed to set
  -- updated_at, and it can modify only the four safe profile fields.
  IF current_setting('app.profile_safe_update', true) = 'on'
    AND OLD.id IS NOT DISTINCT FROM NEW.id
    AND OLD.email IS NOT DISTINCT FROM NEW.email
    AND OLD.role IS NOT DISTINCT FROM NEW.role
    AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.credit_balance IS NOT DISTINCT FROM NEW.credit_balance
    AND OLD.created_at IS NOT DISTINCT FROM NEW.created_at THEN
    RETURN NEW;
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id
    OR OLD.email IS DISTINCT FROM NEW.email
    OR OLD.role IS DISTINCT FROM NEW.role
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.credit_balance IS DISTINCT FROM NEW.credit_balance
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
    OR OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN
    RAISE EXCEPTION 'FORBIDDEN: privileged profile fields cannot be changed by an authenticated client.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_privileged_change ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_privileged_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_privileged_change();

-- Narrow authenticated self-service profile editing. This function does not
-- accept IDs or privileged account fields, always targets auth.uid(), and
-- maintains updated_at on behalf of the caller.
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_avatar_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: authentication is required to update a profile.'
      USING ERRCODE = '42501';
  END IF;

  -- This setting is transaction-local and is consumed by the defense-in-depth
  -- trigger above; direct browser UPDATE requests cannot set it through this
  -- RPC's public interface.
  PERFORM set_config('app.profile_safe_update', 'on', true);

  UPDATE public.profiles
  SET first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone,
      avatar_url = p_avatar_url,
      updated_at = NOW()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: authenticated user profile does not exist.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Functions are executable by PUBLIC by default in PostgreSQL. Make this
-- explicit so only authenticated users may call the safe self-service RPC.
REVOKE ALL ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Payment fulfillment is a privileged server workflow. The function predates
-- explicit function privilege hardening, so prevent browser roles from
-- invoking it directly while preserving service-role fulfillment capability.
REVOKE ALL ON FUNCTION public.fulfill_ezonepay_payment_atomic(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ezonepay_payment_atomic(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT)
  TO service_role;

COMMIT;
