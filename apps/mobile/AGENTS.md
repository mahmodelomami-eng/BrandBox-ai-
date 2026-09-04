# Brand Box Mobile — Specialist Agent Contract v2

This directory inherits the root `AGENTS.md` and adds mobile-specific ownership. Read the mobile runbooks under `apps/mobile/docs/` before editing release-critical behavior.

## Mission
Ship a secure, Arabic-first Brand Box mobile experience for AI creation, trend intelligence, marketing projects, connected social channels, and authorized digital subscriptions/gift cards. Printing and physical print services are out of scope.

## Specialist team
- Mobile Product/UX Lead: owns information architecture, Arabic RTL, accessibility, create-first flows, touch ergonomics and Brand Box visual consistency.
- Expo/React Native Engineer: owns Expo Router, native navigation, app lifecycle, safe areas, keyboard behavior, deep links, device performance and release builds.
- Mobile Auth & API Engineer: owns Supabase session lifecycle, SecureStore boundaries, API contracts, retries, offline/error behavior and client/server authority separation.
- AI Integration Engineer: owns chat/image/video UX on top of existing server-authoritative generation APIs and credit accounting.
- Trends Intelligence Engineer: owns live-vs-preview signal integrity, source attribution, localization, and trend-to-campaign workflows.
- Social OAuth & Publishing Engineer: owns provider adapters, OAuth/deep-link callbacks, permission minimization, scheduler/publishing status, and token security.
- Digital Commerce Engineer: owns authorized digital catalog UX, entitlements, delivery, refunds, and app-store billing compliance. No printing, credential resale, piracy, gambling, adult products, or unlicensed subscriptions.
- Backend/Database Engineer: owns additive API/database work, tenant isolation, RLS, and server-side capabilities.
- Security Reviewer: owns session storage, OAuth secrets, provider tokens, entitlement boundaries, and abuse prevention.
- Mobile QA/Release Engineer: owns iOS/Android regression, RTL, lifecycle transitions, offline/error states, accessibility, type checks, EAS readiness and store-release evidence.

## Required skill pack
Before implementation, identify which of these skills apply and read the matching runbook:
- Expo Router/navigation/deep links.
- foreground/background/resume app lifecycle.
- Supabase auth/session refresh and SecureStore.
- network resilience, timeouts, retry and stale-state recovery.
- Arabic RTL + English LTR layout.
- keyboard, safe-area, touch target and accessibility behavior.
- Expo dependency compatibility and EAS build configuration.
- native digital purchase/platform policy boundaries.

Runbooks:
- `apps/mobile/docs/mobile-architecture.md`
- `apps/mobile/docs/auth-session-runbook.md`
- `apps/mobile/docs/eas-runbook.md`
- `apps/mobile/docs/mobile-qa-matrix.md`

## Mobile execution loop
1. Read the issue, this contract, affected routes/providers/components and related API contract.
2. Define device states to support: cold start, authenticated start, background → foreground, slow network, offline, expired session and retry.
3. Keep one coherent change and avoid editing web-owned files unless the API contract truly requires it.
4. Add or extend a root mobile guard when a regression can be verified statically.
5. Run `npm run typecheck` in `apps/mobile` first.
6. Run relevant `src/tests/mobile-*.guard.cjs` guards from the repository root.
7. Ensure `mobile-ci` is green on the PR.
8. For release/build changes, verify `eas.json`, public environment expectations and preview build evidence without exposing credentials.
9. Self-review for secret exposure, client authority, deep-link abuse, stale session behavior, RTL and lifecycle failures.
10. Hand cross-cutting security changes to the QA/Security specialist before merge.

## Parallel file ownership
- `apps/mobile/src/app/**`: Expo/React Native engineer owns route/navigation implementation.
- `apps/mobile/src/components/**` and `apps/mobile/src/theme/**`: Mobile UX + Expo engineer coordinate; only one coding owner per file.
- `apps/mobile/src/providers/**`: Mobile Auth/API or relevant provider specialist owns session/provider lifecycle.
- `apps/mobile/src/lib/**`: Mobile Auth/API engineer owns client adapters and shared helpers.
- `src/app/api/v1/mobile/**`, social APIs and Supabase migrations remain backend/database-owned even when the mobile feature consumes them.

Do not let two coding agents modify the same file concurrently. Record cross-squad ownership in `docs/agent-engineering/file-ownership.md` when work spans mobile + server.

## Non-negotiable rules
- Never put service-role keys, provider client secrets, supplier credentials, payment secrets, or social refresh tokens in the app bundle.
- The mobile client may hold only publishable/public configuration and the authenticated user's Supabase session.
- Server APIs remain authoritative for credits, prices, entitlements, publishing permissions, and fulfillment.
- A social provider must render as unavailable until its server capability says it is configured; direct publishing additionally requires an explicit server-side enable flag.
- Trend data must identify whether it is live, delayed, or preview/sample. Never label preview data as a live trend.
- Digital goods checkout in native store builds must use an approved platform-compliant purchase path before release. Do not route native digital purchases through an unreviewed external checkout.
- Only authorized, region-valid digital products may be enabled. Streaming/entertainment products must be licensed. Game products exclude gambling/betting products.
- Arabic RTL and English/LTR must remain usable; Arabic is the primary launch experience.
- Never treat successful TypeScript compilation as proof of correct lifecycle/auth/network behavior.

## Definition of mobile done
A mobile task is complete only when typecheck + applicable mobile guards + `mobile-ci` pass, device-state acceptance is documented, no protected secret/authority boundary moved client-side, and release-facing changes include a rollback or recovery path.

## Release gate
Every mobile change requires `npm run typecheck` in this directory and a green `mobile-ci` workflow. Provider activation, production credentials, store listings, paid services, signing/account changes, or irreversible external actions require owner/platform authorization.
