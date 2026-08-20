import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createStagingTestClient } from '../../lib/supabase/test-client';

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  credit_balance: number;
};

/**
 * Requires a disposable staging Supabase project with migration
 * 202608190001_profile_privilege_hardening.sql applied. It deliberately uses
 * normal authenticated clients for attack attempts and a service client only
 * for setup, assertions, and cleanup.
 */
export async function runStagingProfileSecurityIntegrationTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; details?: string }[];
}> {
  if (process.env.TEST_DATABASE_MODE !== 'staging') {
    throw new Error('STAGING_SAFETY_VIOLATION: profile-security integration tests require TEST_DATABASE_MODE=staging.');
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('MISSING_STAGING_CREDENTIALS: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  }

  const service = createStagingTestClient();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const password = `ProfileSecurity!${suffix}`;
  const primaryEmail = `profile.security.primary.${suffix}@test.staging`;
  const secondaryEmail = `profile.security.secondary.${suffix}@test.staging`;
  const results: { testName: string; passed: boolean; details?: string }[] = [];
  const createdUserIds: string[] = [];

  const record = async (testName: string, assertion: () => Promise<void>) => {
    try {
      await assertion();
      results.push({ testName, passed: true });
    } catch (error: any) {
      results.push({ testName, passed: false, details: error?.message || String(error) });
    }
  };

  try {
    const primary = await service.auth.admin.createUser({
      email: primaryEmail,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Bootstrap', last_name: 'Primary' },
    });
    if (primary.error || !primary.data.user) throw primary.error || new Error('Failed to create primary staging user.');
    createdUserIds.push(primary.data.user.id);

    const secondary = await service.auth.admin.createUser({
      email: secondaryEmail,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Bootstrap', last_name: 'Secondary' },
    });
    if (secondary.error || !secondary.data.user) throw secondary.error || new Error('Failed to create secondary staging user.');
    createdUserIds.push(secondary.data.user.id);

    const { data: bootstrapProfile, error: bootstrapError } = await service
      .from('profiles')
      .select('id,email,first_name,last_name,role,status,credit_balance')
      .eq('id', primary.data.user.id)
      .single();

    await record('Signup bootstrap creates a protected default profile', async () => {
      assert.ifError(bootstrapError);
      assert.equal(bootstrapProfile?.email, primaryEmail);
      assert.equal(bootstrapProfile?.first_name, 'Bootstrap');
      assert.equal(bootstrapProfile?.last_name, 'Primary');
      assert.equal(bootstrapProfile?.role, 'USER');
      assert.equal(bootstrapProfile?.status, 'active');
      assert.equal(bootstrapProfile?.credit_balance, 50);
    });

    const primaryClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signIn = await primaryClient.auth.signInWithPassword({ email: primaryEmail, password });
    if (signIn.error || !signIn.data.user) throw signIn.error || new Error('Failed to sign in primary staging user.');

    const expectDenied = async (name: string, operation: () => PromiseLike<{ error: unknown }>) => {
      await record(name, async () => {
        const { error } = await operation();
        assert.ok(error, 'Expected database authorization to reject this operation.');
      });
    };

    await expectDenied('Authenticated user cannot directly update credit_balance', () =>
      primaryClient.from('profiles').update({ credit_balance: 999999 }).eq('id', primary.data.user.id));
    await expectDenied('Authenticated user cannot directly update status', () =>
      primaryClient.from('profiles').update({ status: 'active' }).eq('id', primary.data.user.id));
    await expectDenied('Authenticated user cannot directly update role', () =>
      primaryClient.from('profiles').update({ role: 'SUPER_ADMIN' }).eq('id', primary.data.user.id));
    await expectDenied('Authenticated user cannot directly update email', () =>
      primaryClient.from('profiles').update({ email: `attacker.${suffix}@test.staging` }).eq('id', primary.data.user.id));
    await expectDenied('Authenticated user cannot insert a profile', () =>
      primaryClient.from('profiles').insert({
        id: secondary.data.user.id,
        email: `insert.${suffix}@test.staging`,
        first_name: 'Attacker',
        last_name: 'Insert',
      }));
    await expectDenied('Authenticated user cannot delete a profile', () =>
      primaryClient.from('profiles').delete().eq('id', primary.data.user.id));

    await record('Authenticated user can update only their safe profile fields', async () => {
      const { error } = await primaryClient.rpc('update_own_profile', {
        p_first_name: 'Updated',
        p_last_name: 'Profile',
        p_phone: '+218900000000',
        p_avatar_url: 'https://example.invalid/avatar.png',
      });
      assert.ifError(error);

      const { data, error: profileError } = await service
        .from('profiles')
        .select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance')
        .eq('id', primary.data.user.id)
        .single<Profile>();
      assert.ifError(profileError);
      assert.equal(data?.first_name, 'Updated');
      assert.equal(data?.last_name, 'Profile');
      assert.equal(data?.phone, '+218900000000');
      assert.equal(data?.avatar_url, 'https://example.invalid/avatar.png');
      assert.equal(data?.email, primaryEmail);
      assert.equal(data?.role, 'USER');
      assert.equal(data?.status, 'active');
      assert.equal(data?.credit_balance, 50);
    });

    await record('update_own_profile cannot modify another user row', async () => {
      const { data, error } = await service
        .from('profiles')
        .select('first_name,last_name,phone,avatar_url,role,status,credit_balance')
        .eq('id', secondary.data.user.id)
        .single<Profile>();
      assert.ifError(error);
      assert.equal(data?.first_name, 'Bootstrap');
      assert.equal(data?.last_name, 'Secondary');
      assert.equal(data?.phone, null);
      assert.equal(data?.avatar_url, null);
      assert.equal(data?.role, 'USER');
      assert.equal(data?.status, 'active');
      assert.equal(data?.credit_balance, 50);
    });
  } finally {
    await Promise.all(createdUserIds.map(async (id) => {
      const { error } = await service.auth.admin.deleteUser(id);
      if (error) throw error;
    }));
  }

  return { allPassed: results.every((result) => result.passed), results };
}
