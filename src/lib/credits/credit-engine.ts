import { createServerSupabaseClient } from '../supabase/server';
import { checkPermission, AdminRole } from '../auth/rbac-engine';

export interface CreditResult { success: boolean; newBalance: number; message: string; transactionId?: string; }
export interface CreditTransactionRecord {
  id: string; userId: string; amount: number;
  transactionType: 'grant' | 'deduction' | 'refund' | 'subscription' | 'purchase' | 'generation' | 'admin_adjustment';
  description: string; referenceType?: string; referenceId?: string; actorId?: string; idempotencyKey?: string; createdAt: string;
}

export const SERVER_MODEL_PRICING: Record<string, number> = {
  'openai/gpt-4o-mini': 2,
  'anthropic/claude-3.5-sonnet': 4,
  'meta-llama/llama-3.3-70b-instruct': 2,
  'google/gemini-2.5-flash': 1,
  'imagen-4.0-generate-001': 5,
  'gemini-3.1-flash-image-preview': 4,
  'flux-1-schnell': 3,
  'runway-gen3-alpha': 15,
};

export class CreditEngine {
  private static localBalances = new Map<string, number>();
  private static localTransactions: CreditTransactionRecord[] = [];
  private static localProcessedIdempotency = new Map<string, { transactionId: string }>();

  public static calculateRequiredCredits(modelId: string, defaultType: 'chat' | 'image' | 'video' = 'chat'): number {
    if (SERVER_MODEL_PRICING[modelId] !== undefined) return SERVER_MODEL_PRICING[modelId];
    return defaultType === 'video' ? 15 : defaultType === 'image' ? 5 : 2;
  }

  public static async getBalance(userId: string): Promise<number> {
    if (!userId) throw new Error('INVALID_INPUT: User ID is required.');
    try {
      const { data, error } = await createServerSupabaseClient().from('profiles').select('credit_balance').eq('id', userId).single();
      if (!error && data) return data.credit_balance ?? 0;
    } catch {}
    return this.localBalances.get(userId) ?? 50;
  }

  public static async hasSufficientCredits(userId: string, requiredAmount: number): Promise<boolean> {
    return (await this.getBalance(userId)) >= requiredAmount;
  }

  public static async deductCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey?: string, actorId?: string): Promise<CreditResult> {
    if (amount <= 0) return { success: false, newBalance: 0, message: 'INVALID_AMOUNT' };
    const key = idempotencyKey || `deduct_${referenceType}_${referenceId}`;
    const local = this.localProcessedIdempotency.get(key);
    if (local) return { success: true, newBalance: await this.getBalance(userId), message: 'IDEMPOTENT_DUPLICATE_SKIPPED', transactionId: local.transactionId };

    try {
      const { data, error } = await createServerSupabaseClient().rpc('deduct_credits_idempotent', {
        p_user_id: userId, p_amount: amount, p_description: description, p_reference_type: referenceType,
        p_reference_id: referenceId, p_idempotency_key: key, p_actor_id: actorId || userId,
      });
      if (!error && data?.length) {
        const result = data[0];
        if (result.transaction_id) this.localProcessedIdempotency.set(key, { transactionId: result.transaction_id });
        return { success: result.success, newBalance: result.new_balance, message: result.message, transactionId: result.transaction_id };
      }
    } catch {}

    const current = this.localBalances.get(userId) ?? 50;
    if (current < amount) return { success: false, newBalance: current, message: 'INSUFFICIENT_CREDITS' };
    const newBalance = current - amount;
    const txId = `tx_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.localBalances.set(userId, newBalance);
    this.localTransactions.unshift({ id: txId, userId, amount: -amount, transactionType: 'deduction', description, referenceType, referenceId, actorId: actorId || userId, idempotencyKey: key, createdAt: new Date().toISOString() });
    this.localProcessedIdempotency.set(key, { transactionId: txId });
    return { success: true, newBalance, message: 'SUCCESS', transactionId: txId };
  }

  public static async grantCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey?: string, actorRole?: AdminRole | string, actorId?: string, transactionType: 'grant' | 'subscription' | 'purchase' | 'admin_adjustment' = 'grant'): Promise<CreditResult> {
    if (amount <= 0) return { success: false, newBalance: 0, message: 'INVALID_AMOUNT' };
    if (transactionType === 'admin_adjustment' && actorRole && !checkPermission(actorRole as AdminRole, 'CREDITS_MANAGE')) throw new Error('FORBIDDEN: Insufficient permissions to adjust credits.');
    const key = idempotencyKey || `grant_${transactionType}_${referenceId}`;
    const local = this.localProcessedIdempotency.get(key);
    if (local) return { success: true, newBalance: await this.getBalance(userId), message: 'IDEMPOTENT_DUPLICATE_SKIPPED', transactionId: local.transactionId };

    try {
      const { data, error } = await createServerSupabaseClient().rpc('grant_credits_idempotent', {
        p_user_id: userId, p_amount: amount, p_description: description, p_reference_type: referenceType,
        p_reference_id: referenceId, p_idempotency_key: key, p_actor_id: actorId || userId, p_transaction_type: transactionType,
      });
      if (!error && data?.length) {
        const result = data[0];
        if (result.transaction_id) this.localProcessedIdempotency.set(key, { transactionId: result.transaction_id });
        return { success: result.success, newBalance: result.new_balance, message: result.message, transactionId: result.transaction_id };
      }
    } catch {}

    const current = this.localBalances.get(userId) ?? 50;
    const newBalance = current + amount;
    const txId = `tx_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.localBalances.set(userId, newBalance);
    this.localTransactions.unshift({ id: txId, userId, amount, transactionType, description, referenceType, referenceId, actorId: actorId || userId, idempotencyKey: key, createdAt: new Date().toISOString() });
    this.localProcessedIdempotency.set(key, { transactionId: txId });
    return { success: true, newBalance, message: 'SUCCESS', transactionId: txId };
  }

  public static async refundCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey: string, actorId?: string): Promise<CreditResult> {
    return this.grantCredits(userId, amount, description, referenceType, referenceId, idempotencyKey, undefined, actorId, 'grant').then((result) => ({ ...result }));
  }

  public static async getTransactions(userId: string, limit = 20): Promise<CreditTransactionRecord[]> {
    try {
      const { data, error } = await createServerSupabaseClient().from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
      if (!error && data) return data.map((tx) => ({ id: tx.id, userId: tx.user_id, amount: tx.amount, transactionType: tx.transaction_type, description: tx.description, referenceType: tx.reference_type, referenceId: tx.reference_id, actorId: tx.actor_id, idempotencyKey: tx.idempotency_key, createdAt: tx.created_at }));
    } catch {}
    return this.localTransactions.filter((tx) => tx.userId === userId).slice(0, limit);
  }

  public static setLocalBalanceForTesting(userId: string, balance: number) { this.localBalances.set(userId, balance); }
  public static clearLocalState() { this.localBalances.clear(); this.localTransactions = []; this.localProcessedIdempotency.clear(); }
}
