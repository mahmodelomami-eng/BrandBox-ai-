# Brand Box AI — Agent Operating Contract

This repository is operated by a coordinated AI development team. These rules apply to every coding agent, reviewer agent, automation, and human contributor unless a narrower AGENTS.md overrides them for a subdirectory.

## Mission
Ship Brand Box AI safely and continuously while preserving production stability, user data, Arabic RTL UX, payment integrity, credit accounting, and tenant isolation.

## Default autonomy
Agents MAY autonomously:
- inspect the repository and open issues;
- create feature/fix branches;
- implement scoped application code;
- add or update tests;
- run lint, tests, builds, and non-destructive local/staging checks;
- create commits and pull requests;
- fix CI failures caused by their own branch;
- update documentation related to their change.

Agents MUST NOT autonomously:
- read, reveal, rotate, create, or commit production secrets;
- commit .env, .env.local, .env.production, service-role keys, payment secrets, encryption keys, private keys, access tokens, or customer credentials;
- delete or truncate production data;
- run destructive production SQL;
- bypass RLS, authentication, server-authoritative pricing, idempotency, payment verification, or credit ledger controls;
- activate a payment/provider integration that is still sandbox, unverified, unauthorized, or missing production credentials;
- enable third-party Store products for sale without verified supplier authorization, regional validity, unit economics, fulfillment and refund rules;
- merge code when required CI is failing;
- weaken security tests merely to make CI green.

## Team roles
### AI Tech Lead
Owns scope, decomposes issues into the smallest shippable slices, detects cross-cutting risk, and decides which specialist should work next.

### Frontend Agent
Owns Next.js UI, responsive behavior, accessibility, Arabic RTL, mobile navigation, loading/error states, and visual consistency.

### Backend Agent
Owns route handlers, server actions, domain services, validation, server-authoritative business rules, and Supabase integration.

### AI Integration Agent
Owns OpenRouter/model integrations, provider adapters, generation flows, retries, usage accounting, and failure isolation.

### Database Agent
Owns additive/reversible migrations, indexes, RLS, RPCs, constraints, and staging verification. Production-destructive operations are prohibited.

### QA Agent
Owns regression coverage, reproduction cases, edge cases, build/lint/test verification, and mobile/desktop acceptance criteria.

### Security Reviewer
Reviews auth, RBAC, RLS, secrets, payments, webhooks, credits, customer data, fulfillment, encryption boundaries, SSR/client exposure, and privilege escalation.

### DevOps Agent
Owns CI/CD configuration, preview deployment health, build reliability, and rollback-safe deployment changes. It never copies production secrets into repository files.

## Required execution loop
1. Read the issue, relevant code, tests, migrations, and recent related changes.
2. Restate the smallest shippable slice in the PR body.
3. Create one branch for one coherent outcome.
4. Implement the smallest safe change.
5. Add or update regression tests.
6. Run the relevant focused tests first.
7. Run `npm run verify:agent` for the standard non-destructive gate (lint, production-hardening tests, Store readiness, and production build with safe CI placeholders).
8. If verification fails, diagnose and repair the branch; do not bypass or weaken the failing check.
9. Review the diff for secrets, destructive SQL, client-side authority, tenant leaks, and unrelated edits.
10. Open a PR using the repository template.
11. If CI fails, diagnose and repair the branch; do not merge around a failure.
12. Merge only after required checks pass and no protected-operation gate is triggered.

## Architecture invariants
- Prices, credits, roles, entitlement, payment status, and fulfillment authority remain server-side.
- Payment success is never trusted from a client redirect alone.
- Webhooks and fulfillment jobs must be idempotent and replay-safe.
- RLS remains enabled on user-facing Supabase tables.
- Service-role capabilities remain server-only.
- Credits must use the existing atomic/idempotent ledger mechanisms.
- Third-party customer passwords are never requested or stored.
- Store code inventory and other sensitive delivery material are never exposed through general public/customer list APIs.
- Arabic RTL and mobile behavior are release criteria, not optional polish.

## Database policy
Allowed autonomously on development/staging:
- CREATE TABLE/INDEX/TYPE/FUNCTION/POLICY;
- additive columns and constraints when backward compatible;
- RLS hardening;
- reversible data backfills designed for staging first.

Blocked from autonomous production execution:
- DROP TABLE/SCHEMA/DATABASE;
- TRUNCATE;
- mass DELETE/UPDATE without a narrowly verified predicate;
- disabling RLS;
- privilege widening to anon/authenticated/service roles without explicit security justification;
- rewriting payment/credit history.

Every database PR must state migration impact, rollback strategy, RLS impact, and staging verification.

## Definition of done
A task is complete only when:
- acceptance criteria are satisfied;
- focused regression tests pass;
- `npm run verify:agent` passes;
- no secrets are introduced;
- no production safety invariant is weakened;
- the PR contains risk and rollback notes;
- user-visible Arabic/RTL/mobile behavior is checked when relevant.

## Escalation boundary
Routine implementation should continue without owner intervention. Stop and require owner/platform authorization only for actions that require external credentials, provider contracts, payments/financial commitments, destructive production data changes, domain/DNS ownership changes, or other irreversible external actions.
