# Supabase Security Runbook

## Authority model
Supabase RLS is defense in depth, not a substitute for explicit server authorization on privileged flows. Browser clients must never receive service-role credentials.

## New/changed table checklist
- primary key and ownership/tenant key are explicit;
- foreign keys encode valid relationships;
- RLS enabled for user-facing data;
- SELECT/INSERT/UPDATE/DELETE policies considered separately;
- authenticated users cannot spoof owner/tenant IDs;
- protected authority fields are not browser-writable;
- internal/service-only tables have no accidental anon/authenticated grants;
- indexes support ownership/filter foreign keys used in launch paths.

## RPC/function checklist
- determine invoker vs definer semantics intentionally;
- validate caller/ownership inside privileged functions;
- explicit EXECUTE grants/revokes;
- idempotency key/atomicity for credits/payments/fulfillment where applicable;
- no hidden bypass of ledger/history.

## Migration workflow
1. inspect latest migration history and related schema;
2. write additive/reversible migration;
3. state rollback and RLS impact;
4. add regression/integration test;
5. apply to connected staging when execution is required;
6. verify policies/grants/data integrity and no residual test data;
7. never claim production migration based only on staging success.

## Sensitive domains
Payments, credit ledger, admin roles, digital inventory, support attachments and provider tokens require QA/Security review.
