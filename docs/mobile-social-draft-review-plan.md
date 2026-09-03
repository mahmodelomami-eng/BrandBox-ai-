# Brand Box Mobile — Social Draft Review & Editing

## Goal
Complete the human-review boundary between generated/manual social drafts and scheduling.

## Rules
- Draft editing is owner-scoped and server-authoritative.
- Editable statuses: `draft`, `cancelled`, `failed` only.
- `scheduled`, `publishing`, and `published` posts cannot be edited. A scheduled post must be explicitly cancelled first.
- Editing never schedules, publishes, reconnects providers, refreshes credentials, or changes provider credentials.
- Content is required and bounded to 1–5000 characters.
- Target providers are an optional unique subset of `meta`, `tiktok`, `youtube`, `linkedin` with at most four providers.
- Project ownership remains immutable through this route.
- No provider token, ciphertext, worker secret, price, credit balance, role, owner id, or publishing flag is accepted from the client.
- Mobile UI must clearly distinguish Save Changes from Schedule/Publish.

## Release gate
Mobile typecheck, social security guards, draft-review guard, root lint/tests/store regression and production build must all pass before merge.
