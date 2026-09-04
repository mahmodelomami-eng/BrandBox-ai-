type PublicConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiBaseUrl: string;
};

function clean(value: string | undefined) {
  return (value || '').trim().replace(/\/$/, '');
}

export const config: PublicConfig = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  apiBaseUrl: clean(process.env.EXPO_PUBLIC_BRANDBOX_API_URL) || 'https://www.brandbox-ai.com',
};

export const publicConfigReady = Boolean(config.supabaseUrl && config.supabasePublishableKey);

export function assertPublicConfig() {
  if (!publicConfigReady) {
    throw new Error('MOBILE_PUBLIC_CONFIG_MISSING');
  }
}
