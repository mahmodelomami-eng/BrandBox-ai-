-- Phase 11: Rate Limit Table Hardening

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limit_hits FROM anon;
REVOKE ALL ON TABLE public.rate_limit_hits FROM authenticated;

GRANT ALL ON TABLE public.rate_limit_hits TO service_role;
