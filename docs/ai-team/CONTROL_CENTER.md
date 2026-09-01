# AI Team Control Center

The Admin AI Team Control Center at `/admin/ai-team` is a read-only operational monitor for the Brand Box AI engineering program.

## What it monitors
- Launch issues #85–#97 and parent program #98.
- Open pull requests and active branches.
- GitHub Actions safety and release verification runs.
- Vercel commit deployment status surfaced through GitHub commit status.
- The eight agent roles defined in `AGENTS.md`.
- A merged timeline of recent launch issues, pull requests, and workflow runs.

## Status semantics
Agent status is inferred from repository activity. It is not direct process presence. For example, the QA Agent is shown as testing while Release verification is running, the Security Reviewer follows the Safety Gate, and DevOps follows the Vercel commit status.

## Security boundary
The UI calls only `/api/v1/admin/ai-team`. The server route requires an active Brand Box account plus admin audit/settings visibility (or SUPER_ADMIN). GitHub calls are server-side and read public repository metadata only. No GitHub token or production secret is required by this first version.

## Refresh model
Normal polling happens every 60 seconds from the admin UI while GitHub responses are cached server-side for five minutes to stay below unauthenticated public API rate limits. The explicit "تحديث مباشر" action requests an uncached snapshot.

A future version may use dedicated coding-agent identities or GitHub webhooks to provide direct presence instead of inferred status.
