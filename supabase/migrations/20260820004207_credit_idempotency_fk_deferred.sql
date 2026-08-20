BEGIN;
ALTER TABLE public.credit_idempotency
  ALTER CONSTRAINT credit_idempotency_transaction_id_fkey
  DEFERRABLE INITIALLY DEFERRED;
COMMIT;
