import crypto from 'node:crypto';
import { EzonePayFulfillmentService } from '../lib/payments/ezonepay-fulfillment';
import { createEzonePayOrderReference } from '../lib/payments/ezonepay-order-reference';

type TestResult = { testName: string; passed: boolean; details?: string };

export async function runPhase10EzonePayTests(): Promise<{
  allPassed: boolean;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const hmacSecret = 'phase10-test-hmac-secret';
  process.env.EZONEPAY_ORDER_SIGNING_SECRET = 'phase10-order-signing-secret';
  const orderReference = createEzonePayOrderReference({
    userId: '00000000-0000-4000-8000-000000000001',
    itemType: 'purchase',
    itemId: 'pkg_100',
  });
  const rawBody = JSON.stringify({ event: 2, transactionId: 1001, transactionType: 'online', orderReference });
  const signature = crypto.createHmac('sha256', hmacSecret).update(rawBody).digest('base64');

  results.push({
    testName: 'Constant-time HMAC-SHA256 signature verification',
    passed: EzonePayFulfillmentService.verifySignature(rawBody, signature, hmacSecret),
  });

  try {
    EzonePayFulfillmentService.setTransactionFetcherForTesting(async id => ({
      id,
      orderReference,
      amount: 10,
      status: 2,
      statusName: 'Paid',
      paidUtc: new Date().toISOString(),
    }));
    EzonePayFulfillmentService.setClientFactoryForTesting(() => ({
      rpc: async () => ({
        data: [{ already_processed: false, success: true, message: 'SUCCESS', credits_granted: 100, payment_id: 'pay-test', subscription_id: null, new_balance: 150 }],
        error: null,
      }),
    } as never));
    const fulfillment = await EzonePayFulfillmentService.processWebhook(rawBody, signature, hmacSecret, 'phase10-test');
    results.push({
      testName: 'Atomic credit package fulfillment',
      passed: fulfillment.success && fulfillment.creditsGranted === 100 && fulfillment.newBalance === 150,
    });
  } catch (error) {
    results.push({ testName: 'Atomic credit package fulfillment', passed: false, details: error instanceof Error ? error.message : String(error) });
  } finally {
    EzonePayFulfillmentService.resetClientFactoryForTesting();
  }

  return { allPassed: results.every(result => result.passed), results };
}
