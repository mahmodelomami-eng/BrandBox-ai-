import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Logger } from '@/lib/observability/telemetry';

const processedTransactions = new Set<string>();

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-correlation-id') || `req_${Date.now()}`;
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-ezonepay-signature');
    const hmacSecret = process.env.EZONEPAY_HMAC_SECRET;

    if (!signature || !hmacSecret) {
      Logger.security('Webhook received without required signature or HMAC secret', { requestId });
      return NextResponse.json({ error: 'UNAUTHORIZED_SIGNATURE_MISSING' }, { status: 401 });
    }

    const expectedSignature = crypto.createHmac('sha256', hmacSecret).update(rawBody).digest('hex');
    if (signature !== expectedSignature) {
      Logger.security('HMAC signature verification failed for Ezone Pay webhook', { requestId });
      return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    const { orderReference, providerTxId, status, userId, amountLYD } = payload;

    if (processedTransactions.has(orderReference)) {
      Logger.info('Duplicate webhook event handled safely via idempotency key', { requestId, metadata: { orderReference } });
      return NextResponse.json({ success: true, message: 'IDEMPOTENT_DUPLICATE_IGNORED' }, { status: 200 });
    }

    processedTransactions.add(orderReference);
    Logger.info('Ezone Pay webhook processed successfully', { requestId, userId, operation: 'WEBHOOK_FULFILLMENT', metadata: { orderReference, providerTxId, status, amountLYD } });

    return NextResponse.json({ success: true, orderReference, status: 'PROCESSED', timestamp: new Date().toISOString() });
  } catch (err: any) {
    Logger.error('Ezone Pay webhook handling exception', err, { requestId });
    return NextResponse.json({ error: 'INTERNAL_WEBHOOK_ERROR' }, { status: 500 });
  }
}
