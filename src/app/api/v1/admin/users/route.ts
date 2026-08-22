import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';

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

  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) return null;

  return {
    userId: data.user.id,
    email: profile.email || data.user.email || '',
    role,
  };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const search = request.nextUrl.searchParams.get('q')?.trim() || '';

  let query = database
    .from('profiles')
    .select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance,last_seen_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (search) {
    const safe = search.replace(/[%_,]/g, ' ').trim();
    if (safe) query = query.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }

  const { data: profiles, error } = await query;
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
    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phone: profile.phone || null,
      avatarUrl: profile.avatar_url || null,
      role: profile.role || 'USER',
      status: profile.status || 'active',
      creditBalance: Number(profile.credit_balance || 0),
      planId: planByUser.get(profile.id) || 'free',
      lastSeenAt: profile.last_seen_at,
      online: Boolean(lastSeen && now - lastSeen <= 120_000),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  });

  return NextResponse.json({ users, actorRole: actor.role, total: users.length });
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

  try {
    if (body.action === 'grant_credits') {
      if (actor.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });
      const amount = Number(body.amount || 0);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
        return NextResponse.json({ error: 'INVALID_CREDIT_AMOUNT' }, { status: 400 });
      }
      const result = await AdminService.adjustUserCredits(
        actor,
        body.userId,
        amount,
        body.reason?.trim() || 'إضافة رصيد بواسطة المدير العام',
      );
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'change_role') {
      if (actor.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });
      if (!body.role || !['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'USER'].includes(body.role)) {
        return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });
      }
      const result = await AdminService.changeUserRole(actor, body.userId, body.role);
      return NextResponse.json(result);
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(actor.role)) {
      return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    if (body.action === 'suspend') {
      const result = await AdminService.suspendUser(actor, body.userId, body.reason?.trim() || 'إيقاف إداري');
      return NextResponse.json(result);
    }

    if (body.action === 'reactivate') {
      const result = await AdminService.reactivateUser(actor, body.userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_ACTION_FAILED';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (actor.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });

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
