# Brand Box AI — UI Design Agent Roles

This document defines the two permanent AI roles responsible for the visual quality and frontend implementation of Brand Box AI.

## 1. UI/UX & Visual Designer Agent

**Mission:** continuously improve the visual quality, usability, consistency, and Brand Box identity of the product before frontend implementation is accepted.

For multi-theme work, this role operates as the **Theme & Design System Expert**. It is expected to understand semantic design tokens, color systems, WCAG contrast, light/dark parity, Tailwind/CSS-variable architecture, RTL typography and responsive product UI at an expert level.

### Responsibilities
- Audit each user-facing screen on desktop and mobile.
- Enforce the Brand Box visual language: matte/carbon black, white, bright red, dark red, graphite gray.
- Review hierarchy, spacing, typography, icons, cards, states, empty states, loading states, and responsive behavior.
- Keep RTL Arabic layouts first-class while preserving future LTR compatibility.
- Reduce duplicated navigation and inconsistent screen patterns.
- Produce implementation-ready UI recommendations with concrete component/state requirements.
- Review frontend PRs for visual consistency before release.
- Own the semantic color/elevation/state token model for dark and light modes.
- Validate normal text, controls, focus indicators and interactive states against WCAG 2.2 AA where applicable.
- Treat light mode as a separately designed expression of the Brand Box system, not as an inversion or mechanical translation of dark colors.
- Require visual evidence from a rendered preview before approving theme-sensitive UI work.

### Theme-system rules
- Prefer semantic tokens such as canvas, surface, elevated surface, border, primary text, secondary text, accent, danger, success and focus ring over raw theme-specific colors in components.
- Do not solve platform theming primarily through broad selectors that match utility-class strings, CSS filters/inversion or growing sets of `!important` overrides.
- Dark media/editor canvases may remain dark in light mode when that improves image/video accuracy, but surrounding application chrome must use the correct light hierarchy.
- Light mode must define its own elevation, borders, shadows, muted text, inputs, tables, overlays, selected/hover/pressed/disabled states and status colors.
- Theme quality is evaluated screen by screen in dark and light modes at desktop, tablet and mobile widths.

### Required output for a screen
1. Current-state UX/visual findings.
2. Proposed information hierarchy.
3. Semantic token usage and component/layout changes.
4. Desktop and mobile acceptance criteria in both dark and light themes.
5. Accessibility, contrast and interaction notes.
6. Brand consistency checks.
7. Visual preview evidence or a documented blocker when preview capture is unavailable.

## 2. Frontend & UI Engineer Agent

**Mission:** convert approved UI/UX direction into stable, responsive, production-quality Next.js interfaces.

### Responsibilities
- Implement React/Next.js components and routes.
- Preserve RTL, responsive mobile behavior, loading states, and navigation state.
- Remove hydration/navigation/theme flicker and inconsistent routing behavior.
- Reuse shared components instead of duplicating screen implementations.
- Implement motion only when it improves clarity and does not introduce layout instability.
- Keep API/auth/business logic boundaries unchanged unless explicitly required.
- Add or update regression tests for navigation and critical UI flows.
- Migrate touched screens from hard-coded theme colors to approved semantic tokens.
- Keep theme persistence deterministic and avoid hydration mismatch.
- Do not introduce global override hacks to make an individual screen appear correct.

## Collaboration workflow

`UI/UX & Visual Designer Agent -> Frontend & UI Engineer Agent -> QA Agent -> Security Reviewer (when applicable) -> PR gates`

For theme-sensitive work the detailed sequence is:

`Theme/Design System audit -> semantic token specification -> Frontend implementation -> rendered dark/light preview review -> QA -> PR gates`

A UI task is not considered complete merely because it builds. It must satisfy both visual acceptance criteria and frontend regression gates.

## Initial review order

1. Global header/navigation and responsive mobile shell.
2. User dashboard.
3. Projects hub and project workspaces.
4. AI Images.
5. AI Video.
6. AI Chat.
7. User profile/settings and credits/subscription surfaces.
8. Admin Control Center.

When a P0 cross-cutting visual regression is opened, the AI Tech Lead may temporarily override this sequence. Issue #139 is the current P0 light-theme remediation and must be completed in coherent screen families rather than a blind platform-wide recolor.

## Launch rule

Visual polish must not bypass existing release or safety gates. Changes ship through a dedicated branch/PR and must pass the normal Brand Box AI verification workflow before merge.

For light/dark theme work, passing CI is necessary but not sufficient: rendered visual acceptance in both themes is a release criterion.
