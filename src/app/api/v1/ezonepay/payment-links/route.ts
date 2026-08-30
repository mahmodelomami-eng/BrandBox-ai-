import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { EzonePayClient } from '@/lib/payments/ezonepay-client';
import { createEzonePayOrderReference } from '@/lib/payments/ezonepay-order-reference';

type CheckoutRequest = { itemType?: 'subscription' | 'purchase'; itemId?: string };

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { data: authData, error: authError } = await createServerSupabaseClient().auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
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
    const { data: profile, error: profileError } = await db.from('profiles').select('first_name,last_name,phone').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile?.first_name?.trim() || !profile?.last_name?.trim() || !profile?.phone?.trim()) {
      return NextResponse.json({ error: 'PAYMENT_PROFILE_INCOMPLETE', requiredFields: ['firstName', 'lastName', 'phone'] }, { status: 400 });
    }
    const orderReference = createEzonePayOrderReference({ userId: authData.user.id, itemType: body.itemType!, itemId: body.itemId });
    const payment = await EzonePayClient.createPaymentLink({ title: `BrandBox - ${String(item.name)}`, orderReference,
      internalReference: `${body.itemType}:${body.itemId}`, amount, redirectUrl: `${new URL(request.url).origin}/payment/result?order=${encodeURIComponent(orderReference)}`,
      customer: { firstName: profile.first_name.trim(), lastName: profile.last_name.trim(), phoneNumber: profile.phone.trim() } });
    return NextResponse.json({ paymentUrl: payment.link, paymentLinkId: payment.id, orderReference, mode: 'sandbox' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'EZONEPAY_CHECKOUT_FAILED';
    console.error('[ezonepay/payment-links] checkout failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: code,
      cause: error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined,
    });
    const publicCode = code.startsWith('EZONEPAY_')
      ? code
      : error instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)
        ? 'EZONEPAY_UPSTREAM_UNAVAILABLE'
        : 'EZONEPAY_CHECKOUT_FAILED';
    return NextResponse.json({ error: publicCode }, { status: 502 });
  }
}
