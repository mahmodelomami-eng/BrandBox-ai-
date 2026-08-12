import { CreditEngine } from '../lib/credits/credit-engine';
import { GenerationEngine } from '../lib/generations/generation-engine';
import { AuthContext } from '../lib/auth/rbac-engine';

export async function runPhase5CreditEngineTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];
  const testUserId = 'usr_credit_test_99';
  const testUserCtx: AuthContext = { userId: testUserId, email: 'test.user@brandbox.ai', role: 'USER' };

  try {
    CreditEngine.clearLocalState();
    CreditEngine.setLocalBalanceForTesting(testUserId, 10);

    const required = CreditEngine.calculateRequiredCredits('runway-gen3-alpha', 'video');
    const res = await CreditEngine.deductCredits(testUserId, required, 'Test video gen', 'generation', 'gen_01');

    const passed = !res.success && res.message === 'INSUFFICIENT_CREDITS' && res.newBalance === 10;
    results.push({ testName: 'Insufficient Balance Deduction Prevention', passed });
  } catch (err: any) {
    results.push({ testName: 'Insufficient Balance Deduction Prevention', passed: false, details: err.message });
  }

  try {
    CreditEngine.clearLocalState();
    CreditEngine.setLocalBalanceForTesting(testUserId, 100);

    const idempotencyKey = 'idemp_key_deduct_123';
    const res1 = await CreditEngine.deductCredits(testUserId, 20, 'Test deduct 1', 'generation', 'gen_02', idempotencyKey);
    const res2 = await CreditEngine.deductCredits(testUserId, 20, 'Test deduct 2', 'generation', 'gen_02', idempotencyKey);

    const passed = res1.success && res2.success && res1.newBalance === 80 && res2.newBalance === 80 && res2.message === 'IDEMPOTENT_DUPLICATE_SKIPPED';
    results.push({ testName: 'Idempotent Credit Deduction Protection (Retry Safety)', passed });
  } catch (err: any) {
    results.push({ testName: 'Idempotent Credit Deduction Protection (Retry Safety)', passed: false, details: err.message });
  }

  try {
    CreditEngine.clearLocalState();
    CreditEngine.setLocalBalanceForTesting(testUserId, 50);

    const genRes = await GenerationEngine.executeGeneration(testUserCtx, {
      generationType: 'image',
      modelId: 'imagen-4.0-generate-001',
      prompt: 'Test prompt',
      simulateFailure: true
    });

    const endBalance = await CreditEngine.getBalance(testUserId);
    const passed = !genRes.success && genRes.wasRefunded === true && endBalance === 50;

    results.push({ testName: 'Automatic Idempotent Refund on AI Provider Failure', passed });
  } catch (err: any) {
    results.push({ testName: 'Automatic Idempotent Refund on AI Provider Failure', passed: false, details: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}