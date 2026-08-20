import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve('supabase/migrations/20260820002516_profile_privilege_hardening.sql');
const sql = readFileSync(migrationPath, 'utf8');

assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.profiles FROM PUBLIC, anon, authenticated;/);
assert.match(sql, /DROP POLICY IF EXISTS "Users can update own non-role fields" ON public\.profiles;/);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_unauthorized_profile_privileged_change\(\)/);
assert.match(sql, /OLD\.id IS DISTINCT FROM NEW\.id/);
assert.match(sql, /OLD\.credit_balance IS DISTINCT FROM NEW\.credit_balance/);
assert.match(sql, /OLD\.status IS DISTINCT FROM NEW\.status/);
assert.match(sql, /OLD\.role IS DISTINCT FROM NEW\.role/);
assert.match(sql, /OLD\.email IS DISTINCT FROM NEW\.email/);
assert.match(sql, /OLD\.created_at IS DISTINCT FROM NEW\.created_at/);
assert.match(sql, /OLD\.updated_at IS DISTINCT FROM NEW\.updated_at/);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.update_own_profile\(/);
assert.match(sql, /SECURITY DEFINER/);
assert.match(sql, /SET search_path = public/);
assert.match(sql, /WHERE id = auth\.uid\(\);/);
assert.match(sql, /SET first_name = p_first_name,[\s\S]*last_name = p_last_name,[\s\S]*phone = p_phone,[\s\S]*avatar_url = p_avatar_url,[\s\S]*updated_at = NOW\(\)/);
assert.doesNotMatch(sql, /p_credit_balance|p_role|p_status|p_email|p_user_id/);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.update_own_profile\(TEXT, TEXT, TEXT, TEXT\) FROM PUBLIC, anon;/);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.update_own_profile\(TEXT, TEXT, TEXT, TEXT\) TO authenticated;/);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.fulfill_ezonepay_payment_atomic\(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT\)[\s\S]*FROM PUBLIC, anon, authenticated;/);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.fulfill_ezonepay_payment_atomic\(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT\)[\s\S]*TO service_role;/);

const creditMigration = readFileSync(resolve('supabase/migrations/202608180002_credit_rpc_privilege_hardening_fix.sql'), 'utf8');
for (const functionName of [
  'deduct_credits_atomic',
  'deduct_credits_idempotent',
  'grant_credits_atomic',
  'refund_credits_idempotent',
]) {
  assert.match(creditMigration, new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${functionName}\\([\\s\\S]*?FROM PUBLIC, anon, authenticated;`));
  assert.match(creditMigration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${functionName}\\([\\s\\S]*?TO service_role;`));
}

const baseSchemaMigration = readFileSync(resolve('supabase/migrations/202608160001_phase1_3_full_schema_rls.sql'), 'utf8');
assert.match(baseSchemaMigration, /CREATE POLICY "Users can read own profile" ON public\.profiles[\s\S]*FOR SELECT USING/);
const bootstrapMigration = readFileSync(resolve('supabase/migrations/202608180003_auth_profile_bootstrap.sql'), 'utf8');
assert.match(bootstrapMigration, /CREATE OR REPLACE FUNCTION public\.handle_new_auth_user\(\)[\s\S]*?SECURITY DEFINER/);

console.log('Profile privilege-hardening migration static checks passed.');
