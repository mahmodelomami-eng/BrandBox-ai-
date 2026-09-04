import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { EzonePayClient } from '@/lib/payments/ezonepay-client';
import { getEzonePayMode } from '@/lib/payments/ezonepay-mode';
import { createEzonePayOrderReference } from '@/lib/payments/ezonepay-order-reference';
import { emitServerError, getRequestCorrelationId } from '@/lib/observability/telemetry';

type CheckoutRequest = { itemType?: 'subscription' | 'purchase'; itemId?: string };

export async function POST(request: NextRequest) {
  const correlationId = getRequestCorrelationId(request.headers);
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  let body: CheckoutRequest;
  try { body = await request.json() as CheckoutRequest; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!body.itemId || !['subscription', 'purchase'].includes(body.itemType || '')) return NextResponse.json({ error: 'INVALID_CHECKOUT_REQUEST' }, { status: 400 });

  try {
    const db = createPrivilegedSupabaseClient();
    const isPurchase = body.itemType === 'purchase';
    const { data: item, error: itemError } = isPurchase
      ? await db.from('credit_packages').select('id,name,price:price_lyd,is_active').eq('id', body.itemId).eq('is_active', true).maybeSingle()
      : await db.from('plans').select('id,name,price:price_monthly_lyd,is_active').eq('id', body.itemId).eq('is_active', true).maybeSingle();
    if (itemError || !item) return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 });
    const amount = Number(item.price);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'ITEM_NOT_PAYABLE' }, { status: 400 });
    const { data: profile, error: profileError } = await db.from('profiles').select('first_name,last_name,phone').eq('id', user.id).maybeSingle();
    if (profileError || !profile?.first_name?.trim() || !profile?.last_name?.trim() || !profile?.phone?.trim()) {
      return NextResponse.json({ error: 'PAYMENT_PROFILE_INCOMPLETE', requiredFields: ['firstName', 'lastName', 'phone'] }, { status: 400 });
    }
    const orderReference = createEzonePayOrderReference({ userId: user.id, itemType: body.itemType!, itemId: body.itemId });
    const payment = await EzonePayClient.createPaymentLink({ title: `BrandBox - ${String(item.name)}`, orderReference,
      internalReference: `${body.itemType}:${body.itemId}`, amount, redirectUrl: `${new URL(request.url).origin}/payment/result?order=${encodeURIComponent(orderReference)}`,
      customer: { firstName: profile.first_name.trim(), lastName: profile.last_name.trim(), phoneNumber: profile.phone.trim() } });
    return NextResponse.json({ paymentUrl: payment.link, paymentLinkId: payment.id, orderReference, mode: getEzonePayMode() });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'EZONEPAY_CHECKOUT_FAILED';
    const publicCode = code.startsWith('EZONEPAY_')
      ? code
      : error instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)
        ? 'EZONEPAY_UPSTREAM_UNAVAILABLE'
        : 'EZONEPAY_CHECKOUT_FAILED';
    emitServerError('ezonepay checkout failed', error, {
      correlationId,
      route: '/api/v1/ezonepay/payment-links',
      publicCode,
    });
    return NextResponse.json(
      { error: publicCode },
      { status: 502, headers: { 'x-request-id': correlationId } },
    );
  }
}
