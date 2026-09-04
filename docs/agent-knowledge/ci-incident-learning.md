# CI / Incident Learning

Use this template for meaningful recurring CI failures, staging failures or production-like defects. The purpose is prevention, not blame or verbose reporting.

## Incident record
- Date / issue / PR:
- Symptom:
- User/release impact:
- Root cause:
- Why existing checks missed it:
- Minimal fix:
- Regression test/guard added:
- Runbook/local contract updated:
- Follow-up debt (if any):

## Classification
Tag mentally as one or more: auth/session, RLS/tenant, payment/credit, provider/API, mobile lifecycle, navigation/hydration, theme/RTL, performance/accessibility, CI/build/environment, Store/fulfillment.

## Learning rule
A repeated failure should change the system. Choose at least one durable prevention mechanism:
1. focused regression test;
2. static guard;
3. local `AGENTS.md` rule;
4. runbook step;
5. benchmark scenario;
6. CI validation.

Do not solve flaky CI by weakening assertions, skipping safety gates or hiding errors. Distinguish external/transient failures (for example provider/rate-limit outages) from deterministic code defects, and retry only when evidence supports a transient cause.
