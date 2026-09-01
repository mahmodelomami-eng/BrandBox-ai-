# AI Development Team v1

## Purpose
This document defines the operating model for autonomous engineering work on Brand Box AI. `AGENTS.md` is the binding repository contract; this file explains how work should flow.

## Operating model

### 1. Intake
Work starts from a GitHub issue with:
- business outcome;
- acceptance criteria;
- risk level;
- protected systems touched;
- relevant tests;
- external dependencies or credentials.

### 2. Planning
The AI Tech Lead decomposes large issues into independently shippable slices. Prefer one PR per coherent outcome. Avoid multi-week mega-branches.

### 3. Implementation
The appropriate specialist implements the slice on a dedicated branch. Agents should prefer existing abstractions, tests, domain services, and server-authoritative patterns over parallel implementations.

### 4. Verification
The implementer runs focused tests, lint, the main production-hardening test suite, and a production build. Database work is verified against staging before production consideration.

### 5. Independent review
A reviewer role checks:
- correctness and scope;
- regression risk;
- auth/RBAC/RLS;
- payments, credits and idempotency;
- secrets/client exposure;
- Arabic RTL/mobile behavior;
- migration safety;
- rollback feasibility.

### 6. CI gate
A PR is not mergeable while required checks are failing. CI failures are work items for the agent that owns the branch.

### 7. Merge and deploy
Routine code may flow through the normal GitHub/Vercel path after checks pass. Destructive production database operations, external provider activation, financial commitments, or secret changes remain protected operations.

### 8. Maintenance loop
After merge, failures or regressions should become issues with reproduction details. The next agent picks the highest-priority unblocked issue and repeats the loop.

## Priority framework
P0 — security incident, data loss, payment/credit integrity, production outage.
P1 — launch blocker, broken core workflow, authentication/checkout/generation failure.
P2 — important product capability, reliability, admin operations, major UX defect.
P3 — polish, refactor, documentation, low-impact optimization.

## Risk classes
LOW: isolated UI/docs/tests with no security/payment/database authority.
MEDIUM: backend/API/domain changes, non-destructive migrations, provider adapters, admin features.
HIGH: auth/RLS/RBAC, payments, credits, encryption, fulfillment, secrets, production migrations.
PROTECTED: destructive production changes, provider production activation, financial commitment, DNS/domain ownership, irreversible external actions.

## Branch convention
- `feat/<scope>`
- `fix/<scope>`
- `test/<scope>`
- `chore/<scope>`
- `security/<scope>`

## Required PR evidence
Every autonomous PR should include:
- problem and smallest shippable slice;
- files/systems touched;
- tests run and results;
- security/RLS/payment impact where relevant;
- migration and rollback notes where relevant;
- screenshots or manual UX verification when UI changes;
- unresolved external gates.

## Current Brand Box protected boundaries
- Supabase production data and service-role credentials.
- Ezone Pay production activation and payment secrets.
- `STORE_CODE_ENCRYPTION_KEY` and encrypted inventory operations.
- third-party supplier/reseller production credentials and contractual authorization.
- domain/DNS ownership and irreversible Vercel production settings.

## Autonomous completion rule
Do not stop for routine confirmation. Continue through implementation, tests, repair, review and PR preparation. Escalate only when the next required step crosses a protected boundary or needs information/authorization that cannot be derived safely from the repository or staging environment.
