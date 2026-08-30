import { readFileSync } from 'node:fs'; import { join } from 'node:path'; import assert from 'node:assert/strict';
const root=process.cwd(), api=readFileSync(join(root,'src/app/api/v1/admin/store/operations/route.ts'),'utf8'), panel=readFileSync(join(root,'src/components/AdminStoreOperationsPanel.jsx'),'utf8');
assert.ok(api.includes("body.action === 'update_provider'")); assert.ok(api.includes("body.action === 'update_provider_mapping'"));
assert.ok(api.includes('ADMIN_UPDATED_STORE_PROVIDER')); assert.ok(api.includes('ADMIN_UPDATED_STORE_PROVIDER_MAPPING'));
assert.ok(panel.includes('إدارة الموردين والربط')); assert.ok(panel.includes('مفاتيح API لا تُخزن أو تُعرض هنا')); assert.ok(panel.includes('هامش تقريبي'));
console.log('Store provider manager tests passed.');