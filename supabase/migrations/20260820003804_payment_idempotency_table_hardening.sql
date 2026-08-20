BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.payment_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_idempotency TO service_role;

COMMIT;
