import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const accountPage = readFileSync(join(root, 'src/app/dashboard/account/page.jsx'), 'utf8');
const accountSettings = readFileSync(join(root, 'src/components/AccountSettings.jsx'), 'utf8');
const pricing = readFileSync(join(root, 'src/app/pricing/page.jsx'), 'utf8');
const paymentResult = readFileSync(join(root, 'src/app/payment/result/page.jsx'), 'utf8');

for (const [name, source] of [
  ['dashboard account', accountPage],
  ['account settings', accountSettings],
  ['pricing', pricing],
  ['payment result', paymentResult],
] as const) {
  assert.ok(source.includes('bb-'), `${name} must consume semantic Brand Box theme primitives`);
  assert.ok(!source.includes('bg-[#'), `${name} must not use raw dark hex backgrounds`);
  assert.ok(!source.includes('text-gray-'), `${name} must not use legacy gray text classes`);
  assert.ok(!source.includes('border-white/'), `${name} must not use dark-only translucent white borders`);
}

// Profile updates must remain constrained to the hardened RPC.
assert.ok(accountPage.includes("supabase.rpc('update_own_profile'"));
assert.ok(accountSettings.includes("supabase.rpc('update_own_profile'"));
assert.ok(!accountPage.includes(".from('profiles').update("));
assert.ok(!accountSettings.includes(".from('profiles').update("));

// Plan and credit package values remain server/catalog-authoritative.
assert.ok(pricing.includes("fetch('/api/v1/plans'"));
assert.ok(pricing.includes("fetch('/api/v1/credit-packages'"));
assert.ok(pricing.includes("fetch('/api/v1/ezonepay/payment-links'"));
assert.ok(pricing.includes("body: JSON.stringify({ itemType, itemId })"));
assert.ok(!pricing.includes('priceLYD:'));

// Payment completion continues to be read from the server-side status endpoint.
assert.ok(paymentResult.includes("fetch('/api/v1/ezonepay/status?order='"));
assert.ok(paymentResult.includes("cache: 'no-store'"));
assert.ok(paymentResult.includes('لا يتم إضافة النقاط أو تفعيل الاشتراك إلا بعد تأكيد الدفع من الخادم'));
assert.ok(paymentResult.includes('التحقق والتنفيذ يتمان Server-side فقط'));

console.log('Account/pricing semantic theme and billing authority guard passed.');
