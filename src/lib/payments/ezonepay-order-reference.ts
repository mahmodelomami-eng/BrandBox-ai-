import crypto from 'node:crypto';

export interface EzonePayOrderData { userId: string; itemType: 'subscription' | 'purchase'; itemId: string }

function signingKey(): string {
  const key = process.env.EZONEPAY_ORDER_SIGNING_SECRET || process.env.EZONEPAY_API_KEY;
  if (!key) throw new Error('EZONEPAY_ORDER_SIGNING_SECRET_MISSING');
  return key;
}

export function createEzonePayOrderReference(data: EzonePayOrderData): string {
  const payload = Buffer.from(JSON.stringify({ u: data.userId, t: data.itemType === 'subscription' ? 's' : 'p', i: data.itemId, n: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  const signature = crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url').slice(0, 22);
  return `bb1_${payload}.${signature}`;
}

export function parseEzonePayOrderReference(reference: string): EzonePayOrderData | null {
  const match = /^bb1_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{22})$/.exec(reference);
  if (!match) return null;
  const expected = crypto.createHmac('sha256', signingKey()).update(match[1]).digest('base64url').slice(0, 22);
  const suppliedBuffer = Buffer.from(match[2]);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as Record<string, unknown>;
    if (typeof value.u !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.u) || (value.t !== 's' && value.t !== 'p') || typeof value.i !== 'string' || !value.i) return null;
    return { userId: value.u, itemType: value.t === 's' ? 'subscription' : 'purchase', itemId: value.i };
  } catch { return null; }
}
