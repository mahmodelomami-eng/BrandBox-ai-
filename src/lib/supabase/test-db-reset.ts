import { createStagingTestClient } from './test-client';

/**
 * Staging-only database cleanup utility.
 * Cleans synthetic test records without dropping tables or modifying production schema.
 */
export async function resetStagingTestData(): Promise<{ success: boolean; recordsCleaned: number }> {
  if (process.env.TEST_DATABASE_MODE !== 'staging') {
    throw new Error('SAFETY_VIOLATION: Database reset mechanism is restricted strictly to TEST_DATABASE_MODE=staging.');
  }

  const supabase = createStagingTestClient();
  let cleanedCount = 0;

  try {
    const { count: idempCleaned } = await supabase
      .from('payment_idempotency')
      .delete({ count: 'exact' })
      .ilike('order_reference', 'BBX-TEST-%');
    cleanedCount += idempCleaned || 0;

    const { count: payCleaned } = await supabase
      .from('payment_transactions')
      .delete({ count: 'exact' })
      .ilike('order_reference', 'BBX-TEST-%');
    cleanedCount += payCleaned || 0;

    const { count: creditIdempCleaned } = await supabase
      .from('credit_idempotency')
      .delete({ count: 'exact' })
      .ilike('idempotency_key', '%test%');
    cleanedCount += creditIdempCleaned || 0;

    const { count: creditTxCleaned } = await supabase
      .from('credit_transactions')
      .delete({ count: 'exact' })
      .ilike('id', 'tx_test_%');
    cleanedCount += creditTxCleaned || 0;

    const { count: genCleaned } = await supabase
      .from('generations')
      .delete({ count: 'exact' })
      .ilike('id', 'gen_test_%');
    cleanedCount += genCleaned || 0;

    const { count: profCleaned } = await supabase
      .from('profiles')
      .delete({ count: 'exact' })
      .ilike('email', '%test.staging%');
    cleanedCount += profCleaned || 0;

    return { success: true, recordsCleaned: cleanedCount };
  } catch (err: any) {
    throw new Error(`STAGING_RESET_ERROR: Failed to clean staging test data: ${err?.message || String(err)}`);
  }
}
