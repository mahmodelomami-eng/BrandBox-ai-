import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const paymentLinks = readFileSync(join(root, 'src/app/api/v1/ezonepay/payment-links/route.ts'), 'utf8');
const webhook = readFileSync(join(root, 'src/app/api/v1/ezonepay/webhook/route.ts'), 'utf8');
const statusRoute = readFileSync(join(root, 'src/app/api/v1/ezonepay/status/route.ts'), 'utf8');
const resultPage = readFileSync(join(root, 'src/app/payment/result/page.jsx'), 'utf8');
const mode = readFileSync(join(root, 'src/lib/payments/ezonepay-mode.ts'), 'utf8');
const adminApi = readFileSync(join(root, 'src/app/api/v1/admin/ezonepay/route.ts'), 'utf8');

assert.ok(paymentLinks.includes('/payment/result?order='));
assert.ok(paymentLinks.includes("mode: 'sandbox'"));
assert.ok(webhook.includes('ADMIN_UPDATED_AI_BILLING_SETTINGS') === false);
assert.ok(webhook.includes("kind: 'payment'"));
assert.ok(webhook.includes('!result.isDuplicate'));
assert.ok(statusRoute.includes("'completed'"));
assert.ok(statusRoute.includes("'failed'"));
assert.ok(statusRoute.includes("'pending'"));
assert.ok(statusRoute.includes("paid && fulfilled"));
assert.ok(statusRoute.includes("mode: 'sandbox'"));
assert.ok(resultPage.includes('Ezone Pay يعمل حاليًا في الوضع التجريبي'));
assert.ok(resultPage.includes('لا يتم إضافة النقاط أو تفعيل الاشتراك إلا بعد تأكيد الدفع من الخادم'));
assert.ok(resultPage.includes('Suspense'));
assert.ok(resultPage.includes('PaymentResultContent'));
assert.ok(mode.includes('EZONEPAY_PRODUCTION_NOT_ENABLED'));
assert.ok(mode.includes("EZONEPAY_PRODUCTION_ENABLED !== 'true'"));
assert.ok(adminApi.includes('clientReturnCanFulfill: false'));

console.log('Ezone sandbox checkout tests passed.');
