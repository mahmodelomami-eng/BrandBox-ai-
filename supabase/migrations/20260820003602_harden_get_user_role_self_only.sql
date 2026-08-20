CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_role public.app_role;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RETURN 'USER'::public.app_role;
    END IF;
    IF p_user_id IS DISTINCT FROM v_actor_id THEN
        RETURN 'USER'::public.app_role;
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = v_actor_id;
    RETURN COALESCE(v_role, 'USER'::public.app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, service_role;
