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

assert.ok(operations.includes('/api/v1/admin/store/operations'));
assert.ok(inventory.includes('/api/v1/admin/store/inventory'));
assert.ok(readiness.includes('/api/v1/admin/store/readiness'));

console.log('Admin Store operations semantic theme guard passed.');
