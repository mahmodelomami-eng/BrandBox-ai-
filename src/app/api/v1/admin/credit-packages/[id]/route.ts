import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { isActiveProfileStatus } from '@/lib/auth/user-status';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { data: auth, error: authError } = await createServerSupabaseClient().auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const db = createPrivilegedSupabaseClient();
  const { data: actor } = await db.from('profiles').select('role,status').eq('id', auth.user.id).maybeSingle();
  if (actor?.role !== 'SUPER_ADMIN' || !isActiveProfileStatus(actor.status)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await request.json();
  const purchased = Math.trunc(Number(body.purchasedCredits));
  const bonus = Math.trunc(Number(body.bonusCredits));
  const price = Number(body.priceLYD);
  const validDays = Math.trunc(Number(body.bonusValidDays ?? 90));
  if (!Number.isFinite(price) || price <= 0 || purchased <= 0 || bonus < 0 || bonus * 5 > purchased || validDays < 1 || validDays > 365)
    return NextResponse.json({ error: 'INVALID_PACKAGE_VALUES' }, { status: 400 });
  const { id } = await context.params;
  if (Boolean(body.isFeatured)) await db.from('credit_packages').update({ is_featured: false }).neq('id', id);
  const { data, error } = await db.from('credit_packages').update({
    name: String(body.name || '').trim() || `باقة ${purchased + bonus} نقطة`,
    purchased_credits: purchased, bonus_credits: bonus, credits: purchased + bonus,
    price_lyd: price, bonus_valid_days: validDays, is_featured: Boolean(body.isFeatured),
    is_active: body.isActive !== false, updated_at: new Date().toISOString(),
  }).eq('id', id).select('id,name,purchased_credits,bonus_credits,credits,price_lyd,bonus_valid_days,is_featured,is_active,sort_order').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'PACKAGE_UPDATE_FAILED' }, { status: 500 });
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_role: 'SUPER_ADMIN',
    action: 'ADMIN_CHANGED_PACKAGE',
    resource: 'credit_packages',
    resource_id: id,
    after_state: data,
    metadata: { status: 'success' },
  });
  if (auditError) return NextResponse.json({ error: 'PACKAGE_AUDIT_FAILED' }, { status: 500 });
  return NextResponse.json({ package: data });
}
