# Brand Box Mobile — Specialist Agent Contract

This directory inherits the root AGENTS.md and adds mobile-specific ownership.

## Mission
Ship a secure, Arabic-first Brand Box mobile experience for AI creation, trend intelligence, marketing projects, connected social channels, and authorized digital subscriptions/gift cards. Printing and physical print services are out of scope.

## Specialist team
- Mobile Product/UX Lead: owns information architecture, Arabic RTL, accessibility, create-first flows, and Brand Box visual consistency.
- Expo/React Native Engineer: owns Expo Router, native navigation, device lifecycle, performance, deep links, and release builds.
- AI Integration Engineer: owns chat/image/video UX on top of existing server-authoritative generation APIs and credit accounting.
- Trends Intelligence Engineer: owns live-vs-preview signal integrity, source attribution, localization, and trend-to-campaign workflows.
- Social OAuth & Publishing Engineer: owns provider adapters, OAuth/deep-link callbacks, permission minimization, scheduler/publishing status, and token security.
- Digital Commerce Engineer: owns authorized digital catalog UX, entitlements, delivery, refunds, and app-store billing compliance. No printing, credential resale, piracy, gambling, adult products, or unlicensed subscriptions.
- Backend/Database Engineer: owns additive API/database work, tenant isolation, RLS, and server-side capabilities.
- Security Reviewer: owns session storage, OAuth secrets, provider tokens, entitlement boundaries, and abuse prevention.
- QA/Release Engineer: owns iOS/Android regression, RTL, offline/error states, accessibility, type checks, and store-release readiness.

## Non-negotiable rules
- Never put service-role keys, provider client secrets, supplier credentials, payment secrets, or social refresh tokens in the app bundle.
- The mobile client may hold only publishable/public configuration and the authenticated user's Supabase session.
- Server APIs remain authoritative for credits, prices, entitlements, publishing permissions, and fulfillment.
- A social provider must render as unavailable until its server capability says it is configured; direct publishing additionally requires an explicit server-side enable flag.
- Trend data must identify whether it is live, delayed, or preview/sample. Never label preview data as a live trend.
- Digital goods checkout in native store builds must use an approved platform-compliant purchase path before release. Do not route native digital purchases through an unreviewed external checkout.
- Only authorized, region-valid digital products may be enabled. Streaming/entertainment products must be licensed. Game products exclude gambling/betting products.
- Arabic RTL and English/LTR must remain usable; Arabic is the primary launch experience.

## Release gate
Every mobile change requires `npm run typecheck` in this directory and a green `mobile-ci` workflow. Provider activation, production credentials, store listings, paid services, or irreversible external actions require owner/platform authorization.