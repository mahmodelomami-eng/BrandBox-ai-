import crypto from 'crypto';
import { EzonePayFulfillmentService } from '../lib/payments/ezonepay-fulfillment';
import { CreditEngine } from '../lib/credits/credit-engine';

export async function runPhase10EzonePayTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];
  const testSecret = 'test_ezonepay_hmac_secret_99999999';
  const testUserId = 'usr_payment_test_101';

  try {
    EzonePayFulfillmentService.clearLocalState();
    CreditEngine.clearLocalState();

    const rawBody = JSON.stringify({
      orderReference: 'BBX-TEST-001',
      providerTxId: 'ezp_tx_1001',
      status: 'paid',
      userId: testUserId,
      amountLYD: 25,
      currency: 'LYD',
      itemType: 'purchase',
      packageId: 'pkg_100'
    });

    const validSig = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');
    const isValid = EzonePayFulfillmentService.verifySignature(rawBody, validSig, testSecret);

    results.push({ testName: 'Constant-Time HMAC-SHA256 Signature Verification', passed: isValid });
  } catch (err: any) {
    results.push({ testName: 'Constant-Time HMAC-SHA256 Signature Verification', passed: false, details: err.message });
  }

  try {
    EzonePayFulfillmentService.clearLocalState();
    CreditEngine.clearLocalState();
    CreditEngine.setLocalBalanceForTesting(testUserId, 50);

    const orderRef = 'BBX-PKG-PURCHASE-01';
    const rawBody = JSON.stringify({
      orderReference: orderRef,
      providerTxId: 'ezp_tx_2002',
      status: 'paid',
      userId: testUserId,
      amountLYD: 25,
      currency: 'LYD',
      itemType: 'purchase',
      packageId: 'pkg_100'
    });

    const sig = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');
    const fulfillment = await EzonePayFulfillmentService.processWebhook(rawBody, sig, testSecret, 'req_test_01');
    const newBalance = await CreditEngine.getBalance(testUserId);

    const passed = fulfillment.success && fulfillment.creditsGranted === 100 && newBalance === 150;
    results.push({ testName: 'Standalone Credit Package Purchase Fulfillment', passed });
  } catch (err: any) {
    results.push({ testName: 'Standalone Credit Package Purchase Fulfillment', passed: false, details: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}