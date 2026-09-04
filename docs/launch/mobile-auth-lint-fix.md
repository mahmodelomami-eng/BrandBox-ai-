# Mobile auth-provider lint release fix

Release blocker found while validating launch issue #93: the repository-wide lint gate failed on `apps/mobile/src/providers/auth-provider.tsx` because missing public configuration synchronously called React state setters from the effect body.

The fix derives the initial loading state from `publicConfigReady` and returns from the effect before subscribing when mobile public configuration is unavailable. Supabase session bootstrap and auth-state subscriptions remain unchanged when configuration is present.

This change does not add secrets, enable providers, activate checkout, or alter authentication authority.
