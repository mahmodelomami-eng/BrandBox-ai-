export type EzonePayMode = 'sandbox' | 'production';

export function getEzonePayMode(): EzonePayMode {
  return process.env.EZONEPAY_MODE === 'production' ? 'production' : 'sandbox';
}

export function assertEzonePayModeAllowed() {
  const mode = getEzonePayMode();
  if (mode === 'production' && process.env.EZONEPAY_PRODUCTION_ENABLED !== 'true') {
    throw new Error('EZONEPAY_PRODUCTION_NOT_ENABLED');
  }
  return mode;
}

export function getEzonePayRuntimeStatus() {
  const mode = getEzonePayMode();
  return {
    mode,
    experimental: mode === 'sandbox',
    productionEnabled: process.env.EZONEPAY_PRODUCTION_ENABLED === 'true',
    apiKeyConfigured: Boolean(process.env.EZONEPAY_API_KEY),
    baseUrlConfigured: Boolean(process.env.EZONEPAY_API_BASE_URL),
    hmacConfigured: Boolean(process.env.EZONEPAY_HMAC_SECRET),
  };
}
