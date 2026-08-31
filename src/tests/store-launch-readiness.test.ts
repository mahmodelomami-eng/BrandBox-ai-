import { readFileSync } from 'node:fs'; import { join } from 'node:path'; import assert from 'node:assert/strict';
const root=process.cwd();
const api=readFileSync(join(root,'src/app/api/v1/admin/store/readiness/route.ts'),'utf8');
const ui=readFileSync(join(root,'src/components/AdminStoreLaunchReadinessPanel.jsx'),'utf8');
const ops=readFileSync(join(root,'src/components/AdminStoreOperationsPanel.jsx'),'utf8');

assert.ok(api.includes('ACTIVE_PRODUCT_GATE_INVALID'));
assert.ok(api.includes('FAILED_FULFILLMENT_JOBS'));
assert.ok(api.includes('STORE_CODE_ENCRYPTION_KEY_MISSING'));
assert.ok(api.includes('LOW_DIGITAL_STOCK'));
assert.ok(api.includes('EZONE_SANDBOX'));
assert.ok(ui.includes('جاهزية المتجر للإطلاق'));
assert.ok(ui.includes('READY WITH WARNINGS'));
assert.ok(ops.includes('<AdminStoreLaunchReadinessPanel />'));

console.log('Store launch readiness tests passed.');
