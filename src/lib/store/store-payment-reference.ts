import crypto from 'node:crypto';

export interface StorePaymentReferenceData {
  userId: string;
  orderId: string;
}

function signingKey(): string {
  const key = process.env.EZONEPAY_ORDER_SIGNING_SECRET || process.env.EZONEPAY_API_KEY;
  if (!key) throw new Error('EZONEPAY_ORDER_SIGNING_SECRET_MISSING');
  return key;
}

export function createStorePaymentReference(data: StorePaymentReferenceData): string {
  const payload = Buffer.from(
    JSON.stringify({ u: data.userId, o: data.orderId, n: crypto.randomBytes(8).toString('hex') }),
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url').slice(0, 22);
  return `bbs1_${payload}.${signature}`;
}

export function parseStorePaymentReference(reference: string): StorePaymentReferenceData | null {
  const match = /^bbs1_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{22})$/.exec(reference);
  if (!match) return null;

  const expected = crypto.createHmac('sha256', signingKey()).update(match[1]).digest('base64url').slice(0, 22);
  const supplied = Buffer.from(match[2]);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !crypto.timingSafeEqual(supplied, expectedBuffer)) return null;

  try {
    const value = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof value.u !== 'string' || !uuid.test(value.u) || typeof value.o !== 'string' || !uuid.test(value.o)) return null;
    return { userId: value.u, orderId: value.o };
  } catch {
    return null;
  }
}
