import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client for Staging Integration Testing.
 * Strictly enforces TEST_DATABASE_MODE='staging' and refuses execution if pointing to production.
 */
export function createStagingTestClient(): SupabaseClient {
  const dbMode = process.env.TEST_DATABASE_MODE;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (dbMode !== 'staging') {
    throw new Error(
      `STAGING_SAFETY_VIOLATION: Integration test client execution blocked. TEST_DATABASE_MODE must be explicitly set to 'staging' (current: '${dbMode || 'unset'}').`
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'MISSING_STAGING_CREDENTIALS: Both SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be supplied in environment variables.'
    );
  }

  const lowerUrl = supabaseUrl.toLowerCase();
  if (lowerUrl.includes('prod') || lowerUrl.includes('brandbox-ai.com')) {
    throw new Error(
      `STAGING_SAFETY_PROTECTION: Refusing to initialize integration test client against suspected production URL (${supabaseUrl}).`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
