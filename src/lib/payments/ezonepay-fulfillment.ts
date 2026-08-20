import crypto from 'crypto';
import { createPrivilegedSupabaseClient } from '../supabase/server';
import { Logger } from '../observability/telemetry';

export interface WebhookPayload {
  orderReference: string;
  providerTxId: string;
  status: 'paid' | 'failed' | 'cancelled';
  userId: string;
  amountLYD: number;
  currency: string;
  itemType: 'subscription' | 'purchase';
  planId?: string;
  packageId?: string;
  timestamp?: string;
}

export interface FulfillmentResult {
  success: boolean;
  isDuplicate: boolean;
  orderReference: string;
  message: string;
  creditsGranted?: number;
  subscriptionId?: string;
  paymentId?: string;
  newBalance?: number;
  errorCode?: string;
}

type RpcRow = {
  already_processed: boolean; success: boolean; message: string; credits_granted: number;
  payment_id?: string | null; subscription_id?: string | null; new_balance?: number | null;
};
type RpcClient = ReturnType<typeof createPrivilegedSupabaseClient>;

export class EzonePayFulfillmentService {
  private static clientFactory: () => RpcClient = createPrivilegedSupabaseClient;
  public static verifySignature(rawBody: string, signature: string, hmacSecret: string): boolean {
    if (!rawBody || !signature || !hmacSecret) return false;
    try {
      const computed = Buffer.from(crypto.createHmac('sha256', hmacSecret).update(rawBody).digest('hex'), 'hex');
      const supplied = Buffer.from(signature, 'hex');
      return supplied.length === computed.length && crypto.timingSafeEqual(supplied, computed);
    } catch { return false; }
  }

  public static async processWebhook(rawBody: string, signature: string, hmacSecret: string, requestId: string): Promise<FulfillmentResult> {
    if (!this.verifySignature(rawBody, signature, hmacSecret)) {
      Logger.security('Ezone Pay HMAC signature validation failed', { requestId });
      return { success: false, isDuplicate: false, orderReference: 'UNKNOWN', message: 'INVALID_SIGNATURE', errorCode: 'UNAUTHORIZED_SIGNATURE' };
    }

    let payload: WebhookPayload;
    try { payload = JSON.parse(rawBody) as WebhookPayload; }
    catch { return { success: false, isDuplicate: false, orderReference: 'INVALID_JSON', message: 'MALFORMED_JSON_PAYLOAD', errorCode: 'BAD_REQUEST' }; }

    const { orderReference, providerTxId, status, userId, amountLYD, currency, itemType } = payload;
    const itemId = itemType === 'purchase' ? payload.packageId : itemType === 'subscription' ? payload.planId : undefined;
    if (!orderReference || !providerTxId || !userId || !status || !currency || !itemType || !itemId || !Number.isFinite(Number(amountLYD)) || Number(amountLYD) <= 0) {
      return { success: false, isDuplicate: false, orderReference: orderReference || 'MISSING', message: 'MISSING_OR_INVALID_REQUIRED_PAYLOAD_FIELDS', errorCode: 'INVALID_PAYLOAD' };
    }
    if (!['paid', 'failed', 'cancelled'].includes(status)) {
      return { success: false, isDuplicate: false, orderReference, message: 'INVALID_PAYMENT_STATUS', errorCode: 'INVALID_PAYLOAD' };
    }
    if (status !== 'paid') {
      Logger.info('Non-paid Ezone Pay status acknowledged without fulfillment.', { requestId, metadata: { orderReference, status } });
      return { success: true, isDuplicate: false, orderReference, message: `PAYMENT_STATUS_${status.toUpperCase()}_ACKNOWLEDGED` };
    }

    try {
      const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
      const { data, error } = await this.clientFactory().rpc('fulfill_ezonepay_payment_atomic_v2', {
        p_order_reference: orderReference, p_user_id: userId, p_provider_tx_id: providerTxId,
        p_amount_lyd: Number(amountLYD), p_currency: currency, p_item_type: itemType,
        p_item_id: itemId, p_payload_hash: payloadHash
      });
      if (error) {
        Logger.error('Ezone Pay atomic fulfillment RPC failed', new Error(error.message), { requestId, userId, metadata: { orderReference } });
        return { success: false, isDuplicate: false, orderReference, message: `DATABASE_FULFILLMENT_FAILED: ${error.message}`, errorCode: 'DATABASE_FULFILLMENT_FAILED' };
      }
      const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null;
      if (!row || row.success !== true) {
        return { success: false, isDuplicate: false, orderReference, message: row?.message || 'DATABASE_FULFILLMENT_INVALID_RESPONSE', errorCode: 'DATABASE_FULFILLMENT_FAILED' };
      }
      return {
        success: true, isDuplicate: Boolean(row.already_processed), orderReference,
        message: row.message, creditsGranted: row.credits_granted,
        paymentId: row.payment_id || undefined, subscriptionId: row.subscription_id || undefined,
        newBalance: row.new_balance ?? undefined
      };
    } catch (error) {
      Logger.error('Ezone Pay database fulfillment unavailable', error instanceof Error ? error : new Error('Unknown database error'), { requestId, userId, metadata: { orderReference } });
      return { success: false, isDuplicate: false, orderReference, message: 'DATABASE_FULFILLMENT_UNAVAILABLE', errorCode: 'DATABASE_FULFILLMENT_FAILED' };
    }
  }

  /** @deprecated No process-local fulfillment state remains. */
  public static clearLocalState(): void { /* compatibility no-op */ }
  public static setClientFactoryForTesting(factory: () => RpcClient): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('TEST_HELPER_UNAVAILABLE');
    this.clientFactory = factory;
  }
  public static resetClientFactoryForTesting(): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('TEST_HELPER_UNAVAILABLE');
    this.clientFactory = createPrivilegedSupabaseClient;
  }
}
