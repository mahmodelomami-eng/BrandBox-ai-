# Pricing & Social Onboarding

- `/pricing` now renders the live Brand Box plan catalog in Arabic.
- The global `الأسعار` navigation continues to route to `/pricing`.
- The authenticated workspace sidebar gains a `الباقات` entry that opens `/pricing`.
- Subscription selection is authentication-gated; guests receive an inline sign-in/sign-up modal.
- Email/Gmail password auth remains supported, with Google and Apple OAuth entry points added.
- New social users are asked for a required phone number and an optional WhatsApp number before continuing.
- Contact onboarding is persisted through a server-authenticated endpoint; the client never supplies a target user ID.
- OAuth providers still require provider credentials and redirect allow-list configuration in Supabase before the external provider flow can complete.
