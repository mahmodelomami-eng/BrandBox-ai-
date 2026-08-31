import { readFileSync } from 'node:fs'; import { join } from 'node:path'; import assert from 'node:assert/strict';
const route = readFileSync(join(process.cwd(),'src/app/api/v1/store/purchases/route.ts'),'utf8');
const delivery = readFileSync(join(process.cwd(),'src/app/api/v1/store/delivery/route.ts'),'utf8');
assert.ok(!route.includes("external_reference,delivery_payload,starts_at"));
assert.ok(!route.includes("delivery_payload,starts_at"));
assert.ok(delivery.includes(".eq('user_id',user.id)"));
assert.ok(delivery.includes("'Cache-Control':'private, no-store"));
console.log('Store purchases delivery redaction tests passed.');
