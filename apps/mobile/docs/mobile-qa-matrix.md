# Mobile QA Matrix

Use the applicable rows for every mobile PR. Release-facing changes should cover the full critical matrix.

| Area | Minimum checks |
| --- | --- |
| Startup | cold start signed out; cold start signed in; invalid persisted session; no startup crash |
| Auth | login failure/success; logout; switch user; expired session; 401/403 handling |
| Lifecycle | background→foreground; stale data/session revalidation; interrupted mutation recovery |
| Network | offline; slow response; timeout/failure; retry without duplicate mutation |
| Navigation | back behavior; deep links; refresh/restart route restoration; protected-route gating |
| RTL/LTR | Arabic RTL primary; English LTR usable; icon/order/alignment; long text |
| Device layout | small phone; safe areas/notches; keyboard open; rotation only where supported; touch targets |
| Accessibility | labels/roles; focus/readability; contrast; disabled/loading/error feedback |
| AI flows | generation loading/failure/retry; no duplicate paid generation; credit display refresh |
| Social | provider unavailable/configured states; OAuth callback; permission/publish status; token secrecy |
| Trends | live/delayed/preview label integrity; no sample data presented as live |
| Commerce | authorized products only; server price; delivery secrecy; native purchase compliance gate |
| EAS | dependency health; typecheck; mobile guards; preview build/start evidence when release-related |

## Required automated baseline
- `npm run typecheck` inside `apps/mobile`.
- relevant `src/tests/mobile-*.guard.cjs` guards.
- green `.github/workflows/mobile-ci.yml`.

Automated checks do not replace device/lifecycle acceptance for release-critical UI/auth/navigation changes.
