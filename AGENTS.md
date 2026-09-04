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

### UI/UX & Visual Designer Agent — Theme & Design System Expert
Owns visual hierarchy, design-system coherence, typography, iconography, spacing, component states, Arabic RTL visual quality and brand consistency. For multi-theme work this agent is the authority on semantic design tokens, light/dark parity, color/elevation systems, WCAG 2.2 AA contrast, accessible interaction states and preview-based visual acceptance.

It MUST treat light mode as an intentionally designed Brand Box expression rather than an inversion or mechanical mapping of dark-mode colors. It MUST reject broad utility-class translation hacks, CSS inversion/filter approaches and growing `!important` exception layers as the primary theme architecture. It MUST define implementation-ready semantic tokens and review every touched screen in both themes on desktop and mobile before visual approval.

### Frontend Agent
Owns Next.js UI, responsive behavior, accessibility, Arabic RTL, mobile navigation, loading/error states, and visual consistency. For theme-sensitive work it implements the semantic design system approved by the UI/UX & Visual Designer Agent, migrates touched screens away from hard-coded theme colors, preserves deterministic theme persistence, and prevents hydration/theme flicker.

### Backend Agent
Owns route handlers, server actions, domain services, validation, server-authoritative business rules, and Supabase integration.

### Store Agent
Owns the Brand Box Store catalog, checkout, order lifecycle, fulfillment, digital-code/inventory reservation, supplier readiness, refund behavior, and Store regression coverage. It must preserve server-authoritative pricing, tenant isolation, idempotency, and the rule that no third-party product becomes sellable before supplier authorization and fulfillment/refund requirements are verified.

### AI Integration Agent
Owns OpenRouter/model integrations, provider adapters, generation flows, retries, usage accounting, and failure isolation.

### Database Agent
Owns additive/reversible migrations, indexes, RLS, RPCs, constraints, and staging verification. Production-destructive operations are prohibited.

### QA Agent
Owns regression coverage, reproduction cases, edge cases, build/lint/test verification, and mobile/desktop acceptance criteria. For theme-sensitive changes, QA must validate dark and light rendered states, contrast, hover/focus/selected/disabled states, overlays, forms and responsive behavior; build success alone is not visual acceptance.

### Security Reviewer
Reviews auth, RBAC, RLS, secrets, payments, webhooks, credits, customer data, fulfillment, encryption boundaries, SSR/client exposure, and privilege escalation.

### DevOps Agent
Owns CI/CD configuration, preview deployment health, build reliability, and rollback-safe deployment changes. It never copies production secrets into repository files.

## Agent Engineering System v2
The repository uses specialist execution rather than one generic coding persona.

### Specialist selection
- Web UI work: prefer `Brand Box Web Frontend` and read `src/components/AGENTS.md`.
- API/domain work: prefer `Brand Box Backend & Supabase` and read `src/app/api/AGENTS.md` plus `src/lib/AGENTS.md`.
- Database/RLS work: use the backend/database specialist and read `supabase/AGENTS.md`.
- Mobile work: prefer `Brand Box Mobile Expo` and read `apps/mobile/AGENTS.md` plus the mobile runbooks.
- Cross-cutting validation: use `Brand Box QA & Security`.
- Performance/accessibility passes: use `Brand Box Performance & Accessibility`.
- Architecture/debt reviews: use `Brand Box Architecture Reviewer`.

### Local contracts and skill packs
Agents MUST read the nearest `AGENTS.md` before editing. Practical runbooks live under `docs/agent-knowledge/`, `docs/agent-engineering/`, and `apps/mobile/docs/`. These documents are treated as project memory: a recurring failure should become a prevention rule or regression test instead of being rediscovered.

### Parallel execution and file ownership
Before parallel work, the Tech Lead records file/domain ownership using `docs/agent-engineering/file-ownership.md`. Two coding agents must not edit the same file concurrently. Parallel branches should be independent, small, and integration-ordered. QA may prepare tests in parallel when its files do not overlap implementation files.

### Self-review loop
Every coding agent performs: implement → focused tests → self-review → security/authority diff review → PR. A different specialist reviews high-risk boundaries. Agents must not use a green build as a substitute for domain-specific verification.

### Benchmarks and learning
Role quality is evaluated against `docs/agent-engineering/benchmarks.md`. After a meaningful CI failure or production-like incident, capture cause, detection, fix, prevention, and regression coverage using `docs/agent-knowledge/ci-incident-learning.md`.

### Speed policy
Use focused/path-aware checks for fast feedback, but the repository-wide release gate remains mandatory before merge when required by the active release program. Never speed up delivery by weakening tests, skipping tenant/security checks, or splitting authority into the client.

## Theme-system policy
- New or migrated UI surfaces should consume semantic tokens instead of raw dark/light color literals whenever practical.
- Theme tokens must cover canvas, surfaces, elevation, borders, text hierarchy, brand accent, semantic status colors, controls, focus, hover, selected, pressed and disabled states.
- Light and dark themes may intentionally differ in shadow/elevation treatment and media/editor canvas behavior.
- Do not expand broad `[class~=...]` color-translation selectors or `!important` bridges as the primary long-term solution.
- Preserve no-flash initialization and stored user preference when refactoring theme architecture.
- Every theme-sensitive PR must include visual acceptance criteria for desktop and mobile in both themes and should include rendered preview evidence when available.

## Required execution loop
1. Read the issue, root contract, nearest local `AGENTS.md`, relevant runbooks, code, tests, migrations, and recent related changes.
2. Restate the smallest shippable slice in the PR body.
3. Record file ownership before parallel work and create one branch for one coherent outcome.
4. Implement the smallest safe change.
5. Add or update regression tests.
6. Run the relevant focused tests first.
7. Run `npm run verify:agent` for the standard non-destructive gate (lint, production-hardening tests, Store readiness, and production build with safe CI placeholders).
8. If verification fails, diagnose and repair the branch; do not bypass or weaken the failing check.
9. Review the diff for secrets, destructive SQL, client-side authority, tenant leaks, and unrelated edits.
10. Open a PR using the repository template and include risk/rollback notes.
11. If CI fails, diagnose and repair the branch; record repeatable failures in incident learning.
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
- `npm run verify:agent` passes when required by the active release policy;
- no secrets are introduced;
- no production safety invariant is weakened;
- the PR contains risk and rollback notes;
- user-visible Arabic/RTL/mobile behavior is checked when relevant;
- theme-sensitive changes have rendered visual acceptance in both dark and light modes, not test-only acceptance.

## Escalation boundary
Routine implementation should continue without owner intervention. Stop and require owner/platform authorization only for actions that require external credentials, provider contracts, payments/financial commitments, destructive production data changes, domain/DNS ownership changes, or other irreversible external actions.
