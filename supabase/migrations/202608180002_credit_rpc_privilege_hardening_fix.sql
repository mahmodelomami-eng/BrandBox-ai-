-- Phase 10.1: Credit RPC privilege hardening
-- Restrict sensitive credit mutation functions to service_role.

REVOKE EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, text, text, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.deduct_credits_idempotent(uuid, integer, text, text, text, text, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.grant_credits_atomic(uuid, integer, text, text, text, uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.refund_credits_idempotent(uuid, integer, text, text, text, text, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, text, text, uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.deduct_credits_idempotent(uuid, integer, text, text, text, text, uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.grant_credits_atomic(uuid, integer, text, text, text, uuid, text)
TO service_role;

GRANT EXECUTE ON FUNCTION public.refund_credits_idempotent(uuid, integer, text, text, text, text, uuid)
TO service_role;
