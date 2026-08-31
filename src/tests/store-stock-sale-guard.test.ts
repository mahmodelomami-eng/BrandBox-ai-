import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const service = readFileSync(join(root,'src/lib/store/store-service.ts'),'utf8');
const ui = readFileSync(join(root,'src/components/StoreCatalogClient.tsx'),'utf8');

assert.ok(service.includes("sku.inventory_mode === 'CODE_STOCK'"));
assert.ok(service.includes(".eq('status', 'AVAILABLE')"));
assert.ok(service.includes("return (availableBySku.get(sku.id) ?? 0) > 0"));
assert.ok(ui.includes('STORE_OUT_OF_STOCK'));
assert.ok(ui.includes('نفد مخزون هذه الخطة حاليًا'));

console.log('Store stock sale guard tests passed.');
