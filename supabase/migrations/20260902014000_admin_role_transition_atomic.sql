BEGIN;

CREATE OR REPLACE FUNCTION public.admin_change_user_role_atomic(
  p_actor_id UUID,
  p_target_user_id UUID,
  p_next_role public.app_role
)
RETURNS TABLE(
  success BOOLEAN,
  role public.app_role,
  updated_at TIMESTAMPTZ,
  changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.app_role;
  v_actor_status TEXT;
  v_current_role public.app_role;
  v_updated_at TIMESTAMPTZ;
  v_active_super_admin_count INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_target_user_id IS NULL OR p_next_role IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROLE_CHANGE_INPUT' USING ERRCODE = '22023';
  END IF;

  SELECT p.role, p.status
    INTO v_actor_role, v_actor_status
  FROM public.profiles AS p
  WHERE p.id = p_actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROLE_ACTOR_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role <> 'SUPER_ADMIN'::public.app_role OR v_actor_status <> 'active' THEN
    RAISE EXCEPTION 'ROLE_ASSIGNMENT_FORBIDDEN: active SUPER_ADMIN required' USING ERRCODE = '42501';
  END IF;

  SELECT p.role
    INTO v_current_role
  FROM public.profiles AS p
  WHERE p.id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_next_role IN ('ADMIN'::public.app_role, 'SUPPORT'::public.app_role) THEN
    RAISE EXCEPTION 'INVALID_ROLE: legacy roles cannot be newly assigned' USING ERRCODE = '22023';
  END IF;

  IF p_actor_id = p_target_user_id AND p_next_role <> 'SUPER_ADMIN'::public.app_role THEN
    RAISE EXCEPTION 'SELF_DEMOTION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_current_role = 'SUPER_ADMIN'::public.app_role AND p_next_role <> 'SUPER_ADMIN'::public.app_role THEN
    SELECT count(*)::INTEGER
      INTO v_active_super_admin_count
    FROM public.profiles AS p
    WHERE p.role = 'SUPER_ADMIN'::public.app_role
      AND p.status = 'active';

    IF v_active_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_SUPER_ADMIN_FORBIDDEN' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_current_role = p_next_role THEN
    SELECT p.updated_at
      INTO v_updated_at
    FROM public.profiles AS p
    WHERE p.id = p_target_user_id;

    RETURN QUERY SELECT TRUE, v_current_role, v_updated_at, FALSE;
    RETURN;
  END IF;

  UPDATE public.profiles AS p
  SET role = p_next_role,
      updated_at = NOW()
  WHERE p.id = p_target_user_id
  RETURNING p.updated_at INTO v_updated_at;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    resource,
    resource_id,
    before_state,
    after_state,
    metadata,
    created_at
  ) VALUES (
    p_actor_id,
    v_actor_role::TEXT,
    'ADMIN_CHANGED_ADMIN_ROLE',
    'profiles',
    p_target_user_id::TEXT,
    jsonb_build_object('role', v_current_role::TEXT),
    jsonb_build_object('role', p_next_role::TEXT),
    jsonb_build_object('source', 'admin_change_user_role_atomic'),
    NOW()
  );

  RETURN QUERY SELECT TRUE, p_next_role, v_updated_at, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_role_atomic(UUID, UUID, public.app_role)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role_atomic(UUID, UUID, public.app_role)
  TO service_role;

COMMIT;
