import crypto from 'node:crypto';
import { createStagingTestClient } from '../../lib/supabase/test-client';
import { EzonePayFulfillmentService } from '../../lib/payments/ezonepay-fulfillment';
import { createEzonePayOrderReference } from '../../lib/payments/ezonepay-order-reference';

type TestResult = { testName: string; passed: boolean; details?: string };

function requireDedicatedTestUserId(): string {
  const userId = process.env.STAGING_TEST_USER_ID;
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('STAGING_TEST_USER_ID must identify a dedicated staging auth user.');
  }
  return userId;
}

function signedWebhook(orderReference: string, transactionId: number) {
  const secret = process.env.EZONEPAY_HMAC_SECRET || 'staging-test-hmac-secret';
  const raw = JSON.stringify({ event: 2, transactionId, transactionType: 'online', orderReference });
  return { raw, secret, signature: crypto.createHmac('sha256', secret).update(raw).digest('base64') };
}

export async function runStagingEzonePayIntegrationTests(): Promise<{
  allPassed: boolean;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const testUserId = requireDedicatedTestUserId();
  const supabase = createStagingTestClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email,credit_balance')
    .eq('id', testUserId)
    .single();
  if (profileError || !profile?.email?.includes('test.staging')) {
    throw new Error('STAGING_TEST_USER_ID must belong to a dedicated test.staging profile.');
  }

  process.env.EZONEPAY_ORDER_SIGNING_SECRET = 'staging-order-reference-test-secret';
  const initialBalance = Number(profile.credit_balance);
  const orderReference = createEzonePayOrderReference({ userId: testUserId, itemType: 'purchase', itemId: 'pkg_100' });
  const transactionId = Number(String(Date.now()).slice(-9));
  const webhook = signedWebhook(orderReference, transactionId);
  EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({
    id,
    orderReference,
    amount: 10,
    status: 2,
    statusName: 'Paid',
    paidUtc: new Date().toISOString(),
  }));

  try {
    const first = await EzonePayFulfillmentService.processWebhook(webhook.raw, webhook.signature, webhook.secret, 'staging-payment-1');
    const duplicate = await EzonePayFulfillmentService.processWebhook(webhook.raw, webhook.signature, webhook.secret, 'staging-payment-2');
    const { data: updated } = await supabase.from('profiles').select('credit_balance').eq('id', testUserId).single();
    const { count } = await supabase.from('payment_idempotency').select('*', { count: 'exact', head: true }).eq('order_reference', orderReference);
    const passed = first.success && !first.isDuplicate && duplicate.success && duplicate.isDuplicate
      && count === 1 && Number(updated?.credit_balance) === initialBalance + 100;
    results.push({ testName: 'Staging durable webhook fulfillment and duplicate guard', passed });
  } catch (error) {
    results.push({ testName: 'Staging durable webhook fulfillment and duplicate guard', passed: false, details: error instanceof Error ? error.message : String(error) });
  } finally {
    await supabase.from('credit_lots').delete().eq('order_reference', orderReference);
    await supabase.from('credit_transactions').delete().eq('idempotency_key', `payment:${orderReference}`);
    await supabase.from('payment_transactions').delete().eq('order_reference', orderReference);
    await supabase.from('payment_idempotency').delete().eq('order_reference', orderReference);
    await supabase.from('profiles').update({ credit_balance: initialBalance }).eq('id', testUserId);
    EzonePayFulfillmentService.resetClientFactoryForTesting();
  }

  return { allPassed: results.every(result => result.passed), results };
}
