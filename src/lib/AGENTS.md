# Domain Libraries — Specialist Contract

Inherits root `AGENTS.md`. Applies to `src/lib/**`.

## Ownership
Domain owner depends on the touched subsystem: Backend & Supabase for general services, AI Integration for generation/provider adapters, Store specialist for commerce, Security for auth/crypto boundaries.

## Rules
- Keep business authority server-side and reusable; route handlers should orchestrate rather than duplicate domain rules.
- Provider adapters must isolate failures, normalize public errors and avoid leaking raw provider payloads.
- Credits/payments/fulfillment must reuse existing atomic/idempotent mechanisms.
- Secrets and service-role clients remain server-only.
- Tenant/resource ownership assumptions must be explicit and tested.
- Structured logs must use redaction; never log prompts/results by default, auth tokens, provider keys, raw signatures, digital codes or customer-sensitive payloads.
- Prefer small typed functions with clear contracts over cross-cutting hidden side effects.
- When changing a shared service, search for every caller and add regression coverage for behavior relied upon by web, admin and mobile.

## Performance and resilience
Bound retries, prevent accidental retry storms, keep external calls timeout-aware where supported, and preserve idempotency across retryable operations.

## Verification
Run subsystem-focused tests first, then the active repository gate. If a shared library affects mobile APIs, ensure `mobile-ci` remains green.
