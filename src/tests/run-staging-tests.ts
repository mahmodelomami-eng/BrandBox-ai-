import { runStagingCreditIntegrationTests } from './integration/credit-integration.test';
import { runStagingEzonePayIntegrationTests } from './integration/ezonepay-integration.test';
import { resetStagingTestData } from '../lib/supabase/test-db-reset';

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

    console.log('\n--- CREDIT INTEGRATION RESULTS ---');
    console.table(creditRes.results);

    console.log('\n--- EZONE PAY INTEGRATION RESULTS ---');
    console.table(payRes.results);

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
