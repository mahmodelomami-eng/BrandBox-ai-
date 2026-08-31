import { readFileSync } from 'node:fs'; import { join } from 'node:path'; import assert from 'node:assert/strict';
const sql = readFileSync(join(process.cwd(),'supabase/migrations/20260831222312_store_db_performance_hardening.sql'),'utf8');
for (const index of [
  'idx_store_products_provider_id',
  'idx_store_order_items_sku_id',
  'idx_store_fulfillment_jobs_order_item_id',
  'idx_store_fulfillment_jobs_provider_id',
  'idx_store_digital_codes_reserved_order_item_id',
  'idx_store_provider_products_sku_id',
  'idx_store_refunds_order_id',
  'idx_store_refunds_requested_by',
]) assert.ok(sql.includes(index));
assert.ok(sql.includes('(select auth.uid()) = user_id'));
assert.ok(sql.includes('o.user_id = (select auth.uid())'));
console.log('Store DB performance hardening tests passed.');
