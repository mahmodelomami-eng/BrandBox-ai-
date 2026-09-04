# Brand Box Mobile Architecture

## Stack
Expo + Expo Router + React Native + Supabase client. The mobile app is a client of Brand Box server-authoritative APIs; it is not a second authority implementation.

## Layer ownership
- `src/app/**`: navigation/routes/screens and route-level composition.
- `src/components/**`: reusable mobile UI.
- `src/providers/**`: app/session/provider lifecycle.
- `src/lib/**`: client adapters/helpers with no server secrets.
- `src/theme/**`: Brand Box mobile visual tokens/system.
- server APIs under repository `src/app/api/**`: backend-owned contracts.

## State principles
1. Auth/session identity comes from Supabase session and server validation, never cached display data alone.
2. Navigation must derive from current route/auth state; refresh/restart must not flash another user or stale screen.
3. Network state is fallible: screens need loading, retry, empty and error states.
4. Background/foreground transitions may invalidate session or data; sensitive flows revalidate before mutation.
5. Server remains authoritative for credits, prices, entitlements, publishing and fulfillment.

## Deep links
Validate callback/route shape, restore correct auth state, avoid treating URL parameters as trusted payment/provider success, and prevent stale previous-user state from rendering during hydration.

## Security
SecureStore/session material is scoped to the authenticated user. No service-role/provider/payment secrets are bundled. Public Expo variables must be safe for anyone to inspect.

## UX
Arabic RTL is primary. Design for small screens, safe areas, virtual keyboard, touch targets and one-handed usage. Do not transplant desktop layouts mechanically.
