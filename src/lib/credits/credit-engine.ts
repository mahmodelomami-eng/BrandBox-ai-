import { createServerSupabaseClient } from '../supabase/server';
import { checkPermission, AdminRole } from '../auth/rbac-engine';

export interface CreditResult {
  success: boolean;
  newBalance: number;
  message: string;
  transactionId?: string;
}

export interface CreditTransactionRecord {
  id: string;
  userId: string;
  amount: number;
  transactionType: 'grant' | 'deduction' | 'refund' | 'subscription' | 'purchase' | 'generation' | 'admin_adjustment';
  description: string;
  referenceType?: string;
  referenceId?: string;
  actorId?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export const SERVER_MODEL_PRICING: Record<string, number> = {
  'openai/gpt-4o-mini': 2,
  'anthropic/claude-3.5-sonnet': 4,
  'meta-llama/llama-3.3-70b-instruct': 2,
  'google/gemini-2.5-flash': 1,
  'imagen-4.0-generate-001': 5,
  'gemini-3.1-flash-image-preview': 4,
  'flux-1-schnell': 3,
  'runway-gen3-alpha': 15
};

export class CreditEngine {
  private static localBalances: Map<string, number> = new Map();
  private static localTransactions: CreditTransactionRecord[] = [];
  private static localProcessedIdempotency: Map<string, { transactionId: string; newBalance: number }> = new Map();

  public static calculateRequiredCredits(modelId: string, defaultType: 'chat' | 'image' | 'video' = 'chat'): number {
    if (SERVER_MODEL_PRICING[modelId] !== undefined) {
      return SERVER_MODEL_PRICING[modelId];
    }
    switch (defaultType) {
      case 'image': return 5;
      case 'video': return 15;
      case 'chat':
      default: return 2;
    }
  }

  public static async getBalance(userId: string): Promise<number> {
    if (!userId) throw new Error('INVALID_INPUT: User ID is required to fetch balance.');

    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return this.localBalances.get(userId) ?? 50;
      }

