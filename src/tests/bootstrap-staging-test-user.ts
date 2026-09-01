import { createStagingTestClient } from '../lib/supabase/test-client';

async function main() {
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
      user_metadata: { first_name: 'Store', last_name: 'Staging Test' },
    });
    if (error || !data.user) throw error || new Error('Failed to create staging test auth user.');
    user = data.user;
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    first_name: 'Store',
    last_name: 'Staging Test',
    role: 'USER',
    status: 'active',
  }, { onConflict: 'id' });
  if (profileError) throw profileError;

  console.log('Dedicated staging test user is ready.');
  console.log(`STAGING_TEST_USER_ID=${user.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
