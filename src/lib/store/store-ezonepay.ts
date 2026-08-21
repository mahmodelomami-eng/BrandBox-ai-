import crypto from 'node:crypto';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { EzonePayClient } from '@/lib/payments/ezonepay-client';
import { EzonePayFulfillmentService } from '@/lib/payments/ezonepay-fulfillment';
import { parseStorePaymentReference } from './store-payment-reference';
import { markStoreOrderPaid } from './store-service';

type StoreWebhookPayload = {
  event: number;
  transactionId: number;
  transactionType: string;
  orderReference: string;
};

export class StoreEzonePayService {
  static async processWebhook(rawBody: string, signature: string, hmacSecret: string) {
    if (!EzonePayFulfillmentService.verifySignature(rawBody, signature, hmacSecret)) {
      return { success: false, status: 403, error: 'UNAUTHORIZED_SIGNATURE' };
    }

    let payload: StoreWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as StoreWebhookPayload;
    } catch {
      return { success: false, status: 400, error: 'INVALID_JSON' };
    }

    const providerTxId = String(payload.transactionId ?? '');
    const parsed = payload.orderReference ? parseStorePaymentReference(payload.orderReference) : null;
    if (
      payload.event !== 2 ||
      payload.transactionType?.toLowerCase() !== 'online' ||
      !/^\d+$/.test(providerTxId) ||
      !parsed
    ) {
      return { success: false, status: 400, error: 'INVALID_STORE_WEBHOOK_PAYLOAD' };
    }

    const supabase = createPrivilegedSupabaseClient();
    const eventId = `ezonepay:${providerTxId}`;
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    const { data: existing } = await supabase
      .from('store_webhook_events')
      .select('id,status,payload_hash')
      .eq('source', 'EZONEPAY')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing?.status === 'PROCESSED') {
      if (existing.payload_hash !== payloadHash) {
        return { success: false, status: 409, error: 'WEBHOOK_REPLAY_PAYLOAD_MISMATCH' };
      }
      return { success: true, duplicate: true, orderId: parsed.orderId };
    }

    if (!existing) {
      const { error: insertEventError } = await supabase.from('store_webhook_events').insert({
        source: 'EZONEPAY',
        event_id: eventId,
        event_type: 'ONLINE_PAYMENT_PAID',
        payload_hash: payloadHash,
        status: 'RECEIVED',
      });
      if (insertEventError && !insertEventError.message.toLowerCase().includes('duplicate')) {
        return { success: false, status: 500, error: 'WEBHOOK_EVENT_PERSIST_FAILED' };
      }
    }

    const transaction = await EzonePayClient.getOnlineTransaction(providerTxId);
    if (
      transaction.id !== providerTxId ||
      transaction.orderReference !== payload.orderReference ||
      !transaction.paidUtc ||
      !/paid/i.test(transaction.statusName || '')
    ) {
      await supabase.from('store_webhook_events').update({
        status: 'FAILED',
        error_message: 'PROVIDER_TRANSACTION_NOT_VERIFIED',
      }).eq('source', 'EZONEPAY').eq('event_id', eventId);
      return { success: false, status: 400, error: 'PROVIDER_TRANSACTION_NOT_VERIFIED' };
    }

    const { data: order, error: orderError } = await supabase
      .from('store_orders')
      .select('id,user_id,total_lyd,payment_reference,payment_status')
      .eq('id', parsed.orderId)
      .single();

    if (orderError || !order || order.user_id !== parsed.userId || order.payment_reference !== payload.orderReference) {
      return { success: false, status: 400, error: 'STORE_ORDER_REFERENCE_MISMATCH' };
    }

    const expectedAmount = Number(order.total_lyd);
    const paidAmount = Number(transaction.amount);
    if (!Number.isFinite(expectedAmount) || !Number.isFinite(paidAmount) || Math.abs(expectedAmount - paidAmount) > 0.001) {
      await supabase.from('store_webhook_events').update({
        status: 'FAILED',
        error_message: 'STORE_PAYMENT_AMOUNT_MISMATCH',
      }).eq('source', 'EZONEPAY').eq('event_id', eventId);
      return { success: false, status: 400, error: 'STORE_PAYMENT_AMOUNT_MISMATCH' };
    }

    await markStoreOrderPaid(order.id, payload.orderReference);

    await supabase.from('store_webhook_events').update({
      status: 'PROCESSED',
      processed_at: new Date().toISOString(),
      error_message: null,
    }).eq('source', 'EZONEPAY').eq('event_id', eventId);

    return { success: true, duplicate: order.payment_status === 'PAID', orderId: order.id };
  }
}
