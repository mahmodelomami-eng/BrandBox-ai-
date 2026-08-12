import crypto from 'crypto';
import { createServerSupabaseClient } from '../supabase/server';
import { CreditEngine } from '../credits/credit-engine';
import { createAuditRecord, InMemoryAuditStore } from '../audit/audit-logger';
import { Logger } from '../observability/telemetry';

export interface WebhookPayload {
  orderReference: string;
  providerTxId: string;
  status: 'paid' | 'failed' | 'cancelled';
  userId: string;
  amountLYD: number;
  currency: 'LYD' | 'USD';
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
  errorCode?: string;
}

export const SERVER_PACKAGE_PRICING: Record<string, { credits: number; priceLYD: number }> = {
  pkg_100: { credits: 100, priceLYD: 25 },
  pkg_500: { credits: 550, priceLYD: 100 },
  pkg_1000: { credits: 1150, priceLYD: 175 },
  pkg_5000: { credits: 6000, priceLYD: 750 }
};

export const SERVER_PLAN_PRICING: Record<string, { monthlyCredits: number; priceLYD: number }> = {
  free: { monthlyCredits: 50, priceLYD: 0 },
  starter: { monthlyCredits: 200, priceLYD: 45 },
  pro: { monthlyCredits: 1000, priceLYD: 145 },
  business: { monthlyCredits: 5000, priceLYD: 395 }
};

export class EzonePayFulfillmentService {
  private static localIdempotencyLedger: Map<string, FulfillmentResult> = new Map();

