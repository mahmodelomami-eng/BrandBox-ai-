-- Phase 10.1: Credit RPC privilege hardening
-- Restrict sensitive credit mutation functions to service_role.

REVOKE EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, text, text, uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.deduct_credits_idempotent(uuid, integer, text, text, text, text, uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.grant_credits_atomic(uuid, integer, text, text, text, uuid, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.refund_credits_idempotent(uuid, integer, text, text, text, text, uuid) FROM anon, authenticated;
