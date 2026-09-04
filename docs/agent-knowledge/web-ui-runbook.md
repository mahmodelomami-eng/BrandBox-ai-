# Web UI Runbook

## Before coding
- Find the production route/component actually rendered; do not edit legacy/root fallback code by assumption.
- Identify server/client boundary and data authority.
- Search for an existing Brand Box component/token before adding a new pattern.
- Read relevant UI regression tests.

## Theme
- Use semantic Brand Box variables/utilities (`bb-*`) for canvas, panels, cards, inputs, buttons, text and borders.
- Light mode is not a color inversion of dark mode.
- Dark overlays belong only to media readability.
- Preserve `brandbox-theme` persistence and avoid hydration flash.

## RTL/mobile
Check Arabic direction, icon/text order, truncation, long labels, small-width wrapping, fixed headers, drawers/modals and touch targets. Never assume desktop CSS will degrade correctly on mobile.

## Accessibility
Every interactive control needs semantic behavior, keyboard/focus visibility and a usable disabled/loading/error state. Target WCAG 2.2 AA contrast for meaningful text/controls.

## Performance
Prefer server rendering where appropriate, avoid unnecessary client state/effects, optimize heavy media, and do not introduce avoidable layout shifts. Treat large new dependencies as an architecture decision.

## Verification checklist
- focused screen regression;
- lint;
- dark/light desktop/mobile acceptance when theme-sensitive;
- Arabic RTL acceptance;
- loading/error/empty/disabled states;
- full active release gate before merge when required.
