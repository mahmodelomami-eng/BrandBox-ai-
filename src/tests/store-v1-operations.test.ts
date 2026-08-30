import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const service = readFileSync(join(root, 'src/lib/store/store-service.ts'), 'utf8');
const fulfillment = readFileSync(join(root, 'src/lib/store/store-credit-fulfillment.ts'), 'utf8');
const webhook = readFileSync(join(root, 'src/lib/store/store-ezonepay.ts'), 'utf8');
const migration = readFileSync(join(root, 'supabase/migrations/20260830223410_store_brand_box_credit_launch_slice.sql'), 'utf8');

assert.ok(service.includes('processBrandBoxCreditFulfillmentForOrder(orderId)'));
assert.ok(fulfillment.includes("p_tx_type: 'purchase'"));
assert.ok(fulfillment.includes('store-credits:${item.id}'));
assert.ok(fulfillment.includes("status: 'SUCCEEDED'"));
assert.ok(fulfillment.includes("entitlement_type: 'CREDITS'"));
assert.ok(fulfillment.includes("status: 'FULFILLED'"));
assert.ok(webhook.includes("title: fulfilledOrder?.status === 'FULFILLED' ? 'اكتملت عملية الشراء'"));
assert.ok(webhook.includes("action_url: `/store/purchases?order=${encodeURIComponent(order.id)}`"));
assert.ok(migration.includes("'BRAND_BOX_CREDITS'"));
assert.ok(migration.includes("'ACTIVE_FOR_SALE'"));
assert.ok(migration.includes("'brand_box_credits'"));
assert.ok(migration.includes("'first_party', true"));

console.log('Store v1 first-party credit fulfillment tests passed.');
