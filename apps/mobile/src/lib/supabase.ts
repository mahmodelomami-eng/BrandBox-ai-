import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { sessionStorage } from './session-storage';

// Keep app startup fail-safe even when a preview build is missing public config.
// AuthProvider will surface the configuration problem instead of letting the native app crash on import.
const supabaseUrl = config.supabaseUrl || 'https://invalid.supabase.co';
const supabasePublishableKey = config.supabasePublishableKey || 'public-config-missing';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
