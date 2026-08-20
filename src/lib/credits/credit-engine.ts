import { createPrivilegedSupabaseClient } from '../supabase/server';
import { checkPermission, AdminRole } from '../auth/rbac-engine';

export interface CreditResult { success: boolean; newBalance: number; message: string; transactionId?: string; }
export interface CreditTransactionRecord {
  id: string; userId: string; amount: number;
  transactionType: 'grant' | 'deduction' | 'refund' | 'subscription' | 'purchase' | 'generation' | 'admin_adjustment';
  description: string; referenceType?: string; referenceId?: string; actorId?: string; idempotencyKey?: string; createdAt: string;
}
type GrantTransactionType = 'grant' | 'subscription' | 'purchase' | 'admin_adjustment';
type RpcClient = ReturnType<typeof createPrivilegedSupabaseClient>;

export const SERVER_MODEL_PRICING: Record<string, number> = {
  'openai/gpt-4o-mini': 2, 'anthropic/claude-3.5-sonnet': 4,
  'meta-llama/llama-3.3-70b-instruct': 2, 'google/gemini-2.5-flash': 1,
  'imagen-4.0-generate-001': 5, 'gemini-3.1-flash-image-preview': 4,
  'flux-1-schnell': 3, 'runway-gen3-alpha': 15
};

function failedResult(message: string): CreditResult { return { success: false, newBalance: 0, message }; }
function parseRpcResult(data: unknown): CreditResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const result = row as Record<string, unknown>;
  if (typeof result.success !== 'boolean' || typeof result.new_balance !== 'number' || typeof result.message !== 'string') return null;
  return { success: result.success, newBalance: result.new_balance, message: result.message,
    transactionId: typeof result.transaction_id === 'string' ? result.transaction_id : undefined };
}

export class CreditEngine {
  private static clientFactory: () => RpcClient = createPrivilegedSupabaseClient;

  public static calculateRequiredCredits(modelId: string, defaultType: 'chat' | 'image' | 'video' = 'chat'): number {
    if (SERVER_MODEL_PRICING[modelId] !== undefined) return SERVER_MODEL_PRICING[modelId];
    return defaultType === 'image' ? 5 : defaultType === 'video' ? 15 : 2;
  }

  public static async getBalance(userId: string): Promise<number> {
    if (!userId) throw new Error('INVALID_INPUT: User ID is required to fetch balance.');
    const { data, error } = await this.clientFactory().from('profiles').select('credit_balance').eq('id', userId).single();
    if (error || !data || typeof data.credit_balance !== 'number') {
      throw new Error(`CREDIT_BALANCE_UNAVAILABLE: ${error?.message || 'No balance returned by database.'}`);
    }
    return data.credit_balance;
  }

  public static async hasSufficientCredits(userId: string, requiredAmount: number): Promise<boolean> {
    return (await this.getBalance(userId)) >= requiredAmount;
  }

  public static async deductCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey?: string, actorId?: string): Promise<CreditResult> {
    if (!userId || amount <= 0) return failedResult('INVALID_AMOUNT_OR_USER');
    const key = idempotencyKey || `deduct_${referenceType}_${referenceId}`;
    try {
      const { data, error } = await this.clientFactory().rpc('deduct_credits_idempotent', {
        p_user_id: userId, p_amount: amount, p_description: description, p_reference_type: referenceType,
        p_reference_id: referenceId, p_idempotency_key: key, p_actor_id: actorId || userId
      });
      if (error) return failedResult(`DATABASE_RPC_FAILED: ${error.message}`);
      return parseRpcResult(data) || failedResult('DATABASE_RPC_INVALID_RESPONSE');
    } catch (error) { return failedResult(`DATABASE_UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown database error'}`); }
  }

  public static async grantCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey?: string, actorRole?: AdminRole | string, actorId?: string, transactionType: GrantTransactionType = 'grant'): Promise<CreditResult> {
    if (transactionType === 'admin_adjustment' && actorRole && !checkPermission(actorRole as AdminRole, 'CREDITS_MANAGE')) {
      throw new Error('FORBIDDEN: Insufficient permissions to adjust credit balances.');
    }
    if (!userId || amount <= 0) return failedResult('INVALID_AMOUNT_OR_USER');
    const key = idempotencyKey || `grant_${transactionType}_${referenceType}_${referenceId}`;
    try {
      const { data, error } = await this.clientFactory().rpc('grant_credits_idempotent', {
        p_user_id: userId, p_amount: amount, p_description: description, p_reference_type: referenceType,
        p_reference_id: referenceId, p_idempotency_key: key, p_actor_id: actorId || userId, p_tx_type: transactionType
      });
      if (error) return failedResult(`DATABASE_RPC_FAILED: ${error.message}`);
      return parseRpcResult(data) || failedResult('DATABASE_RPC_INVALID_RESPONSE');
    } catch (error) { return failedResult(`DATABASE_UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown database error'}`); }
  }

  public static async refundCredits(userId: string, amount: number, description: string, referenceType: string, referenceId: string, idempotencyKey: string, actorId?: string): Promise<CreditResult> {
    if (!userId || amount <= 0) return failedResult('INVALID_AMOUNT_OR_USER');
    const key = idempotencyKey || `refund_${referenceType}_${referenceId}`;
    try {
      const { data, error } = await this.clientFactory().rpc('refund_credits_idempotent', {
        p_user_id: userId, p_amount: amount, p_description: description, p_reference_type: referenceType,
        p_reference_id: referenceId, p_idempotency_key: key, p_actor_id: actorId || userId
      });
      if (error) return failedResult(`DATABASE_RPC_FAILED: ${error.message}`);
      return parseRpcResult(data) || failedResult('DATABASE_RPC_INVALID_RESPONSE');
    } catch (error) { return failedResult(`DATABASE_UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown database error'}`); }
  }

  public static async getTransactions(userId: string, limit = 20): Promise<CreditTransactionRecord[]> {
    const { data, error } = await this.clientFactory().from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error || !data) throw new Error(`CREDIT_TRANSACTIONS_UNAVAILABLE: ${error?.message || 'No transaction data returned.'}`);
    return data.map(tx => ({ id: tx.id, userId: tx.user_id, amount: tx.amount, transactionType: tx.transaction_type,
      description: tx.description, referenceType: tx.reference_type, referenceId: tx.reference_id, actorId: tx.actor_id,
      idempotencyKey: tx.idempotency_key, createdAt: tx.created_at }));
  }

  /** @deprecated Memory-backed credit state was removed. */
  public static setLocalBalanceForTesting(_userId?: string, _balance?: number): never { throw new Error('LOCAL_CREDIT_STATE_REMOVED'); }
  /** @deprecated Memory-backed credit state was removed. */
  public static clearLocalState(): void { /* compatibility no-op; no local state exists */ }
  public static setClientFactoryForTesting(factory: () => RpcClient): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('TEST_HELPER_UNAVAILABLE');
    this.clientFactory = factory;
  }
  public static resetClientFactoryForTesting(): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('TEST_HELPER_UNAVAILABLE');
    this.clientFactory = createPrivilegedSupabaseClient;
  }
}
