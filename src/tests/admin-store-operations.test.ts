import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const api = readFileSync(join(root, 'src/app/api/v1/admin/store/operations/route.ts'), 'utf8');
const panel = readFileSync(join(root, 'src/components/AdminStoreOperationsPanel.jsx'), 'utf8');
const center = readFileSync(join(root, 'src/components/AdminControlCenter.jsx'), 'utf8');

assert.ok(api.includes("action !== 'retry_fulfillment'"));
assert.ok(api.includes("const isCredit = item?.fulfillment_mode === 'BRAND_BOX_CREDITS'"));
assert.ok(api.includes("const isCodeStock = sku?.inventory_mode === 'CODE_STOCK'"));
assert.ok(api.includes("processDigitalCodeFulfillmentForOrder"));
assert.ok(api.includes('processBrandBoxCreditFulfillmentForOrder(item.order_id)'));
assert.ok(api.includes('ADMIN_RETRIED_STORE_FULFILLMENT'));
assert.ok(panel.includes('إعادة المحاولة'));
assert.ok(panel.includes('جاهزية الكتالوج للبيع'));
assert.ok(panel.includes('حفظ بوابات المنتج'));
assert.ok(center.includes("['store', 'عمليات المتجر', Boxes]"));

console.log('Admin Store operations tests passed.');
