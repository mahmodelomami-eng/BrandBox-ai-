export type AuditActionType =
  | 'ADMIN_CHANGED_PLAN' | 'ADMIN_ADJUSTED_CREDITS' | 'ADMIN_CANCELLED_SUBSCRIPTION'
  | 'ADMIN_EXTENDED_SUBSCRIPTION' | 'ADMIN_SUSPENDED_USER' | 'ADMIN_REACTIVATED_USER'
  | 'ADMIN_CHANGED_MODEL_PRICE' | 'AUTHENTICATION_EVENT' | 'SECURITY_EVENT' | 'PAYMENT_EVENT';

const SECRET_KEYS = ['api_key', 'apikey', 'secret', 'hmac_secret', 'authorization', 'bearer', 'password', 'service_role'];

export function sanitizeAuditPayload(obj: any): any {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeAuditPayload);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSecret = SECRET_KEYS.some(sKey => key.toLowerCase().includes(sKey));
    if (isSecret) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
