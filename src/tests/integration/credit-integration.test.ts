import assert from 'node:assert/strict';
import { createStagingTestClient } from '../../lib/supabase/test-client';
import { ensureStagingTestUser } from '../bootstrap-staging-test-user';

type ResultRow = {
  success: boolean;
  new_balance: number;
  message: string;
  transaction_id: string | null;
};

type TestResult = { testName: string; passed: boolean; details?: string };

function firstRow(data: unknown): ResultRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('STAGING_RPC_INVALID_RESPONSE');
  return row as ResultRow;
}

async function balanceOf(supabase: ReturnType<typeof createStagingTestClient>, userId: string) {
  const { data, error } = await supabase.from('profiles').select('credit_balance,email').eq('id', userId).single();
  if (error || !data || !String(data.email || '').includes('test.staging')) {
    throw new Error('Dedicated test.staging profile is required for credit integration tests.');
  }
  return Number(data.credit_balance || 0);
}

async function restoreBaseline(
  supabase: ReturnType<typeof createStagingTestClient>,
  userId: string,
  baseline: number,
  runId: string
) {
  const current = await balanceOf(supabase, userId);
  const delta = current - baseline;
  if (delta === 0) return;

  if (delta > 0) {
    const { data, error } = await supabase.rpc('deduct_credits_idempotent', {
      p_user_id: userId,
      p_amount: delta,
      p_description: `Staging credit proof cleanup ${runId}`,
      p_reference_type: 'staging_credit_cleanup',
      p_reference_id: runId,
      p_idempotency_key: `test_credit_e2e_${runId}_cleanup_deduct`,
      p_actor_id: userId,
    });
    if (error || !firstRow(data).success) throw error || new Error('STAGING_CREDIT_CLEANUP_DEDUCT_FAILED');
  } else {
    const { data, error } = await supabase.rpc('refund_credits_idempotent', {
      p_user_id: userId,
      p_amount: Math.abs(delta),
      p_description: `Staging credit proof cleanup refund ${runId}`,
      p_reference_type: 'staging_credit_cleanup',
      p_reference_id: runId,
      p_idempotency_key: `test_credit_e2e_${runId}_cleanup_refund`,
      p_actor_id: userId,
    });
    if (error || !firstRow(data).success) throw error || new Error('STAGING_CREDIT_CLEANUP_REFUND_FAILED');
  }

  assert.equal(await balanceOf(supabase, userId), baseline, 'staging cleanup must restore the exact starting balance');
}

