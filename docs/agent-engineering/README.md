# Brand Box Agent Engineering System v2

This directory defines how Brand Box turns generic coding agents into a coordinated specialist engineering team for the web platform and Expo mobile app.

## Objectives
1. Faster focused execution and shorter feedback loops.
2. Fewer branch conflicts through explicit file ownership.
3. Higher domain quality through local contracts and specialist runbooks.
4. Durable learning: recurring failures become tests/runbook rules.
5. Independent QA/security review on authority-sensitive changes.
6. Full release safety remains mandatory even when focused checks are used for speed.

## Specialist profiles
GitHub custom coding profiles live in `.github/agents/`:
- Brand Box Release Execution — release backlog coordinator/executor profile.
- Brand Box Web Frontend — Next.js/React/RTL/theme/accessibility.
- Brand Box Backend & Supabase — APIs/domain/Postgres/RLS.
- Brand Box Mobile Expo — Expo/React Native/session/lifecycle/EAS.
- Brand Box AI Integration — model/provider/generation reliability.
- Brand Box Store Operations — commerce/fulfillment/refunds/provider readiness.
- Brand Box QA & Security — independent regression/security review.
- Brand Box Performance & Accessibility — launch UX/performance/accessibility.
- Brand Box Architecture Reviewer — architecture drift and safe refactoring.

Custom profiles become selectable by GitHub Copilot coding agent when the account/repository feature is enabled. Repository workflows do not grant them secrets or protected production authority.

## Local specialization
Nearest `AGENTS.md` files override/generalize the root contract for their directory:
- `src/components/AGENTS.md`
- `src/app/api/AGENTS.md`
- `src/lib/AGENTS.md`
- `supabase/AGENTS.md`
- `apps/mobile/AGENTS.md`

## Fast execution model
Tech Lead decomposes one issue into non-overlapping slices, records ownership, and lets independent specialists work in parallel. A coding agent owns each file. QA can prepare independent tests/review in parallel. Integration happens in dependency order, not by force-merging conflicts.

Focused checks provide rapid feedback. Before merge, required repository CI/release gates remain authoritative.

## Learning loop
When a defect or CI failure recurs:
1. record the failure using `docs/agent-knowledge/ci-incident-learning.md`;
2. extract a durable rule into the relevant local contract/runbook;
3. add a regression guard when feasible;
4. update benchmark cases if the failure reflects a specialist blind spot.

## Routing
`.github/workflows/agent-specialist-router.yml` classifies PRs by changed paths and attaches specialist labels. It has no code-write or merge permission and does not replace human/agent judgment for cross-cutting risk.
