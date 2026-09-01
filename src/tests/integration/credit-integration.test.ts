import { createStagingTestClient } from '../../lib/supabase/test-client';

export async function runStagingCreditIntegrationTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];
  const testUserId = process.env.STAGING_TEST_USER_ID;
  if (!testUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testUserId)) {
    throw new Error('STAGING_TEST_USER_ID must identify a dedicated staging auth user.');
  }

  try {
    const supabase = createStagingTestClient();

    // 1. Use the dedicated staging auth profile; never synthesize a non-auth profile ID.
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', testUserId)
      .single();
    if (existingProfileError || !existingProfile?.email?.includes('test.staging')) {
      throw new Error('STAGING_TEST_USER_ID must belong to a dedicated test.staging profile.');
    }
    await supabase.from('profiles').update({ credit_balance: 100 }).eq('id', testUserId);

    // 2. Use per-run identifiers so this real staging test is safely rerunnable.
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const req1 = supabase.rpc('deduct_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 80,
      p_description: 'Staging Concurrency Req 1',
      p_reference_type: 'generation',
      p_reference_id: `gen_test_conc_1_${runId}`,
      p_idempotency_key: `idemp_staging_conc_1_${runId}`
    });

    const req2 = supabase.rpc('deduct_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 80,
      p_description: 'Staging Concurrency Req 2',
      p_reference_type: 'generation',
      p_reference_id: `gen_test_conc_2_${runId}`,
      p_idempotency_key: `idemp_staging_conc_2_${runId}`
    });

    const [res1, res2] = await Promise.all([req1, req2]);

    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', testUserId)
      .single();

    const success1 = res1.data && res1.data[0]?.success;
    const success2 = res2.data && res2.data[0]?.success;
    const finalBalance = profile?.credit_balance;

    const passed = ((success1 && !success2) || (!success1 && success2)) && finalBalance === 20;
    results.push({ testName: 'Real Staging DB Credit Concurrency Locking', passed });
  } catch (err: any) {
    results.push({ testName: 'Real Staging DB Credit Concurrency Locking', passed: false, details: err.message });
  }

  try {
    const supabase = createStagingTestClient();
    const retryRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const dkey = `idemp_staging_deduct_retry_101_${retryRunId}`;

    // 1. Initial Deduction
    const { data: d1 } = await supabase.rpc('deduct_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 10,
      p_description: 'Staging Deduct Retry',
      p_reference_type: 'generation',
      p_reference_id: `gen_test_retry_101_${retryRunId}`,
      p_idempotency_key: dkey
    });

    // 2. Immediate Retry with Same Idempotency Key
    const { data: d2 } = await supabase.rpc('deduct_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 10,
      p_description: 'Staging Deduct Retry',
      p_reference_type: 'generation',
      p_reference_id: `gen_test_retry_101_${retryRunId}`,
      p_idempotency_key: dkey
    });

    const passed =
      d1 && d1[0]?.success &&
      d2 && d2[0]?.success &&
      d2[0]?.message === 'IDEMPOTENT_DUPLICATE_SKIPPED' &&
      d1[0]?.new_balance === d2[0]?.new_balance;

    results.push({ testName: 'Real Staging DB Credit Deduct Idempotency', passed });
  } catch (err: any) {
    results.push({ testName: 'Real Staging DB Credit Deduct Idempotency', passed: false, details: err.message });
  }

  try {
    const supabase = createStagingTestClient();
    const retryRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const refundRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const rkey = `idemp_staging_refund_retry_202_${refundRunId}`;

    // 1. Initial Refund
    const { data: r1 } = await supabase.rpc('refund_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 10,
      p_description: 'Staging Refund Retry',
      p_reference_type: 'generation_failure',
      p_reference_id: `gen_test_retry_101_${retryRunId}`,
      p_idempotency_key: rkey
    });

    // 2. Duplicate Refund Call
    const { data: r2 } = await supabase.rpc('refund_credits_idempotent', {
      p_user_id: testUserId,
      p_amount: 10,
      p_description: 'Staging Refund Retry',
      p_reference_type: 'generation_failure',
      p_reference_id: `gen_test_retry_101_${retryRunId}`,
      p_idempotency_key: rkey
    });

    const passed =
      r1 && r1[0]?.success &&
      r2 && r2[0]?.success &&
      r2[0]?.message === 'IDEMPOTENT_DUPLICATE_SKIPPED' &&
      r1[0]?.new_balance === r2[0]?.new_balance;

    results.push({ testName: 'Real Staging DB Refund Idempotency', passed });
  } catch (err: any) {
    results.push({ testName: 'Real Staging DB Refund Idempotency', passed: false, details: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}
