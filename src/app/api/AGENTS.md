# API Routes — Specialist Contract

Inherits root `AGENTS.md`. Applies to `src/app/api/**`.

## Ownership
Use the Backend & Supabase specialist. Add QA/Security review for auth, credits, payments, webhooks, Store, social publishing, admin or tenant-sensitive routes.

## Required skills
- Next.js route handlers and server-only boundaries.
- Supabase auth/RBAC/RLS-aware access.
- schema validation and safe error contracts.
- idempotency, replay safety, request correlation and structured redacted logging.
- rate limiting/abuse resistance where relevant.
- server-authoritative pricing, credits, entitlement, payment and fulfillment.

## Rules
- Authenticate before privileged reads or writes; fail closed.
- Never trust client-supplied price, credit cost, role, payment success, entitlement or ownership.
- Never expose service-role credentials, provider secrets, raw webhook signatures, payment payloads, digital codes or refresh tokens.
- Check resource ownership/tenant scope server-side even when RLS also exists.
- Reuse established idempotency/ledger/payment verification mechanisms rather than creating parallel authority paths.
- Return stable public error codes/messages; log internal context through redacted observability.
- Webhooks and job endpoints must be replay-safe.
- Add focused regression coverage for every authorization or authority boundary changed.

## Verification
Run focused route/domain tests first, then `npm run verify:agent` when required. Database-affecting changes must also follow `supabase/AGENTS.md`.