  public static verifySignature(rawBody: string, signature: string, hmacSecret: string): boolean {
    if (!rawBody || !signature || !hmacSecret) return false;

    try {
      const computedHex = crypto
        .createHmac('sha256', hmacSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const computedBuffer = Buffer.from(computedHex, 'hex');

      if (sigBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  public static async processWebhook(
    rawBody: string,
    signature: string,
    hmacSecret: string,
    requestId: string
  ): Promise<FulfillmentResult> {
    if (!this.verifySignature(rawBody, signature, hmacSecret)) {
      Logger.security('Ezone Pay HMAC signature validation failed', { requestId });
      return {
        success: false,
        isDuplicate: false,
        orderReference: 'UNKNOWN',
        message: 'INVALID_SIGNATURE',
        errorCode: 'UNAUTHORIZED_SIGNATURE'
      };
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        success: false,
        isDuplicate: false,
        orderReference: 'INVALID_JSON',
        message: 'MALFORMED_JSON_PAYLOAD',
        errorCode: 'BAD_REQUEST'
      };
    }

    const { orderReference, providerTxId, status, userId, amountLYD, itemType, planId, packageId } = payload;

    if (!orderReference || !userId || !amountLYD || !itemType) {
      return {
        success: false,
        isDuplicate: false,
        orderReference: orderReference || 'MISSING',
        message: 'MISSING_REQUIRED_PAYLOAD_FIELDS',
        errorCode: 'INVALID_PAYLOAD'
      };
    }

    if (status !== 'paid') {
      Logger.info('Payment status is not paid; webhook recorded as failed payment.', { requestId, metadata: { orderReference, status } });
      return {
        success: true,
        isDuplicate: false,
        orderReference,
        message: `PAYMENT_STATUS_${status.toUpperCase()}_ACKNOWLEDGED`
      };
    }

    if (this.localIdempotencyLedger.has(orderReference)) {
      const existing = this.localIdempotencyLedger.get(orderReference)!;
      return {
        ...existing,
        isDuplicate: true,
        message: 'IDEMPOTENT_DUPLICATE_SKIPPED'
      };
    }

    try {
      const supabase = createServerSupabaseClient();
      const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
      const { data: rpcData, error: rpcError } = await supabase.rpc('fulfill_ezonepay_payment_atomic', {
        p_order_reference: orderReference,
        p_user_id: userId,
        p_provider_tx_id: providerTxId || `tx_ezp_${Date.now()}`,
        p_amount_lyd: amountLYD,
        p_item_type: itemType,
        p_payload_hash: payloadHash
      });

      if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].already_processed) {
        return {
          success: true,
          isDuplicate: true,
          orderReference,
          message: 'IDEMPOTENT_DUPLICATE_SKIPPED'
        };
      }
    } catch {
      // Fallback
    }

    let expectedLYD = 0;
    let creditsToGrant = 0;

    if (itemType === 'purchase') {
      const pkg = SERVER_PACKAGE_PRICING[packageId || 'pkg_100'];
      if (!pkg) {
        return { success: false, isDuplicate: false, orderReference, message: 'INVALID_PACKAGE_ID' };
      }
      expectedLYD = pkg.priceLYD;
      creditsToGrant = pkg.credits;
    } else if (itemType === 'subscription') {
      const plan = SERVER_PLAN_PRICING[planId || 'pro'];
      if (!plan) {
        return { success: false, isDuplicate: false, orderReference, message: 'INVALID_PLAN_ID' };
      }
      expectedLYD = plan.priceLYD;
      creditsToGrant = plan.monthlyCredits;
    }

    if (Number(amountLYD) < Number(expectedLYD)) {
      Logger.security('Payment amount tampering detected in Ezone Pay webhook', {
        requestId,
        userId,
        metadata: { claimedAmount: amountLYD, expectedAmount: expectedLYD, orderReference }
      });
      return {
        success: false,
        isDuplicate: false,
        orderReference,
        message: `AMOUNT_TAMPERING_DETECTED: Claimed ${amountLYD} LYD, but expected ${expectedLYD} LYD`,
        errorCode: 'PAYMENT_AMOUNT_MISMATCH'
      };
    }

    let subId: string | undefined;

    if (itemType === 'subscription' && planId) {
      subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      try {
        const supabase = createServerSupabaseClient();
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await supabase.from('subscriptions').upsert({
          id: subId,
          user_id: userId,
          plan_id: planId,
          status: 'active',
          provider: 'Ezone Pay',
          external_subscription_id: providerTxId,
          current_period_start: now.toISOString(),
          current_period_end: nextMonth.toISOString(),
          auto_renew: true,
          updated_at: now.toISOString()
        });
      } catch {
        // Fallback
      }
    }

    const grantRes = await CreditEngine.grantCredits(
      userId,
      creditsToGrant,
      `Ezone Pay ${itemType === 'subscription' ? 'Subscription' : 'Credit Purchase'} (${orderReference})`,
      itemType,
      orderReference,
      undefined,
      userId,
      itemType === 'subscription' ? 'subscription' : 'purchase'
    );

    if (!grantRes.success) {
      return {
        success: false,
        isDuplicate: false,
        orderReference,
        message: `CREDIT_GRANT_FAILED: ${grantRes.message}`
      };
    }

    const auditRecord = createAuditRecord(
      { userId, email: userId, role: 'USER' },
      {
        action: 'PAYMENT_EVENT',
        entity: 'payment_transactions',
        entityId: orderReference,
        beforeState: { orderReference, status: 'pending' },
        afterState: { orderReference, status: 'paid', amountLYD, creditsGranted: creditsToGrant },
        result: { status: 'success', hmacVerified: true },
        metadata: { provider: 'Ezone Pay', providerTxId, itemType, planId, packageId }
      }
    );

    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: userId,
        actor_role: 'USER',
        action: auditRecord.action,
        resource: auditRecord.entity,
        resource_id: auditRecord.entityId,
        before_state: auditRecord.beforeState,
        after_state: auditRecord.afterState,
        metadata: auditRecord.metadata,
        created_at: auditRecord.createdAt
      });
    } catch {
      // Fallback
    }

    InMemoryAuditStore.getInstance().append(auditRecord);

    const finalResult: FulfillmentResult = {
      success: true,
      isDuplicate: false,
      orderReference,
      message: 'FULFILLMENT_SUCCESSFUL',
      creditsGranted: creditsToGrant,
      subscriptionId: subId
    };

    this.localIdempotencyLedger.set(orderReference, finalResult);
    return finalResult;
  }

  public static clearLocalState(): void {
    this.localIdempotencyLedger.clear();
  }
}