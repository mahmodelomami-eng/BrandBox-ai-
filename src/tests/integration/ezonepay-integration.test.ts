import crypto from 'crypto';
import { createStagingTestClient } from '../../lib/supabase/test-client';
import { EzonePayFulfillmentService } from '../../lib/payments/ezonepay-fulfillment';

export async function runStagingEzonePayIntegrationTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];
  const testUserId = 'usr_test_staging_pay_01';
  const testHmacSecret = process.env.EZONEPAY_HMAC_SECRET || 'staging_test_hmac_secret_32bytes';

  try {
    const supabase = createStagingTestClient();

    // 1. Seed Staging Profile
    await supabase.from('profiles').upsert({
      id: testUserId,
      email: 'pay.test.staging@brandbox.ai',
      first_name: 'Payment',
      last_name: 'Tester',
      credit_balance: 50,
      role: 'USER',
      status: 'active'
    });

    const orderRef = `BBX-TEST-${Date.now()}`;
    const rawBody = JSON.stringify({
      orderReference: orderRef,
      providerTxId: `ezp_tx_staging_${Date.now()}`,
      status: 'paid',
      userId: testUserId,
      amountLYD: 25,
      currency: 'LYD',
      itemType: 'purchase',
      packageId: 'pkg_100'
    });

    const signature = crypto.createHmac('sha256', testHmacSecret).update(rawBody).digest('hex');

    // 2. Execute Webhook Fulfillment
    const res1 = await EzonePayFulfillmentService.processWebhook(rawBody, signature, testHmacSecret, 'req_staging_pay1');

    // 3. Repeat Webhook Fulfillment with Identical Payload
    const res2 = await EzonePayFulfillmentService.processWebhook(rawBody, signature, testHmacSecret, 'req_staging_pay2');

    // 4. Verify Staging DB Records
    const { data: dbIdemp } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('order_reference', orderRef);

    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', testUserId)
      .single();

    const passed =
      res1.success && !res1.isDuplicate &&
      res2.success && res2.isDuplicate &&
      dbIdemp && dbIdemp.length === 1 &&
      profile?.credit_balance === 150;

    results.push({ testName: 'Real Staging DB Webhook Durable Idempotency & Credit Fulfillment', passed });
  } catch (err: any) {
    results.push({ testName: 'Real Staging DB Webhook Durable Idempotency & Credit Fulfillment', passed: false, details: err.message });
  }

  try {
    const orderRef = `BBX-TEST-CONC-${Date.now()}`;
    const rawBody = JSON.stringify({
      orderReference: orderRef,
      providerTxId: `ezp_tx_conc_${Date.now()}`,
      status: 'paid',
      userId: testUserId,
      amountLYD: 25,
      currency: 'LYD',
      itemType: 'purchase',
      packageId: 'pkg_100'
    });

    const signature = crypto.createHmac('sha256', testHmacSecret).update(rawBody).digest('hex');

    // Two simultaneous webhook invocations
    const p1 = EzonePayFulfillmentService.processWebhook(rawBody, signature, testHmacSecret, 'req_conc_1');
    const p2 = EzonePayFulfillmentService.processWebhook(rawBody, signature, testHmacSecret, 'req_conc_2');

    const [r1, r2] = await Promise.all([p1, p2]);

    const passed = (r1.success && r2.success) && ((r1.isDuplicate && !r2.isDuplicate) || (!r1.isDuplicate && r2.isDuplicate));
    results.push({ testName: 'Real Staging DB Concurrent Webhook Replay Guard', passed });
  } catch (err: any) {
    results.push({ testName: 'Real Staging DB Concurrent Webhook Replay Guard', passed: false, details: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}
