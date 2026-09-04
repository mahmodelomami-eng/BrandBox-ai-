# Web Components — Specialist Contract

Inherits root `AGENTS.md`. Applies to `src/components/**`.

## Ownership
Use the Web Frontend specialist for React/Next UI, and involve Performance/Accessibility for user-visible or performance-sensitive changes.

## Required skills
- React 19 and Next.js App Router client/server boundaries.
- Arabic RTL and responsive layouts.
- Brand Box semantic theme tokens; light mode is intentionally designed.
- WCAG 2.2 AA, keyboard/focus, touch targets, loading/error/empty states.
- hydration stability and state persistence.
- image/media performance and Core Web Vitals awareness.

## Rules
- Do not move prices, credits, roles, entitlement, payment status or other authority into components.
- Do not fetch privileged service-role data in client components.
- Prefer semantic `bb-*` tokens/utilities over hard-coded theme chrome.
- No global inversion/filter hacks, broad class translation bridges, or new `!important` architecture.
- Preserve Arabic RTL and English LTR where applicable.
- Avoid one-off duplicate components when an existing Brand Box primitive can be extended safely.
- Media-specific dark overlays are allowed only for media readability, not as a substitute for theme design.

## Verification
Run the nearest focused UI regression first, then repository verification required by the active release policy. For visual changes document desktop/mobile + dark/light acceptance. Performance-sensitive changes should be reviewed by the Performance/Accessibility specialist.
