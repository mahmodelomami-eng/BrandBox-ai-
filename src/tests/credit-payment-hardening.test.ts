import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { CreditEngine } from '../lib/credits/credit-engine';
import { EzonePayFulfillmentService } from '../lib/payments/ezonepay-fulfillment';
import { createEzonePayOrderReference } from '../lib/payments/ezonepay-order-reference';

function signedPayload(overrides: Record<string, unknown> = {}) {
  const secret = 'focused-test-secret';
  process.env.EZONEPAY_ORDER_SIGNING_SECRET = 'focused-order-signing-secret';
  const payload = {
    event: 2, transactionId: 101, transactionType: 'online',
    orderReference: createEzonePayOrderReference({ userId: '00000000-0000-4000-8000-000000000001', itemType: 'purchase', itemId: 'pkg_100' }),
    ...overrides
  };
  const raw = JSON.stringify(payload);
  return { raw, secret, signature: crypto.createHmac('sha256', secret).update(raw).digest('base64') };
}

async function run() {
  const bonusMigration = fs.readFileSync('supabase/migrations/20260820141024_credit_packages_admin_and_expiring_bonus.sql', 'utf8');
  assert.match(bonusMigration, /CREATE TABLE IF NOT EXISTS public\.credit_lots/);
  const deductionHardening = fs.readFileSync('supabase/migrations/20260820231136_credit_lot_deduction_idempotency_hardening.sql', 'utf8');
  assert.match(deductionHardening, /credit_idempotency\s*\([^)]*transaction_type\)/s);
  assert.match(deductionHardening, /v_existing\.transaction_id/);
  const adminPackageRoute = fs.readFileSync('src/app/api/v1/admin/credit-packages/[id]/route.ts', 'utf8');
  assert.match(adminPackageRoute, /resource:\s*'credit_packages'/);
  assert.doesNotMatch(adminPackageRoute, /entity_id:/);

  const grantCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const seen = new Map<string, string>();
  CreditEngine.setClientFactoryForTesting(() => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      grantCalls.push({ name, args });
      const key = String(args.p_idempotency_key);
      const duplicate = seen.get(key);
      const transactionId = duplicate || `tx-${seen.size + 1}`;
      seen.set(key, transactionId);
      return { data: [{ success: true, new_balance: duplicate ? 100 : 125, message: duplicate ? 'IDEMPOTENT_DUPLICATE_SKIPPED' : 'SUCCESS', transaction_id: transactionId }], error: null };
    }
  } as any));

  for (const type of ['grant', 'purchase', 'subscription', 'admin_adjustment'] as const) {
    await CreditEngine.grantCredits('user-1', 25, type, type, `ref-${type}`, `key-${type}`, undefined, 'user-1', type);
    assert.equal(grantCalls.at(-1)?.name, 'grant_credits_idempotent');
    assert.equal(grantCalls.at(-1)?.args.p_tx_type, type);
  }
  assert.notEqual(grantCalls[1].name, 'refund_credits_idempotent', 'purchase must not be recorded as refund');
  assert.notEqual(grantCalls[2].name, 'refund_credits_idempotent', 'subscription must not be recorded as refund');
  const first = await CreditEngine.grantCredits('user-1', 25, 'duplicate', 'grant', 'dup', 'same-key');
  const duplicate = await CreditEngine.grantCredits('user-1', 25, 'duplicate', 'grant', 'dup', 'same-key');
  assert.equal(first.transactionId, duplicate.transactionId);
  assert.equal(duplicate.message, 'IDEMPOTENT_DUPLICATE_SKIPPED');

  let capturedArgs: Record<string, unknown> | undefined;
  EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({ id, orderReference: JSON.parse(signed.raw).orderReference, amount: 25, status: 2, statusName: 'Paid', paidUtc: new Date().toISOString() }));
  EzonePayFulfillmentService.setClientFactoryForTesting(() => ({ rpc: async (_name: string, args: Record<string, unknown>) => {
    capturedArgs = args;
    return { data: [{ already_processed: false, success: true, message: 'SUCCESS', credits_granted: 100, payment_id: 'pay-1', subscription_id: null, new_balance: 150 }], error: null };
  }} as any));
  let signed = signedPayload();
  let result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, 'request-1');
  assert.equal(result.success, true);
  assert.equal(capturedArgs?.p_item_id, 'pkg_100');
  assert.equal(capturedArgs?.p_currency, 'LYD');
  assert.equal(typeof capturedArgs?.p_payload_hash, 'string');

  signed = signedPayload({ transactionId: 102, orderReference: createEzonePayOrderReference({ userId: '00000000-0000-4000-8000-000000000001', itemType: 'subscription', itemId: 'pro' }) });
  EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({ id, orderReference: JSON.parse(signed.raw).orderReference, amount: 145, status: 2, statusName: 'Paid', paidUtc: new Date().toISOString() }));
  result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, 'request-2');
  assert.equal(result.success, true);
  assert.equal(capturedArgs?.p_item_id, 'pro');

  EzonePayFulfillmentService.setClientFactoryForTesting(() => ({ rpc: async () => ({ data: [{ already_processed: true, success: true, message: 'IDEMPOTENT_DUPLICATE_SKIPPED', credits_granted: 100, payment_id: 'pay-1', subscription_id: null, new_balance: 150 }], error: null }) } as any));
  signed = signedPayload();
  result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, 'request-3');
  assert.equal(result.isDuplicate, true);

  let fulfillmentCalled = false;
  EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({
    id,
    orderReference: 'bb1_different.valid-reference',
    amount: 25,
    status: 2,
    statusName: 'Paid',
    paidUtc: new Date().toISOString(),
  }));
  EzonePayFulfillmentService.setClientFactoryForTesting(() => ({
    rpc: async () => {
      fulfillmentCalled = true;
      return { data: null, error: null };
    },
  } as any));
  result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, 'request-reference-mismatch');
  assert.equal(result.success, false);
  assert.equal(result.message, 'PROVIDER_TRANSACTION_REFERENCE_MISMATCH');
  assert.equal(fulfillmentCalled, false, 'a mismatched provider transaction must never reach database fulfillment');

  result = await EzonePayFulfillmentService.processWebhook(signed.raw, 'bad-signature', signed.secret, 'request-4');
  assert.equal(result.errorCode, 'UNAUTHORIZED_SIGNATURE');

  for (const message of ['PAYMENT_AMOUNT_MISMATCH', 'INVALID_OR_INACTIVE_ITEM']) {
    EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({ id, orderReference: JSON.parse(signed.raw).orderReference, amount: 25, status: 2, statusName: 'Paid', paidUtc: new Date().toISOString() }));
    EzonePayFulfillmentService.setClientFactoryForTesting(() => ({ rpc: async () => ({ data: null, error: { message } }) } as any));
    result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, `request-${message}`);
    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'DATABASE_FULFILLMENT_FAILED');
  }

  EzonePayFulfillmentService.setClientFactoryForTesting(() => { throw new Error('database offline'); });
  result = await EzonePayFulfillmentService.processWebhook(signed.raw, signed.signature, signed.secret, 'request-db-down');
  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'DATABASE_FULFILLMENT_FAILED');
  CreditEngine.setClientFactoryForTesting(() => { throw new Error('database offline'); });
  const unavailableGrant = await CreditEngine.grantCredits('user-1', 25, 'offline', 'grant', 'offline', 'offline-key');
  assert.equal(unavailableGrant.success, false);
  await assert.rejects(() => CreditEngine.getBalance('user-1'), /database offline/);

  CreditEngine.resetClientFactoryForTesting();
  EzonePayFulfillmentService.resetClientFactoryForTesting();
  console.log('Focused credit and Ezone Pay hardening tests passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
