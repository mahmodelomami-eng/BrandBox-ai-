import { runStagingCreditIntegrationTests } from './integration/credit-integration.test';
import { runStagingEzonePayIntegrationTests } from './integration/ezonepay-integration.test';
import { resetStagingTestData } from '../lib/supabase/test-db-reset';
import { createStagingTestClient } from '../lib/supabase/test-client';
import { runStoreCodeStockE2EStagingTest } from './integration/store-code-stock-e2e.test';
import { runStoreCodeStockRecoveryStagingTest } from './integration/store-code-stock-recovery.test';

async function runStoreStagingReadinessChecks() {
  const supabase = createStagingTestClient();
  const results: { testName: string; passed: boolean; details?: string }[] = [];

  const requiredTables = [
    'store_categories','store_products','store_skus','store_orders','store_order_items',
    'store_entitlements','store_fulfillment_jobs','store_refunds','store_digital_codes'
  ];
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    results.push({ testName: `Store staging table: ${table}`, passed: !error, details: error?.message });
  }

  const { data: skus, error: skuError } = await supabase
    .from('store_skus').select('id').eq('inventory_mode','CODE_STOCK').limit(1);
  if (skuError) {
    results.push({ testName: 'Store CODE_STOCK availability RPC', passed: false, details: skuError.message });
  } else if (skus?.[0]?.id) {
    const { error } = await supabase.rpc('store_available_code_count', { p_sku_id: skus[0].id });
    results.push({ testName: 'Store CODE_STOCK availability RPC', passed: !error, details: error?.message });
  } else {
    results.push({ testName: 'Store CODE_STOCK availability RPC', passed: true, details: 'No CODE_STOCK SKU seeded; RPC destructive flow not invoked.' });
  }

  return { allPassed: results.every((result) => result.passed), results };
}

export async function main() {
  const dbMode = process.env.TEST_DATABASE_MODE;
  const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDedicatedUser = Boolean(process.env.STAGING_TEST_USER_ID);

  if (dbMode !== 'staging' || !hasUrl || !hasServiceKey || !hasDedicatedUser) {
    console.log('\n==================================================');
    console.log('REAL INTEGRATION TESTS: NOT RUN — STAGING CREDENTIALS NOT PROVIDED');
    console.log('==================================================');
    console.log('To execute real staging integration tests:');
    console.log('1. Set TEST_DATABASE_MODE=staging');
    console.log('2. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.log('3. Provide STAGING_TEST_USER_ID for a dedicated test.staging profile');
    console.log('==================================================\n');
    return;
  }

  console.log('🚀 Running Real Supabase Staging Integration Tests...');

  try {
    const creditRes = await runStagingCreditIntegrationTests();
    const payRes = await runStagingEzonePayIntegrationTests();
    const storeRes = await runStoreStagingReadinessChecks();
    const storeE2E = await runStoreCodeStockE2EStagingTest();
    const storeRecovery = await runStoreCodeStockRecoveryStagingTest();

    console.log('\n--- CREDIT INTEGRATION RESULTS ---');
    console.table(creditRes.results);

    console.log('\n--- EZONE PAY INTEGRATION RESULTS ---');
    console.table(payRes.results);

    console.log('\n--- STORE STAGING READINESS RESULTS ---');
    console.table(storeRes.results);

    console.log('\n--- STORE CODE_STOCK E2E RESULTS ---');
    console.table(storeE2E.results);

    console.log('\n--- STORE CODE_STOCK RECOVERY RESULTS ---');
    console.table(storeRecovery.results);

    if (!creditRes.allPassed || !payRes.allPassed || !storeRes.allPassed || !storeE2E.allPassed || !storeRecovery.allPassed) {
      throw new Error('One or more staging integration checks failed.');
    }

    await resetStagingTestData();
    console.log('\n✅ Staging Test Data Reset Complete.');
  } catch (err: any) {
    console.error('❌ Staging Integration Test Execution Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
