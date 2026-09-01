# Project retention policy

- Active user projects are retained indefinitely while the account/project remains active.
- User-initiated deletion is a soft delete into the project trash.
- Trashed projects are recoverable for 30 days.
- `purge_after` marks when a trashed project becomes eligible for permanent cleanup.
- Permanent cleanup is intentionally separate from the user delete path so storage objects can be removed safely before database rows.
- Normal authenticated users cannot hard-delete project rows; permanent database deletion is reserved for privileged cleanup/admin paths.
- Trashed projects are excluded from normal project workspaces and generation/tool-item access.
- Project workspace ownership/tool-route guards are already part of the `main` baseline; trash/restore behavior must preserve those guards rather than bypass them.
- Temporary generation/storage retention and plan storage quotas are separate concerns and are not changed by this policy.
