import { createStagingTestClient } from '../lib/supabase/test-client';

export async function ensureStagingTestUser(): Promise<{ userId: string; email: string }> {
  const supabase = createStagingTestClient();
  const email = process.env.STAGING_TEST_USER_EMAIL || 'store.test.staging@brandbox.ai';

  if (!email.includes('test.staging')) {
    throw new Error('STAGING_TEST_USER_EMAIL must clearly identify a dedicated test.staging account.');
  }

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let user = listed.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: 'Credit', last_name: 'Staging Test' },
    });
    if (error || !data.user) throw error || new Error('Failed to create staging test auth user.');
    user = data.user;
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    first_name: 'Credit',
    last_name: 'Staging Test',
    role: 'USER',
    status: 'active',
  }, { onConflict: 'id' });
  if (profileError) throw profileError;

  return { userId: user.id, email };
}

async function main() {
  const { userId } = await ensureStagingTestUser();
  console.log('Dedicated staging test user is ready.');
  console.log(`STAGING_TEST_USER_ID=${userId}`);
}

if (process.argv[1]?.includes('bootstrap-staging-test-user')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
