import { createClient } from '@supabase/supabase-js';
import { assertPublicConfig, config } from './config';
import { sessionStorage } from './session-storage';

assertPublicConfig();

export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
