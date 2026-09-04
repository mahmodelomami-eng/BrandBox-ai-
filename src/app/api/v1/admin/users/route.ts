import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import {
  AdminRole,
  ROLE_DEFINITIONS,
} from '@/lib/auth/rbac-engine';
import { isActiveProfileStatus } from '@/lib/auth/user-status';
import {
  assertSuspendPolicy,
  canAdjustCredits,
  canDeleteUsers,
  canReadUsers,
  canSuspendUsers,
  isKnownRole,
} from '@/lib/admin/admin-user-policy';

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const IDLE_WINDOW_MS = 10 * 60 * 1000;

type PresenceState = 'online' | 'idle' | 'offline';

type RoleChangeRpcRow = {
  success?: boolean;
  role?: AdminRole;
  updated_at?: string;
  changed?: boolean;
};

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || !isActiveProfileStatus(profile.status)) return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role) || !canReadUsers(role)) return null;

  return {
    userId: data.user.id,
    email: profile.email || data.user.email || '',
    role,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'ADMIN_ACTION_FAILED';
  const status = message.includes('FORBIDDEN')
    ? 403
    : message.includes('NOT_FOUND')
      ? 404
      : message.includes('INVALID_')
        ? 400
        : 500;
  return NextResponse.json({ error: message }, { status });
}