async function runEndToEndReconciliation(userId: string): Promise<void> {
  const supabase = createStagingTestClient();
  const baseline = await balanceOf(supabase, userId);
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const prefix = `test_credit_e2e_${runId}`;
  const successGenerationId = `gen_test_credit_success_${runId}`;
  const failedGenerationId = `gen_test_credit_failure_${runId}`;
  const grantKey = `${prefix}_grant`;
  const successDeductKey = `${prefix}_success_deduct`;
  const failureDeductKey = `${prefix}_failure_deduct`;
  const failureRefundKey = `${prefix}_failure_refund`;

  try {
    const grantArgs = {
      p_user_id: userId,
      p_amount: 100,
      p_description: `Staging E2E grant ${runId}`,
      p_reference_type: 'staging_credit_proof',
      p_reference_id: runId,
      p_idempotency_key: grantKey,
      p_actor_id: userId,
      p_tx_type: 'grant',
    };
    const grant1 = await supabase.rpc('grant_credits_idempotent', grantArgs);
    if (grant1.error) throw grant1.error;
    const grantRow1 = firstRow(grant1.data);
    assert.equal(grantRow1.success, true);
    assert.equal(grantRow1.new_balance, baseline + 100);

    const grant2 = await supabase.rpc('grant_credits_idempotent', grantArgs);
    if (grant2.error) throw grant2.error;
    const grantRow2 = firstRow(grant2.data);
    assert.equal(grantRow2.message, 'IDEMPOTENT_DUPLICATE_SKIPPED');
    assert.equal(grantRow2.transaction_id, grantRow1.transaction_id);
    assert.equal(grantRow2.new_balance, baseline + 100);

    const { error: successInsertError } = await supabase.from('generations').insert({
      id: successGenerationId,
      user_id: userId,
      project_id: null,
      generation_type: 'chat',
      provider: 'staging-test',
      model: 'staging-financial-proof',
      prompt: 'Synthetic successful staging financial generation',
      settings: { staging_financial_proof: true },
      status: 'processing',
      credits_reserved: 12,
      credits_consumed: 0,
      idempotency_key: `${prefix}_success_generation`,
    });
    if (successInsertError) throw successInsertError;

    const successDeductArgs = {
      p_user_id: userId,
      p_amount: 12,
      p_description: `Staging successful generation charge ${runId}`,
      p_reference_type: 'generation',
      p_reference_id: successGenerationId,
      p_idempotency_key: successDeductKey,
      p_actor_id: userId,
    };
    const successDeduct1 = await supabase.rpc('deduct_credits_idempotent', successDeductArgs);
    if (successDeduct1.error) throw successDeduct1.error;
    const successDeductRow1 = firstRow(successDeduct1.data);
    assert.equal(successDeductRow1.success, true);
    assert.equal(successDeductRow1.new_balance, baseline + 88);

    const successDeduct2 = await supabase.rpc('deduct_credits_idempotent', successDeductArgs);
    if (successDeduct2.error) throw successDeduct2.error;
    const successDeductRow2 = firstRow(successDeduct2.data);
    assert.equal(successDeductRow2.message, 'IDEMPOTENT_DUPLICATE_SKIPPED');
    assert.equal(successDeductRow2.transaction_id, successDeductRow1.transaction_id);
    assert.equal(successDeductRow2.new_balance, baseline + 88);

    const { error: successCompleteError } = await supabase.from('generations').update({
      status: 'completed',
      credits_consumed: 12,
      error_message: null,
    }).eq('id', successGenerationId).eq('user_id', userId);
    if (successCompleteError) throw successCompleteError;

    const { error: failureInsertError } = await supabase.from('generations').insert({
      id: failedGenerationId,
      user_id: userId,
      project_id: null,
      generation_type: 'chat',
      provider: 'staging-test',
      model: 'staging-financial-proof',
      prompt: 'Synthetic controlled failed staging financial generation',
      settings: { staging_financial_proof: true, simulate_failure: true },
      status: 'processing',
      credits_reserved: 8,
      credits_consumed: 0,
      idempotency_key: `${prefix}_failure_generation`,
    });
    if (failureInsertError) throw failureInsertError;

    const failureDeduct = await supabase.rpc('deduct_credits_idempotent', {
      p_user_id: userId,
      p_amount: 8,
      p_description: `Staging failed generation reservation ${runId}`,
      p_reference_type: 'generation',
      p_reference_id: failedGenerationId,
      p_idempotency_key: failureDeductKey,
      p_actor_id: userId,
    });
    if (failureDeduct.error) throw failureDeduct.error;
    assert.equal(firstRow(failureDeduct.data).new_balance, baseline + 80);

    const { error: failureUpdateError } = await supabase.from('generations').update({
      status: 'failed',
      credits_consumed: 0,
      error_message: 'SIMULATED_STAGING_PROVIDER_FAILURE',
    }).eq('id', failedGenerationId).eq('user_id', userId);
    if (failureUpdateError) throw failureUpdateError;

    const refundArgs = {
      p_user_id: userId,
      p_amount: 8,
      p_description: `Staging controlled generation refund ${runId}`,
      p_reference_type: 'generation_failure_refund',
      p_reference_id: failedGenerationId,
      p_idempotency_key: failureRefundKey,
      p_actor_id: userId,
    };
    const refund1 = await supabase.rpc('refund_credits_idempotent', refundArgs);
    if (refund1.error) throw refund1.error;
    const refundRow1 = firstRow(refund1.data);
    assert.equal(refundRow1.success, true);
    assert.equal(refundRow1.new_balance, baseline + 88);

    const refund2 = await supabase.rpc('refund_credits_idempotent', refundArgs);
    if (refund2.error) throw refund2.error;
    const refundRow2 = firstRow(refund2.data);
    assert.equal(refundRow2.message, 'IDEMPOTENT_DUPLICATE_SKIPPED');
    assert.equal(refundRow2.transaction_id, refundRow1.transaction_id);
    assert.equal(refundRow2.new_balance, baseline + 88);

    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('id,amount,transaction_type,reference_type,reference_id,idempotency_key')
      .eq('user_id', userId)
      .in('idempotency_key', [grantKey, successDeductKey, failureDeductKey, failureRefundKey])
      .order('created_at', { ascending: true });
    if (transactionError) throw transactionError;
    assert.equal(transactions?.length, 4, 'duplicate retries must not create duplicate ledger rows');

    const amountByKey = new Map((transactions || []).map((tx) => [tx.idempotency_key, Number(tx.amount)]));
    assert.equal(amountByKey.get(grantKey), 100);
    assert.equal(amountByKey.get(successDeductKey), -12);
    assert.equal(amountByKey.get(failureDeductKey), -8);
    assert.equal(amountByKey.get(failureRefundKey), 8);
    const ledgerDelta = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    assert.equal(ledgerDelta, 88);
    assert.equal(await balanceOf(supabase, userId), baseline + ledgerDelta, 'profile balance must equal baseline plus run ledger delta');

    const { data: generationRows, error: generationError } = await supabase
      .from('generations')
      .select('id,status,credits_reserved,credits_consumed,error_message')
      .in('id', [successGenerationId, failedGenerationId])
      .order('id');
    if (generationError) throw generationError;
    assert.equal(generationRows?.length, 2);
    const successful = generationRows?.find((row) => row.id === successGenerationId);
    const failed = generationRows?.find((row) => row.id === failedGenerationId);
    assert.equal(successful?.status, 'completed');
    assert.equal(successful?.credits_consumed, 12);
    assert.equal(failed?.status, 'failed');
    assert.equal(failed?.credits_consumed, 0);
    assert.equal(failed?.error_message, 'SIMULATED_STAGING_PROVIDER_FAILURE');
  } finally {
    await restoreBaseline(supabase, userId, baseline, runId);
  }
}

