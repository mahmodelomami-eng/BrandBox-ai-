import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const operations = readFileSync(join(root, 'src/components/AdminStoreOperationsPanel.jsx'), 'utf8');
const inventory = readFileSync(join(root, 'src/components/AdminStoreInventoryPanel.jsx'), 'utf8');
const readiness = readFileSync(join(root, 'src/components/AdminStoreLaunchReadinessPanel.jsx'), 'utf8');

for (const [name, source] of [['Store Operations', operations], ['Store Inventory', inventory], ['Store Launch Readiness', readiness]] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box primitives`);
  assert.ok(!source.includes('bg-[#0d1016]'), `${name} must not retain legacy panel background`);
  assert.ok(!source.includes('bg-[#10131a]'), `${name} must not retain legacy card background`);
  assert.ok(!source.includes('bg-[#090b10]'), `${name} must not retain legacy input background`);
  assert.ok(!source.includes('text-gray-'), `${name} must not retain legacy gray typography`);
}

assert.ok(operations.includes("fetch('/api/v1/admin/store/operations'"));
assert.ok(operations.includes("cache: 'no-store'"));
assert.ok(operations.includes("method: 'PATCH'"));
for (const action of ['update_provider', 'update_provider_mapping', 'update_product', 'update_sku', 'retry_fulfillment']) {
  assert.ok(operations.includes(`action: '${action}'`), `Store operation ${action} must remain wired`);
}
assert.ok(operations.includes("reviewRefund(refundId, action)"));
assert.ok(operations.includes("'approve_refund'"));
assert.ok(operations.includes("'reject_refund'"));
assert.ok(operations.includes('const canManage = Boolean(payload?.capabilities?.canManage)'));
assert.ok(operations.includes('<AdminStoreInventoryPanel />'));
assert.ok(operations.includes('<AdminStoreLaunchReadinessPanel />'));
assert.ok(operations.includes('sellPriceLyd: Number(sku.sell_price_lyd)'));
assert.ok(operations.includes('supplierAuthorizationVerified: product.supplier_authorization_verified'));
assert.ok(operations.includes('regionalValidityVerified: product.regional_validity_verified'));
assert.ok(operations.includes('automatedFulfillmentVerified: product.automated_fulfillment_verified'));
assert.ok(operations.includes('الموافقة هنا إدارية فقط ولا تنفذ إعادة الأموال لدى مزود الدفع تلقائيًا'));
assert.ok(operations.includes('إعادة المحاولة'));
assert.ok(operations.includes('جاهزية الكتالوج للبيع'));
assert.ok(operations.includes('حفظ بوابات المنتج'));

assert.ok(inventory.includes("fetch('/api/v1/admin/store/inventory'"));
assert.ok(inventory.includes("cache: 'no-store'"));
assert.ok(inventory.includes("method: 'POST'"));
assert.ok(inventory.includes('skuId: selectedSkuId'));
assert.ok(inventory.includes('codes,'));
assert.ok(inventory.includes('supplierBatch: supplierBatch || undefined'));
assert.ok(inventory.includes('expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null'));
assert.ok(inventory.includes('payload.capabilities?.canManage'));
assert.ok(inventory.includes('الأكواد الجديدة تُشفّر على الخادم قبل الحفظ'));
assert.ok(inventory.includes('لا يتم عرض الأكواد الخام في لوحة الإدارة بعد الاستيراد'));

assert.ok(readiness.includes("fetch('/api/v1/admin/store/readiness'"));
assert.ok(readiness.includes("cache: 'no-store'"));
assert.ok(readiness.includes("status === 'ready'"));
assert.ok(readiness.includes("status === 'ready_with_warnings'"));
assert.ok(readiness.includes("payload?.status || 'blocked'"));
assert.ok(!readiness.includes("method: 'PATCH'"));
assert.ok(!readiness.includes("method: 'POST'"));
assert.ok(!readiness.includes("method: 'DELETE'"));

console.log('Admin Store operations semantic theme and authority guard passed.');
