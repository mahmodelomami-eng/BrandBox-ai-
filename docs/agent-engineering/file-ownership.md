# Parallel File Ownership

Use this protocol before more than one coding agent works on the same issue/initiative.

## Rule
One coding owner per file at a time. Overlapping edits are serialized or split by refactoring boundaries before parallel work starts.

## Ownership record template
Copy into the issue/PR planning comment:

| Slice | Specialist | Owned paths/files | Depends on | Integration order |
| --- | --- | --- | --- | --- |
| UI | Web Frontend | `src/components/...` | API contract | 2 |
| API | Backend & Supabase | `src/app/api/...` | none | 1 |
| DB | Backend & Supabase | `supabase/migrations/...` | schema plan | 1 |
| Mobile | Mobile Expo | `apps/mobile/...` | API contract | 2 |
| QA | QA & Security | new focused tests only | behavior contract | parallel |

## Default domain map
- Web UI: `src/components/**`, public/user/admin page composition.
- Server API: `src/app/api/**`.
- Shared domain: `src/lib/**` according to subsystem owner.
- Database: `supabase/**`.
- Mobile client: `apps/mobile/**`.
- QA/regression: `src/tests/**`; coordinate if implementation also edits the same test.
- CI/release: `.github/workflows/**` and agent profiles; DevOps/Release owner.

## Integration rules
1. Merge lowest-level contract changes first (DB/domain/API before consuming UI when required).
2. Rebase/update dependent branches after upstream merge; never force a stale merge.
3. Run focused tests after each integration boundary.
4. Run required full gates on the final head.
5. If two slices discover they need the same file, stop parallel editing and assign that file to one owner.

## Conflict prevention
Prefer additive interfaces and new focused tests over simultaneous rewrites. Large shared files should be decomposed only as a dedicated safe refactor, not opportunistically inside multiple feature branches.