function presenceState(lastSeenAt: string | null, now: number): PresenceState {
  if (!lastSeenAt) return 'offline';
  const timestamp = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(timestamp)) return 'offline';
  const age = Math.max(0, now - timestamp);
  if (age <= ONLINE_WINDOW_MS) return 'online';
  if (age <= IDLE_WINDOW_MS) return 'idle';
  return 'offline';
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const search = request.nextUrl.searchParams.get('q')?.trim() || '';
  const statusFilter = request.nextUrl.searchParams.get('status')?.trim() || '';
  const roleFilter = request.nextUrl.searchParams.get('role')?.trim() || '';
  const adminOnly = request.nextUrl.searchParams.get('adminOnly') === '1';
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 25)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = database
    .from('profiles')
    .select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance,last_seen_at,created_at,updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    const safe = search.replace(/[%_,]/g, ' ').trim();
    if (safe) query = query.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }

  if (statusFilter && ['active', 'suspended', 'pending'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  if (roleFilter && isKnownRole(roleFilter)) {
    query = query.eq('role', roleFilter);
  } else if (adminOnly) {
    query = query.neq('role', 'USER');
  }

  const { data: profiles, error, count } = await query;
  if (error) return NextResponse.json({ error: 'USERS_UNAVAILABLE' }, { status: 503 });

  const ids = (profiles || []).map((profile) => profile.id);
  const planByUser = new Map<string, string>();
  if (ids.length) {
    const { data: subscriptions } = await database
      .from('subscriptions')
      .select('user_id,plan_id,status,current_period_end')
      .in('user_id', ids)
      .eq('status', 'active');
    for (const subscription of subscriptions || []) {
      if (subscription.user_id && subscription.plan_id) planByUser.set(subscription.user_id, subscription.plan_id);
    }
  }

  const now = Date.now();
  const users = (profiles || []).map((profile) => {
    const state = presenceState(profile.last_seen_at, now);
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phone: profile.phone || null,
      avatarUrl: profile.avatar_url || null,
      role: profile.role || 'USER',
      roleLabelAr: ROLE_DEFINITIONS[(profile.role || 'USER') as AdminRole]?.labelAr || 'مستخدم',
      status: profile.status || 'active',
      creditBalance: Number(profile.credit_balance || 0),
      planId: planByUser.get(profile.id) || 'free',
      lastSeenAt: profile.last_seen_at,
      presenceState: state,
      online: state === 'online',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  });

  return NextResponse.json({
    users,
    actorRole: actor.role,
    serverNow: new Date(now).toISOString(),
    total: count || 0,
    page,
    limit,
    pages: Math.max(1, Math.ceil((count || 0) / limit)),
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: {
    action?: 'suspend' | 'reactivate' | 'grant_credits' | 'change_role';
    userId?: string;
    amount?: number;
    reason?: string;
    role?: AdminRole;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.userId || !body.action) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

  const database = createPrivilegedSupabaseClient();
  const { data: target, error: targetError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', body.userId)
    .maybeSingle();

  if (targetError || !target) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  const targetRole = (target.role || 'USER') as AdminRole;

  try {
    if (body.action === 'grant_credits') {
      const amount = Number(body.amount || 0);
      const reason = body.reason?.trim() || '';
      if (!reason) return NextResponse.json({ error: 'CREDIT_REASON_REQUIRED' }, { status: 400 });
      if (!canAdjustCredits(actor.role, amount)) {
        return NextResponse.json({ error: 'CREDIT_ADJUSTMENT_FORBIDDEN' }, { status: 403 });
      }
      const result = await AdminService.adjustUserCredits(actor, body.userId, amount, reason);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'change_role') {
      if (!body.role || !isKnownRole(body.role)) {
        return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });
      }

      const { data: rpcData, error: rpcError } = await database.rpc('admin_change_user_role_atomic', {
        p_actor_id: actor.userId,
        p_target_user_id: body.userId,
        p_next_role: body.role,
      });

      if (rpcError) {
        return errorResponse(new Error(`ROLE_UPDATE_FAILED: ${rpcError.message}`));
      }

      const rpcRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RoleChangeRpcRow | null;
      if (!rpcRow?.success || !rpcRow.role || rpcRow.role !== body.role) {
        return NextResponse.json({ error: 'ROLE_UPDATE_VERIFICATION_FAILED' }, { status: 503 });
      }

      const { data: verifiedRole, error: verifyError } = await database
        .from('profiles')
        .select('role,updated_at')
        .eq('id', body.userId)
        .maybeSingle();
      if (verifyError || !verifiedRole || verifiedRole.role !== body.role) {
        return NextResponse.json({ error: 'ROLE_UPDATE_VERIFICATION_FAILED' }, { status: 503 });
      }

      return NextResponse.json({
        success: true,
        role: verifiedRole.role,
        roleLabelAr: ROLE_DEFINITIONS[verifiedRole.role as AdminRole]?.labelAr || verifiedRole.role,
        updatedAt: verifiedRole.updated_at || rpcRow.updated_at || null,
        changed: Boolean(rpcRow.changed),
      });
    }

    if (body.action === 'suspend') {
      const reason = body.reason?.trim() || '';
      if (!reason) return NextResponse.json({ error: 'SUSPENSION_REASON_REQUIRED' }, { status: 400 });
      assertSuspendPolicy({
        actorRole: actor.role,
        actorUserId: actor.userId,
        targetUserId: body.userId,
        targetRole,
      });
      const result = await AdminService.suspendUser(actor, body.userId, reason);
      return NextResponse.json(result);
    }

    if (body.action === 'reactivate') {
      if (!canSuspendUsers(actor.role)) {
        return NextResponse.json({ error: 'REACTIVATION_FORBIDDEN' }, { status: 403 });
      }
      const result = await AdminService.reactivateUser(actor, body.userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!canDeleteUsers(actor.role)) return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });

  const targetUserId = request.nextUrl.searchParams.get('userId');
  if (!targetUserId) return NextResponse.json({ error: 'USER_ID_REQUIRED' }, { status: 400 });
  if (targetUserId === actor.userId) return NextResponse.json({ error: 'SELF_DELETE_FORBIDDEN' }, { status: 403 });

  const database = createPrivilegedSupabaseClient();
  const { data: target } = await database.from('profiles').select('role,email').eq('id', targetUserId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  if (target.role === 'SUPER_ADMIN') return NextResponse.json({ error: 'SUPER_ADMIN_DELETE_FORBIDDEN' }, { status: 403 });

  const { error } = await database.auth.admin.deleteUser(targetUserId);
  if (error) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });

  await database.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action: 'ADMIN_DELETED_USER',
    resource: 'profiles',
    resource_id: targetUserId,
    metadata: { deleted_email: target.email || null },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
