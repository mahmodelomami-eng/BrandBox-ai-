import { 
  checkPermission, 
  assertPermission, 
  AdminRole, 
  AuthContext 
} from '../auth/rbac-engine';
import { CreditEngine, CreditResult } from '../credits/credit-engine';
import { 
  createAuditRecord, 
  sanitizeAuditPayload, 
  InMemoryAuditStore, 
  StoredAuditEvent 
} from '../audit/audit-logger';
import { createServerSupabaseClient } from '../supabase/server';

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  activeSubscriptions: number;
  totalPaymentsLYD: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  totalGenerations: number;
  recentSecurityEventsCount: number;
  timestamp: string;
}

export interface UserFilterOptions {
  search?: string;
  status?: 'active' | 'suspended' | 'pending';
  role?: AdminRole;
  page?: number;
  limit?: number;
}

export interface PlanData {
  id: string;
  name: string;
  description: string;
  priceMonthlyLYD: number;
  priceMonthlyUSD: number;
  monthlyCredits: number;
  maxProjects: number;
  videoAccess: boolean;
  brandKitAccess: boolean;
  commercialUsage: boolean;
  isActive: boolean;
}

export class AdminService {
  public static async getDashboardMetrics(actor: AuthContext): Promise<AdminDashboardMetrics> {
    assertPermission(actor.role, 'ANALYTICS_READ');
    const supabase = createServerSupabaseClient();

    try {
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: suspendedUsers },
        { count: activeSubs },
        { data: payments },
        { data: creditGrants },
        { data: creditDeductions },
        { count: totalGens },
        { count: securityEventsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payment_transactions').select('amount_lyd').eq('status', 'paid'),
        supabase.from('credit_transactions').select('amount').gt('amount', 0),
        supabase.from('credit_transactions').select('amount').lt('amount', 0),
        supabase.from('generations').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).or('action.eq.SECURITY_EVENT,action.ilike.%UNAUTHORIZED%')
      ]);

      const totalPaymentsLYD = payments ? payments.reduce((acc, curr) => acc + Number(curr.amount_lyd || 0), 0) : 0;
      const totalCreditsIssued = creditGrants ? creditGrants.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
      const totalCreditsConsumed = creditDeductions ? Math.abs(creditDeductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) : 0;

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        activeSubscriptions: activeSubs || 0,
        totalPaymentsLYD,
        totalCreditsIssued,
        totalCreditsConsumed,
        totalGenerations: totalGens || 0,
        recentSecurityEventsCount: securityEventsCount || 0,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        activeSubscriptions: 0,
        totalPaymentsLYD: 0,
        totalCreditsIssued: 0,
        totalCreditsConsumed: 0,
        totalGenerations: 0,
        recentSecurityEventsCount: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  public static async getUsers(actor: AuthContext, options: UserFilterOptions = {}) {
    assertPermission(actor.role, 'USERS_READ');
    const supabase = createServerSupabaseClient();

    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.role) {
      query = query.eq('role', options.role);
    }

    if (options.search) {
      const q = `%${options.search.toLowerCase()}%`;
      query = query.or(`email.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: users, count, error } = await query;

    if (error) {
      throw new Error(`DATABASE_ERROR: Failed to fetch users: ${error.message}`);
    }

    return {
      users: users || [],
      total: count || 0,
      page,
      limit
    };
  }

  public static async suspendUser(
    actor: AuthContext, 
    targetUserId: string, 
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    assertPermission(actor.role, 'USERS_MANAGE');

    if (!reason || reason.trim().length === 0) {
      throw new Error('INVALID_INPUT: A valid suspension reason is required.');
    }

    const supabase = createServerSupabaseClient();

    const { data: userProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !userProfile) {
      throw new Error(`USER_NOT_FOUND: User ${targetUserId} does not exist.`);
    }

    if (userProfile.role === 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: SUPER_ADMIN accounts cannot be suspended.');
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (updateErr) {
      throw new Error(`DATABASE_ERROR: Failed to suspend user: ${updateErr.message}`);
    }

    const auditRecord = createAuditRecord(actor, {
      action: 'ADMIN_SUSPENDED_USER',
      entity: 'profiles',
      entityId: targetUserId,
      beforeState: { status: userProfile.status },
      afterState: { status: 'suspended' },
      result: { status: 'success' },
      metadata: { reason }
    });

    try {
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: actor.userId,
        actor_role: actor.role,
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

    return { success: true, message: `User ${targetUserId} suspended successfully.` };
  }

  public static async reactivateUser(
    actor: AuthContext, 
    targetUserId: string
  ): Promise<{ success: boolean; message: string }> {
    assertPermission(actor.role, 'USERS_MANAGE');
    const supabase = createServerSupabaseClient();

    const { data: userProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !userProfile) {
      throw new Error(`USER_NOT_FOUND: User ${targetUserId} does not exist.`);
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (updateErr) {
      throw new Error(`DATABASE_ERROR: Failed to reactivate user: ${updateErr.message}`);
    }

    const auditRecord = createAuditRecord(actor, {
      action: 'ADMIN_REACTIVATED_USER',
      entity: 'profiles',
      entityId: targetUserId,
      beforeState: { status: userProfile.status },
      afterState: { status: 'active' },
      result: { status: 'success' },
      metadata: { reason: 'Administrative reactivation' }
    });

    try {
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: actor.userId,
        actor_role: actor.role,
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

    return { success: true, message: `User ${targetUserId} reactivated successfully.` };
  }

  public static async changeUserRole(
    actor: AuthContext, 
    targetUserId: string, 
    newRole: AdminRole
  ): Promise<{ success: boolean; message: string }> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: Only SUPER_ADMIN can modify administrative roles.');
    }

    if (actor.userId === targetUserId && newRole !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: Self-demotion is restricted to prevent platform lockout.');
    }

    const supabase = createServerSupabaseClient();

    const { data: userProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !userProfile) {
      throw new Error(`USER_NOT_FOUND: Target profile ${targetUserId} does not exist.`);
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (updateErr) {
      throw new Error(`DATABASE_ERROR: Failed to update role: ${updateErr.message}`);
    }

    const auditRecord = createAuditRecord(actor, {
      action: 'ADMIN_CHANGED_ADMIN_ROLE',
      entity: 'profiles',
      entityId: targetUserId,
      beforeState: { role: userProfile.role },
      afterState: { role: newRole },
      result: { status: 'success' },
      metadata: { updatedBy: actor.email }
    });

    try {
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: actor.userId,
        actor_role: actor.role,
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

    return { success: true, message: `Role for ${targetUserId} updated to ${newRole}.` };
  }

  public static async adjustUserCredits(
    actor: AuthContext,
    targetUserId: string,
    amount: number,
    reason: string,
    idempotencyKey?: string
  ): Promise<CreditResult> {
    assertPermission(actor.role, 'CREDITS_MANAGE');

    if (!reason || reason.trim().length === 0) {
      throw new Error('INVALID_INPUT: Reason required for credit adjustment.');
    }

const adjustmentReferenceId = `adj_${targetUserId}_${Date.now()}`;
const adjustmentIdempotencyKey = idempotencyKey || adjustmentReferenceId;

const result = await CreditEngine.grantCredits(
  targetUserId,
  Math.abs(amount),
  `Administrative Adjustment: ${reason}`,
  'admin_adjustment',
  adjustmentReferenceId,
  adjustmentIdempotencyKey,
  actor.role,
  actor.userId,
  amount >= 0 ? 'grant' : 'admin_adjustment'
);

    const auditRecord = createAuditRecord(actor, {
      action: 'ADMIN_ADJUSTED_CREDITS',
      entity: 'credit_transactions',
      entityId: targetUserId,
      beforeState: { targetUserId },
      afterState: { adjustmentAmount: amount, newBalance: result.newBalance },
      result: { status: result.success ? 'success' : 'failed' },
      metadata: { reason, idempotencyKey }
    });

    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: actor.userId,
        actor_role: actor.role,
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

    return result;
  }

  public static async updatePlan(
    actor: AuthContext, 
    planId: string, 
    planData: Partial<PlanData>
  ): Promise<{ success: boolean; message: string }> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: Only SUPER_ADMIN can modify commercial plans and pricing.');
    }

    const supabase = createServerSupabaseClient();

    const { data: existingPlan, error: fetchErr } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchErr || !existingPlan) {
      throw new Error(`PLAN_NOT_FOUND: Plan ${planId} does not exist.`);
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (planData.name !== undefined) updatePayload.name = planData.name;
    if (planData.description !== undefined) updatePayload.description = planData.description;
    if (planData.priceMonthlyLYD !== undefined) updatePayload.price_monthly_lyd = planData.priceMonthlyLYD;
    if (planData.priceMonthlyUSD !== undefined) updatePayload.price_monthly_usd = planData.priceMonthlyUSD;
    if (planData.monthlyCredits !== undefined) updatePayload.monthly_credits = planData.monthlyCredits;
    if (planData.maxProjects !== undefined) updatePayload.max_projects = planData.maxProjects;
    if (planData.videoAccess !== undefined) updatePayload.video_access = planData.videoAccess;
    if (planData.isActive !== undefined) updatePayload.is_active = planData.isActive;

    const { error: updateErr } = await supabase
      .from('plans')
      .update(updatePayload)
      .eq('id', planId);

    if (updateErr) {
      throw new Error(`DATABASE_ERROR: Failed to update plan: ${updateErr.message}`);
    }

    const auditRecord = createAuditRecord(actor, {
      action: 'ADMIN_CHANGED_PLAN',
      entity: 'plans',
      entityId: planId,
      beforeState: sanitizeAuditPayload(existingPlan),
      afterState: sanitizeAuditPayload(planData),
      result: { status: 'success' },
      metadata: { planId }
    });

    try {
      await supabase.from('audit_logs').insert({
        id: auditRecord.id,
        actor_id: actor.userId,
        actor_role: actor.role,
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

    return { success: true, message: `Plan ${planId} updated successfully.` };
  }

  public static async getPayments(actor: AuthContext) {
    assertPermission(actor.role, 'PAYMENTS_READ');
    const supabase = createServerSupabaseClient();

    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`DATABASE_ERROR: Failed to query payments: ${error.message}`);
    }

    return payments || [];
  }

  public static async getAuditLogs(actor: AuthContext, limit = 50): Promise<StoredAuditEvent[]> {
    assertPermission(actor.role, 'AUDIT_LOGS_READ');
    const supabase = createServerSupabaseClient();

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !logs) {
      return InMemoryAuditStore.getInstance().getLogs(limit);
    }

    return logs.map(l => ({
      id: l.id,
      actorId: l.actor_id,
      actorEmail: l.actor_id,
      actorRole: l.actor_role,
      action: l.action,
      entity: l.resource,
      entityId: l.resource_id,
      beforeState: l.before_state || {},
      afterState: l.after_state || {},
      result: l.result || { status: 'success' },
      metadata: l.metadata || {},
      createdAt: l.created_at
    }));
  }
}