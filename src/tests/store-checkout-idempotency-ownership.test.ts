import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertStoreIdempotencyOwner } from '../lib/store/store-idempotency';

const root = process.cwd();
const service = readFileSync(join(root, 'src/lib/store/store-service.ts'), 'utf8');
const checkoutRoute = readFileSync(join(root, 'src/app/api/v1/store/checkout/route.ts'), 'utf8');

assert.ok(
  service.includes('assertStoreIdempotencyOwner(existing.user_id, input.userId)'),
  'the existing-order path must enforce idempotency ownership',
);
assert.doesNotThrow(() => assertStoreIdempotencyOwner('user-a', 'user-a'));
assert.throws(
  () => assertStoreIdempotencyOwner('user-a', 'user-b'),
  /STORE_IDEMPOTENCY_KEY_CONFLICT/,
);
assert.ok(
  checkoutRoute.includes("if (message.includes('STORE_IDEMPOTENCY_KEY_CONFLICT')) status = 409"),
  'checkout must report the ownership collision as a conflict instead of an internal error',
);

console.log('Store checkout idempotency ownership tests passed.');
