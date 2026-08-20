import { createClient } from '@supabase/supabase-js';

function requireSupabaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('SUPABASE_CONFIGURATION_ERROR: SUPABASE_URL is required.');
  return supabaseUrl;
}

function createStatelessClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Normal server client. This client never receives service-role credentials. */
export function createServerSupabaseClient() {
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseKey) throw new Error('SUPABASE_CONFIGURATION_ERROR: A server anon/publishable key is required.');
  return createStatelessClient(requireSupabaseUrl(), supabaseKey);
}

/** Privileged server-only client. Missing service credentials fail closed. */
export function createPrivilegedSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING: Privileged database access is unavailable.');
  return createStatelessClient(requireSupabaseUrl(), serviceRoleKey);
}
