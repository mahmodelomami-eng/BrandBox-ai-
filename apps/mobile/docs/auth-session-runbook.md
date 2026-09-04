# Mobile Auth & Session Runbook

## Invariants
- Supabase session belongs to the current authenticated user only.
- SecureStore may persist session material but must never persist service-role/provider/payment secrets.
- UI profile data is not authentication authority.
- Protected API calls must tolerate token refresh/expiry and fail closed.

## State matrix
Test auth-sensitive changes across:
1. cold start signed out;
2. cold start with valid persisted session;
3. persisted expired/invalid session;
4. login success/failure;
5. logout then immediate login as a different user;
6. background long enough for session expiry, then foreground;
7. offline startup;
8. slow API after session restore;
9. deep-link entry before/after auth resolves.

## Implementation rules
- Avoid rendering protected user data before current session/profile resolution.
- Clear user-scoped cached state on logout/user switch.
- Do not call setState/equivalent lifecycle transitions in ways that create render/effect loops or stale startup races.
- Revalidate sensitive server mutations after resume when state may be stale.
- Treat 401/403 distinctly from generic network failure and avoid infinite refresh/retry loops.

## Regression evidence
When fixing an auth bug, add a mobile guard or targeted test where feasible and document which state from the matrix previously failed.
