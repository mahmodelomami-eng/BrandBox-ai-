## Outcome
What user/product result does this PR deliver?

## Smallest shippable slice
Describe exactly what is included and what is intentionally deferred.

## Systems changed
- [ ] Frontend / Next.js UI
- [ ] Backend / API / server actions
- [ ] Supabase schema / RLS / RPC
- [ ] Authentication / RBAC
- [ ] Credits / billing
- [ ] Payments / Ezone Pay
- [ ] AI / OpenRouter / provider integration
- [ ] Store / fulfillment / code inventory
- [ ] CI/CD / Vercel

## Verification
- [ ] Relevant focused tests pass
- [ ] `npm run lint` passes
- [ ] `npm test` passes, or narrower approved suite is documented below
- [ ] `npm run build` passes
- [ ] Arabic RTL/mobile behavior checked if user-facing

Commands/results:

```text
Add verification output or concise results here.
```

## Safety review
- [ ] No production secret or credential is added/exposed
- [ ] No destructive production data operation is included
- [ ] Server-authoritative pricing/credits/payment/fulfillment rules remain intact
- [ ] Auth/RBAC/RLS/tenant isolation impact reviewed where relevant
- [ ] Webhook/fulfillment/idempotency behavior remains replay-safe where relevant
- [ ] No third-party customer passwords are requested or stored

## Database / migration impact
State `None` if not applicable. Otherwise include staging verification, RLS impact, compatibility and rollback strategy.

## Risk and rollback
Risk level: LOW / MEDIUM / HIGH / PROTECTED

Rollback plan:

## External gates
List credentials, provider authorization, payment activation, production migration, DNS/domain, financial commitment, or other protected actions still required. Use `None` when there are none.

## Agent completion statement
- [ ] I followed `AGENTS.md`.
- [ ] I did not bypass a protected-operation gate.
- [ ] I reviewed the final diff for unrelated changes and secrets.
