export const ACTIVE_PROFILE_STATUS = 'active' as const;

export function isActiveProfileStatus(status: unknown): status is typeof ACTIVE_PROFILE_STATUS {
  return status === ACTIVE_PROFILE_STATUS;
}
