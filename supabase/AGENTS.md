# Supabase / Database — Specialist Contract

Inherits root `AGENTS.md`. Applies to `supabase/**`.

## Ownership
Use the Backend & Supabase specialist with QA/Security review for tenant, auth, credit, payment, Store, support or admin data boundaries.

## Migration policy
- Migrations are additive/backward-compatible by default.
- Use deterministic versioned migrations; never edit already-applied history merely to make local state look clean.
- Every schema change states impact, rollback strategy, RLS impact and staging verification.
- Destructive production SQL is owner-gated. No autonomous DROP/TRUNCATE/mass mutation/RLS disable.
- Prefer constraints/indexes that enforce invariants close to the data.

## RLS checklist
For every user-facing table verify:
1. RLS is enabled.
2. SELECT scope is tenant/owner-correct.
3. INSERT cannot spoof another user/tenant.
4. UPDATE cannot change protected ownership/authority fields.
5. DELETE is intentionally allowed or denied.
6. service-role-only/internal tables are not accidentally exposed to anon/authenticated.
7. privileged RPCs have explicit grants/revokes and validate caller authority.

## Credits/payments
Do not rewrite ledger/payment history. Preserve atomic/idempotent credit RPCs, payment verification and replay protections. Client-visible state is not settlement authority.

## Performance
Review indexes for new foreign keys/filter paths and avoid unbounded queries in launch-critical tables. Performance improvements must not widen data visibility.

## Verification
Apply new migrations to staging first when connected staging execution is required, run focused RLS/integration checks, verify no residual test data, then run the active repository gate. Never infer production migration success from local SQL text alone.
