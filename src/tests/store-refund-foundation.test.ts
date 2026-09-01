import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const service = readFileSync(join(root, 'src/lib/store/store-refund-service.ts'), 'utf8');
const api = readFileSync(join(root, 'src/app/api/v1/store/refunds/route.ts'), 'utf8');
const admin = readFileSync(join(root, 'src/app/api/v1/admin/store/operations/route.ts'), 'utf8');
const purchases = readFileSync(join(root, 'src/app/store/purchases/page.jsx'), 'utf8');

assert.ok(service.includes("payment_status !== 'PAID'"));
assert.ok(service.includes("payment_refund_executed: false"));
assert.ok(service.includes("['REQUESTED', 'REVIEWING', 'APPROVED', 'PROCESSING']"));
assert.ok(api.includes("from '@/lib/auth/user-auth'"));
assert.ok(api.includes('authenticateActiveUser(request)'));
assert.ok(api.includes('if (!auth)'));
assert.ok(api.includes('requestStoreRefund(auth.user.id'));
assert.ok(admin.includes("body.action === 'approve_refund'"));
assert.ok(admin.includes("body.action === 'reject_refund'"));
assert.ok(purchases.includes("'طلب استرداد'"));
assert.ok(!service.includes("payment_status: 'REFUNDED'"));

console.log('Store refund foundation tests passed.');
