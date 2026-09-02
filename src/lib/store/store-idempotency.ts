export function assertStoreIdempotencyOwner(existingUserId: string, requestedUserId: string) {
  if (existingUserId !== requestedUserId) {
    throw new Error('STORE_IDEMPOTENCY_KEY_CONFLICT');
  }
}
