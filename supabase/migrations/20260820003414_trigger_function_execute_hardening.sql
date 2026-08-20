begin;

-- Trigger-only SECURITY DEFINER functions must not be directly callable
-- through the exposed RPC surface by browser roles.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.prevent_audit_log_modification() from public, anon, authenticated;
revoke execute on function public.prevent_unauthorized_profile_privileged_change() from public, anon, authenticated;
revoke execute on function public.prevent_unauthorized_role_change() from public, anon, authenticated;

commit;
