import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const integration = readFileSync(join(root, 'src/tests/integration/credit-integration.test.ts'), 'utf8');
const bootstrap = readFileSync(join(root, 'src/tests/bootstrap-staging-test-user.ts'), 'utf8');
const stagingClient = readFileSync(join(root, 'src/lib/supabase/test-client.ts'), 'utf8');
const generationEngine = readFileSync(join(root, 'src/lib/generations/generation-engine.ts'), 'utf8');

assert.ok(integration.includes('ensureStagingTestUser'));
assert.ok(bootstrap.includes("email.includes('test.staging')"));
assert.ok(integration.includes("email.includes('test.staging')"));
assert.ok(stagingClient.includes("const dbMode = process.env.TEST_DATABASE_MODE"));
assert.ok(stagingClient.includes("dbMode !== 'staging'"));
assert.ok(stagingClient.includes("lowerUrl.includes('prod')"));
assert.ok(stagingClient.includes("lowerUrl.includes('brandbox-ai.com')"));

assert.ok(!integration.includes("update({ credit_balance:"), 'staging proof must never directly mutate profile credit_balance');
assert.ok(!integration.includes("update({credit_balance:"), 'staging proof must never directly mutate profile credit_balance');
assert.ok(integration.includes("rpc('grant_credits_idempotent'"));
assert.ok(integration.includes("rpc('deduct_credits_idempotent'"));
assert.ok(integration.includes("rpc('refund_credits_idempotent'"));
assert.ok(integration.includes('IDEMPOTENT_DUPLICATE_SKIPPED'));
assert.ok(integration.includes(".from('credit_transactions')"));
assert.ok(integration.includes('ledgerDelta'));
assert.ok(integration.includes('baseline + ledgerDelta'));
assert.ok(integration.includes('restoreBaseline'));
assert.ok(integration.includes('Promise.all(['), 'staging proof must retain a real concurrency check');

assert.ok(integration.includes('gen_test_credit_success_'));
assert.ok(integration.includes("status: 'completed'"));
assert.ok(integration.includes('gen_test_credit_failure_'));
assert.ok(integration.includes("status: 'failed'"));
assert.ok(integration.includes('SIMULATED_STAGING_PROVIDER_FAILURE'));
assert.ok(integration.includes("p_reference_type: 'generation_failure_refund'"));
assert.ok(integration.includes('duplicate retries must not create duplicate ledger rows'));

assert.ok(generationEngine.includes('request.simulateFailure'));
assert.ok(generationEngine.includes("CreditEngine.refundCredits("));
assert.ok(generationEngine.includes('gen_refund_${generationId}'));
assert.ok(generationEngine.includes('wasRefunded: refundRes.success'));

console.log('Credit economy staging proof guard passed.');
