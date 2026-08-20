import crypto from 'crypto';
import { createPrivilegedSupabaseClient } from '../supabase/server';
import { Logger } from '../observability/telemetry';
import { EzonePayClient } from './ezonepay-client';
import { parseEzonePayOrderReference } from './ezonepay-order-reference';

export interface WebhookPayload {
  event: number;
  transactionId: number;
  transactionType: string;
  orderReference: string;
  updatedUtc?: string;
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
  private static transactionFetcher = EzonePayClient.getOnlineTransaction.bind(EzonePayClient);
  public static verifySignature(rawBody: string, signature: string, hmacSecret: string): boolean {
    if (!rawBody || !signature || !hmacSecret) return false;
    try {
      const computed = crypto.createHmac('sha256', hmacSecret).update(rawBody).digest();
      const supplied = Buffer.from(signature, 'base64');
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

    const orderReference = payload.orderReference;
    const providerTxId = String(payload.transactionId ?? '');
    const order = orderReference ? parseEzonePayOrderReference(orderReference) : null;
    if (payload.event !== 2 || payload.transactionType?.toLowerCase() !== 'online' || !/^\d+$/.test(providerTxId) || !order) {
      return { success: false, isDuplicate: false, orderReference: orderReference || 'MISSING', message: 'MISSING_OR_INVALID_REQUIRED_PAYLOAD_FIELDS', errorCode: 'INVALID_PAYLOAD' };
    }
    let transaction;
    try { transaction = await this.transactionFetcher(providerTxId); }
    catch (error) {
      Logger.error('Ezone Pay transaction verification failed', error instanceof Error ? error : new Error('Unknown provider error'), { requestId, metadata: { orderReference } });
      return { success: false, isDuplicate: false, orderReference, message: 'PROVIDER_TRANSACTION_VERIFICATION_FAILED', errorCode: 'PROVIDER_VERIFICATION_FAILED' };
    }
    if (transaction.id !== providerTxId || transaction.orderReference !== orderReference) {
      return { success: false, isDuplicate: false, orderReference, message: 'PROVIDER_TRANSACTION_REFERENCE_MISMATCH', errorCode: 'INVALID_PAYLOAD' };
    }
    if (!transaction.paidUtc || !/paid/i.test(transaction.statusName || '')) {
      return { success: false, isDuplicate: false, orderReference, message: 'PROVIDER_TRANSACTION_NOT_PAID', errorCode: 'INVALID_PAYLOAD' };
    }
    const { userId, itemType, itemId } = order;
    const amountLYD = transaction.amount;
    const currency = 'LYD';

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
    this.transactionFetcher = EzonePayClient.getOnlineTransaction.bind(EzonePayClient);
  }
  public static setTransactionFetcherForTesting(fetcher: typeof EzonePayClient.getOnlineTransaction): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('TEST_HELPER_UNAVAILABLE');
    this.transactionFetcher = fetcher;
  }
}
