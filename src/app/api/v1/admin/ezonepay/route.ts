import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';
import { isActiveProfileStatus } from '@/lib/auth/user-status';
import { getEzonePayRuntimeStatus } from '@/lib/payments/ezonepay-mode';

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !isActiveProfileStatus(profile.status)) return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role)) return null;
  if (!checkPermission(role, 'payments.read') && !checkPermission(role, 'settings.read')) return null;
  return { userId: data.user.id, role };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database
    .from('payment_transactions')
    .select('id,order_reference,user_id,provider,provider_tx_id,amount_lyd,currency,status,item_type,created_at,updated_at')
    .eq('provider', 'Ezone Pay')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'PAYMENT_DIAGNOSTICS_UNAVAILABLE' }, { status: 503 });

  const payments = data || [];
  const paid = payments.filter((item) => item.status === 'paid');
  const failed = payments.filter((item) => item.status === 'failed');

  return NextResponse.json({
    runtime: getEzonePayRuntimeStatus(),
    webhook: {
      route: '/api/v1/ezonepay/webhook',
      signatureRequired: true,
      serverVerificationRequired: true,
      clientReturnCanFulfill: false,
    },
    metrics: {
      recentCount: payments.length,
      paidCount: paid.length,
      failedCount: failed.length,
      paidAmountLYD: paid.reduce((sum, item) => sum + Number(item.amount_lyd || 0), 0),
    },
    recentPayments: payments.slice(0, 20),
  });
}
