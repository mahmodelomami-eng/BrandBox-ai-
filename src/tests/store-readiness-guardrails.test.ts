import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const operationsApi = readFileSync(join(root, 'src/app/api/v1/admin/store/operations/route.ts'), 'utf8');
const operationsUi = readFileSync(join(root, 'src/components/AdminStoreOperationsPanel.jsx'), 'utf8');
const checkoutApi = readFileSync(join(root, 'src/app/api/v1/store/checkout/route.ts'), 'utf8');

for (const check of [
  'supplierAuthorized',
  'regionVerified',
  'fulfillmentVerified',
  'providerActive',
  'activeSku',
  'providerMapping',
  'sellableMode',
]) {
  assert.ok(operationsApi.includes(check));
}
assert.ok(operationsApi.includes('Object.values(checks).every(Boolean)'));
assert.ok(operationsUi.includes('جاهزية الكتالوج للبيع'));
assert.ok(operationsUi.includes('منتجات جاهزة'));

assert.ok(checkoutApi.includes("getRequestCorrelationId(request.headers)"));
assert.ok(checkoutApi.includes("emitServerError('store checkout failed', error, {"));
assert.ok(checkoutApi.includes("route: '/api/v1/store/checkout'"));
assert.ok(checkoutApi.includes("headers: { 'x-request-id': correlationId }"));
assert.ok(!checkoutApi.includes('emitServerError(\'store checkout failed\', error, body'));
assert.ok(!checkoutApi.includes('providerResponse:'));
assert.ok(!checkoutApi.includes('paymentSignature:'));

console.log('Store readiness guardrail tests passed.');
