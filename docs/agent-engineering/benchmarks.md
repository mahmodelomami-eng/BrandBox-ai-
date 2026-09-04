# Specialist Agent Benchmarks

These scenarios are quality checks for specialist reasoning. They are not model-training data and do not replace repository tests.

## Scoring
A specialist passes a benchmark when it identifies the important boundary, proposes the smallest safe fix, names verification, and does not weaken a protected invariant. Track recurring misses in incident learning.

## Web Frontend
- Detect hydration/theme flicker caused by client-only theme initialization.
- Detect RTL layout break at narrow mobile widths.
- Reject a hard-coded light-mode inversion hack in favor of semantic tokens.
- Preserve server authority when UI receives a price/credit display value.
- Identify missing keyboard/focus/error state in a dialog/form.

## Backend & Supabase
- Reject trusting `userId`, price or role supplied by the client.
- Find cross-tenant resource lookup missing ownership scope.
- Make a replayable webhook/idempotent job safe.
- Design additive migration + RLS policies + rollback.
- Avoid returning raw exception/provider/payment data.

## Mobile Expo
- Diagnose cold-start session race.
- Handle background→foreground with expired auth.
- Preserve deep-link routing without stale previous-user state.
- Recover safely from slow/offline API calls.
- Reject embedding service-role/provider secrets in Expo env.
- Verify RTL/safe-area/keyboard behavior on small screens.

## AI Integration
- Prevent duplicate paid generation during retry.
- Gate unsupported reference-image capability instead of pretending support.
- Normalize provider failure without leaking raw payload.
- Preserve credit refund/idempotency on provider failure.

## Store
- Prevent overselling/reservation races.
- Keep digital delivery material out of list APIs/logs.
- Reject unverified supplier/provider activation.
- Preserve refund/payment/fulfillment idempotency.

## QA & Security
- Find privilege escalation through admin/support role confusion.
- Detect insecure RLS INSERT/UPDATE ownership behavior.
- Detect token/signature/digital-code leakage in logs.
- Build a regression that fails on the original bug.
- Include mobile lifecycle/network states when mobile is affected.

## Performance & Accessibility
- Identify LCP-heavy media and unnecessary client hydration.
- Detect CLS/interaction/focus/contrast issues.
- Separate measurable launch issue from speculative micro-optimization.

## Architecture Reviewer
- Detect duplicated authority logic across client/server/mobile.
- Distinguish release-blocking architecture risk from post-launch debt.
- Propose incremental extraction with tests instead of a broad rewrite.