      return data.credit_balance ?? 0;
    } catch {
      return this.localBalances.get(userId) ?? 50;
    }
  }

  public static async hasSufficientCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const currentBalance = await this.getBalance(userId);
    return currentBalance >= requiredAmount;
  }

  public static async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceType: string,
    referenceId: string,
    idempotencyKey?: string,
    actorId?: string
  ): Promise<CreditResult> {
    if (amount <= 0) {
      return { success: false, newBalance: 0, message: 'INVALID_AMOUNT: Amount must be positive' };
    }

    const key = idempotencyKey || `deduct_${referenceType}_${referenceId}`;

    if (this.localProcessedIdempotency.has(key)) {
      const existing = this.localProcessedIdempotency.get(key)!;
      const currentBal = await this.getBalance(userId);
      return {
        success: true,
        newBalance: currentBal,
        message: 'IDEMPOTENT_DUPLICATE_SKIPPED',
        transactionId: existing.transactionId
      };
    }

    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('deduct_credits_idempotent', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_idempotency_key: key,
        p_actor_id: actorId || userId
      });

      if (!error && data && data.length > 0) {
        const result = data[0];
        return {
          success: result.success,
          newBalance: result.new_balance,
          message: result.message,
          transactionId: result.transaction_id
        };
      }
    } catch {
      // Memory fallback
    }

    const currentBal = this.localBalances.get(userId) ?? 100;
    if (currentBal < amount) {
      return { success: false, newBalance: currentBal, message: 'INSUFFICIENT_CREDITS' };
    }

    const newBal = currentBal - amount;
    this.localBalances.set(userId, newBal);

    const txId = `tx_local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txRecord: CreditTransactionRecord = {
      id: txId,
      userId,
      amount: -amount,
      transactionType: 'deduction',
      description,
      referenceType,
      referenceId,
      actorId: actorId || userId,
      idempotencyKey: key,
      createdAt: new Date().toISOString()
    };

    this.localTransactions.unshift(txRecord);
    this.localProcessedIdempotency.set(key, { transactionId: txId, newBalance: newBal });

    return {
      success: true,
      newBalance: newBal,
      message: 'SUCCESS',
      transactionId: txId
    };
  }

  public static async grantCredits(
  userId: string,
  amount: number,
  description: string,
  referenceType: string,
  referenceId: string,
  idempotencyKey?: string,
  actorRole?: AdminRole | string,
  actorId?: string,
  transactionType: 'grant' | 'subscription' | 'purchase' | 'admin_adjustment' = 'grant'
): Promise<CreditResult> {

  if (
    actorRole &&
    !['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'USER'].includes(actorRole) &&
    actorId &&
    ['grant', 'subscription', 'purchase', 'admin_adjustment'].includes(actorId) &&
    transactionType === 'grant'
  ) {
    transactionType = actorId as 'grant' | 'subscription' | 'purchase' | 'admin_adjustment';
    actorId = actorRole;
    actorRole = undefined;
  }

  if (transactionType === 'admin_adjustment' && actorRole) {
      if (!checkPermission(actorRole as AdminRole, 'CREDITS_MANAGE')) {
        throw new Error('FORBIDDEN: Insufficient permissions to adjust credit balances.');
      }
    }

    if (amount <= 0) {
      return { success: false, newBalance: 0, message: 'INVALID_AMOUNT: Amount must be positive' };
    }

    const key = idempotencyKey || `grant_${transactionType}_${referenceId}_${Date.now()}`;

    if (this.localProcessedIdempotency.has(key)) {
      const existing = this.localProcessedIdempotency.get(key)!;
      const currentBal = await this.getBalance(userId);
      return {
        success: true,
        newBalance: currentBal,
        message: 'IDEMPOTENT_DUPLICATE_SKIPPED',
        transactionId: existing.transactionId
      };
    }

    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('refund_credits_idempotent', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_idempotency_key: key,
        p_actor_id: actorId || userId
      });

      if (!error && data && data.length > 0) {
        const result = data[0];
        return {
          success: result.success,
          newBalance: result.new_balance,
          message: result.message,
          transactionId: result.transaction_id
        };
      }
    } catch {
      // Memory fallback
    }

    const currentBal = this.localBalances.get(userId) ?? 50;
    const newBal = currentBal + amount;
    this.localBalances.set(userId, newBal);

    const txId = `tx_local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txRecord: CreditTransactionRecord = {
      id: txId,
      userId,
      amount,
      transactionType,
      description,
      referenceType,
      referenceId,
      actorId: actorId || userId,
      idempotencyKey: key,
      createdAt: new Date().toISOString()
    };

    this.localTransactions.unshift(txRecord);
    this.localProcessedIdempotency.set(key, { transactionId: txId, newBalance: newBal });

    return {
      success: true,
      newBalance: newBal,
      message: 'SUCCESS',
      transactionId: txId
    };
  }

  public static async refundCredits(
    userId: string,
    amount: number,
    description: string,
    referenceType: string,
    referenceId: string,
    idempotencyKey: string,
    actorId?: string
  ): Promise<CreditResult> {
    if (amount <= 0) {
      return { success: false, newBalance: 0, message: 'INVALID_AMOUNT: Amount must be positive' };
    }

    const refundKey = idempotencyKey || `refund_${referenceType}_${referenceId}`;

    if (this.localProcessedIdempotency.has(refundKey)) {
      const existing = this.localProcessedIdempotency.get(refundKey)!;
      const currentBal = await this.getBalance(userId);
      return {
        success: true,
        newBalance: currentBal,
        message: 'IDEMPOTENT_DUPLICATE_SKIPPED',
        transactionId: existing.transactionId
      };
    }

    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('refund_credits_idempotent', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_idempotency_key: refundKey,
        p_actor_id: actorId || userId
      });

      if (!error && data && data.length > 0) {
        const result = data[0];
        return {
          success: result.success,
          newBalance: result.new_balance,
          message: result.message,
          transactionId: result.transaction_id
        };
      }
    } catch {
      // Memory fallback
    }

    const currentBal = this.localBalances.get(userId) ?? 50;
    const newBal = currentBal + amount;
    this.localBalances.set(userId, newBal);

    const txId = `tx_refund_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txRecord: CreditTransactionRecord = {
      id: txId,
      userId,
      amount,
      transactionType: 'refund',
      description,
      referenceType,
      referenceId,
      actorId: actorId || userId,
      idempotencyKey: refundKey,
      createdAt: new Date().toISOString()
    };

    this.localTransactions.unshift(txRecord);
    this.localProcessedIdempotency.set(refundKey, { transactionId: txId, newBalance: newBal });

    return {
      success: true,
      newBalance: newBal,
      message: 'SUCCESS',
      transactionId: txId
    };
  }

  public static async getTransactions(userId: string, limit = 20): Promise<CreditTransactionRecord[]> {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map(tx => ({
          id: tx.id,
          userId: tx.user_id,
          amount: tx.amount,
          transactionType: tx.transaction_type,
          description: tx.description,
          referenceType: tx.reference_type,
          referenceId: tx.reference_id,
          actorId: tx.actor_id,
          idempotencyKey: tx.idempotency_key,
          createdAt: tx.created_at
        }));
      }
    } catch {
      // Fallback
    }

    return this.localTransactions.filter(tx => tx.userId === userId).slice(0, limit);
  }

  public static setLocalBalanceForTesting(userId: string, balance: number): void {
    this.localBalances.set(userId, balance);
  }

  public static clearLocalState(): void {
    this.localBalances.clear();
    this.localTransactions = [];
    this.localProcessedIdempotency.clear();
  }
}