async function runConcurrencyProof(userId: string): Promise<void> {
  const supabase = createStagingTestClient();
  const baseline = await balanceOf(supabase, userId);
  const runId = `concurrency_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const prefix = `test_credit_e2e_${runId}`;

  try {
    const grant = await supabase.rpc('grant_credits_idempotent', {
      p_user_id: userId,
      p_amount: 100,
      p_description: `Staging concurrency grant ${runId}`,
      p_reference_type: 'staging_credit_concurrency',
      p_reference_id: runId,
      p_idempotency_key: `${prefix}_grant`,
      p_actor_id: userId,
      p_tx_type: 'grant',
    });
    if (grant.error || !firstRow(grant.data).success) throw grant.error || new Error('STAGING_CONCURRENCY_GRANT_FAILED');

    const [res1, res2] = await Promise.all([
      supabase.rpc('deduct_credits_idempotent', {
        p_user_id: userId,
        p_amount: 80,
        p_description: `Staging concurrency deduction A ${runId}`,
        p_reference_type: 'generation',
        p_reference_id: `gen_test_concurrency_a_${runId}`,
        p_idempotency_key: `${prefix}_deduct_a`,
        p_actor_id: userId,
      }),
      supabase.rpc('deduct_credits_idempotent', {
        p_user_id: userId,
        p_amount: 80,
        p_description: `Staging concurrency deduction B ${runId}`,
        p_reference_type: 'generation',
        p_reference_id: `gen_test_concurrency_b_${runId}`,
        p_idempotency_key: `${prefix}_deduct_b`,
        p_actor_id: userId,
      }),
    ]);
    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;
    const row1 = firstRow(res1.data);
    const row2 = firstRow(res2.data);
    assert.equal(Number(row1.success) + Number(row2.success), 1, 'row locking must allow exactly one 80-credit deduction from a 100-credit test grant');
    assert.equal(await balanceOf(supabase, userId), baseline + 20);
  } finally {
    await restoreBaseline(supabase, userId, baseline, runId);
  }
}

export async function runStagingCreditIntegrationTests(): Promise<{
  allPassed: boolean;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const { userId, email } = await ensureStagingTestUser();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || !email.includes('test.staging')) {
    throw new Error('Staging credit proof requires a dedicated test.staging auth user.');
  }

  try {
    await runEndToEndReconciliation(userId);
    results.push({ testName: 'Credit Economy E2E Ledger Reconciliation', passed: true });
  } catch (error) {
    results.push({ testName: 'Credit Economy E2E Ledger Reconciliation', passed: false, details: error instanceof Error ? error.message : String(error) });
  }

  try {
    await runConcurrencyProof(userId);
    results.push({ testName: 'Real Staging DB Credit Concurrency Locking', passed: true });
  } catch (error) {
    results.push({ testName: 'Real Staging DB Credit Concurrency Locking', passed: false, details: error instanceof Error ? error.message : String(error) });
  }

  return { allPassed: results.every((result) => result.passed), results };
}
