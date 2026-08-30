import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/observability/telemetry';
import { EzonePayFulfillmentService } from '@/lib/payments/ezonepay-fulfillment';
import { StoreEzonePayService } from '@/lib/store/store-ezonepay';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { parseEzonePayOrderReference } from '@/lib/payments/ezonepay-order-reference';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-correlation-id') || `req_${Date.now()}`;
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');
    const hmacSecret = process.env.EZONEPAY_HMAC_SECRET;

    if (!signature || !hmacSecret) {
      Logger.security('Webhook received without required signature or HMAC secret', { requestId });
      return NextResponse.json({ error: 'UNAUTHORIZED_SIGNATURE_MISSING' }, { status: 401 });
    }

    let orderReference = '';
    try {
      const parsed = JSON.parse(rawBody) as { orderReference?: unknown };
      orderReference = typeof parsed.orderReference === 'string' ? parsed.orderReference : '';
    } catch {
      return NextResponse.json({ error: 'MALFORMED_JSON_PAYLOAD' }, { status: 400 });
    }

    if (orderReference.startsWith('bbs1_')) {
      const storeResult = await StoreEzonePayService.processWebhook(rawBody, signature, hmacSecret);
      if (!storeResult.success) {
        return NextResponse.json({ error: storeResult.error }, { status: storeResult.status });
      }
      Logger.info('Brand Box Store Ezone Pay webhook processed', {
        requestId,
        metadata: { orderId: storeResult.orderId, duplicate: storeResult.duplicate },
      });
      return NextResponse.json(storeResult, { status: 200 });
    }

    const result = await EzonePayFulfillmentService.processWebhook(rawBody, signature, hmacSecret, requestId);
    if (!result.success) {
      const status = result.errorCode === 'UNAUTHORIZED_SIGNATURE' ? 403
        : result.errorCode === 'INVALID_PAYLOAD' || result.errorCode === 'BAD_REQUEST' ? 400 : 500;
      return NextResponse.json({ error: result.message, code: result.errorCode }, { status });
    }
    Logger.info('Ezone Pay webhook processed successfully', {
      requestId,
      operation: 'WEBHOOK_FULFILLMENT',
      metadata: { orderReference: result.orderReference, duplicate: result.isDuplicate },
    });

    if (!result.isDuplicate) {
      const parsed = parseEzonePayOrderReference(result.orderReference);
      if (parsed) {
        const database = createPrivilegedSupabaseClient();
        const { data: payment } = await database
          .from('payment_transactions')
          .select('amount_lyd,currency')
          .eq('order_reference', result.orderReference)
          .maybeSingle();

        const amountLabel = payment ? Number(payment.amount_lyd || 0).toLocaleString('ar-LY') : '';
        const title = parsed.itemType === 'subscription' ? 'تم تفعيل اشتراكك' : 'تمت إضافة الرصيد';
        const body = parsed.itemType === 'subscription'
          ? `تم تأكيد دفع ${amountLabel} د.ل وتفعيل الاشتراك. رصيدك الحالي ${Number(result.newBalance || 0).toLocaleString('ar-LY')} نقطة.`
          : `تم تأكيد دفع ${amountLabel} د.ل وإضافة ${Number(result.creditsGranted || 0).toLocaleString('ar-LY')} نقطة. رصيدك الحالي ${Number(result.newBalance || 0).toLocaleString('ar-LY')} نقطة.`;

        await database.from('user_notifications').insert({
          user_id: parsed.userId,
          title,
          body,
          kind: 'payment',
          action_url: `/payment/result?order=${encodeURIComponent(result.orderReference)}`,
        }).then(({ error }) => {
          if (error) Logger.error('Failed to create Ezone payment notification', new Error(error.message), { requestId });
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    Logger.error('Ezone Pay webhook handling exception', err instanceof Error ? err : new Error('Unknown webhook error'), { requestId });
    return NextResponse.json({ error: 'INTERNAL_WEBHOOK_ERROR' }, { status: 500 });
  }
}
