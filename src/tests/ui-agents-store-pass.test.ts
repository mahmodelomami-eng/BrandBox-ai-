import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const storePage = readFileSync(join(root, 'src/app/store/page.tsx'), 'utf8');
const catalog = readFileSync(join(root, 'src/components/StoreCatalogClient.tsx'), 'utf8');
const purchases = readFileSync(join(root, 'src/app/store/purchases/page.jsx'), 'utf8');

for (const [name, source] of [
  ['Store landing', storePage],
  ['Store catalog', catalog],
  ['Store purchases', purchases],
] as const) {
  assert.ok(source.includes('bb-'), `${name} must use semantic Brand Box theme primitives`);
  assert.ok(!source.includes('bg-zinc-950'), `${name} must not keep the legacy dark-only page canvas`);
  assert.ok(!source.includes('text-zinc-'), `${name} must not keep legacy zinc typography`);
  assert.ok(!source.includes('border-zinc-'), `${name} must not keep legacy zinc borders`);
}

assert.ok(storePage.includes("export const dynamic = 'force-dynamic'"));
assert.ok(storePage.includes('await listStoreCatalog()'), 'Store catalog must remain server sourced');
assert.ok(storePage.includes('لا يتم تفعيل أي خدمة مدفوعة إلا بعد اعتماد قناة توريد رسمية وSKU نشط'));

// Checkout remains authenticated, server-priced and idempotent.
assert.ok(catalog.includes("fetch('/api/v1/store/checkout'"));
assert.ok(catalog.includes('Authorization: `Bearer ${token}`'));
assert.ok(catalog.includes('skuId: sku.id'));
assert.ok(catalog.includes('quantity: 1'));
assert.ok(catalog.includes('customerIdentifier: product.requires_customer_identifier'));
assert.ok(catalog.includes('idempotencyKey: `store-${sku.id}-${crypto.randomUUID()}`'));
assert.ok(catalog.includes('window.location.assign(payload.paymentUrl)'));
assert.ok(catalog.includes('السعر النهائي يُحل من قاعدة البيانات على الخادم قبل إنشاء رابط الدفع'));
assert.ok(!catalog.includes('total_lyd:'), 'browser checkout must not authoritatively submit a total');
assert.ok(!catalog.includes('sell_price_lyd:'), 'browser checkout must not authoritatively submit a SKU price');

// Purchase history, payment reconciliation, delivery and refund paths remain protected by auth/no-store reads.
assert.ok(purchases.includes("fetch('/api/v1/store/purchases'"));
assert.ok(purchases.includes("cache: 'no-store'"));
assert.ok(purchases.includes('/api/v1/store/payment-status?order='));
assert.ok(purchases.includes('/api/v1/store/delivery?entitlement='));
assert.ok(purchases.includes("fetch('/api/v1/store/refunds'"));
assert.ok(purchases.includes("method: 'POST'"));
assert.ok(purchases.includes('body: JSON.stringify({ orderId, reason })'));
assert.ok(purchases.includes("item.status === 'ACTIVE' && ['VOUCHER','CREDITS'].includes(item.entitlement_type)"));
assert.ok(purchases.includes('بيانات التسليم الحساسة تُجلب فقط عند طلبك لها'));

// Light/dark semantic chrome must cover the main Store journey.
assert.ok(storePage.includes('bb-app-canvas'));
assert.ok(storePage.includes('bb-dashboard-hero'));
assert.ok(catalog.includes('bb-card'));
assert.ok(catalog.includes('bb-input'));
assert.ok(catalog.includes('bb-button-primary'));
assert.ok(purchases.includes('bb-app-canvas'));
assert.ok(purchases.includes('bb-dashboard-hero'));
assert.ok(purchases.includes('bb-card'));
assert.ok(purchases.includes('bb-danger-surface'));

console.log('Store semantic theme and server-authority guard passed.');
