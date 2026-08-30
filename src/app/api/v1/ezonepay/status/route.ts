import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { parseEzonePayOrderReference } from '@/lib/payments/ezonepay-order-reference';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const orderReference = request.nextUrl.searchParams.get('order') || '';
  const parsed = parseEzonePayOrderReference(orderReference);
  if (!parsed || parsed.userId !== user.id) {
    return NextResponse.json({ error: 'INVALID_ORDER_REFERENCE' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const [paymentResult, idempotencyResult] = await Promise.all([
    database
      .from('payment_transactions')
      .select('id,order_reference,provider_tx_id,amount_lyd,currency,status,item_type,metadata,created_at,updated_at')
      .eq('order_reference', orderReference)
      .eq('user_id', user.id)
      .maybeSingle(),
    database
      .from('payment_idempotency')
      .select('fulfillment_status,error_message,processed_at')
      .eq('order_reference', orderReference)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (paymentResult.error) return NextResponse.json({ error: 'PAYMENT_STATUS_UNAVAILABLE' }, { status: 503 });
  if (idempotencyResult.error) return NextResponse.json({ error: 'PAYMENT_STATUS_UNAVAILABLE' }, { status: 503 });

  const payment = paymentResult.data;
  const idem = idempotencyResult.data;

  if (!payment && !idem) {
    return NextResponse.json({
      orderReference,
      state: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      mode: 'sandbox',
    });
  }

  const paid = payment?.status === 'paid';
  const fulfilled = idem?.fulfillment_status === 'completed';

  let subscription = null;
  if (paid && parsed.itemType === 'subscription') {
    const result = await database
      .from('subscriptions')
      .select('id,plan_id,status,current_period_start,current_period_end')
      .eq('user_id', user.id)
      .contains('metadata', { order_reference: orderReference })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    subscription = result.data || null;
  }

  const { data: profile } = await database
    .from('profiles')
    .select('credit_balance')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    orderReference,
    state: paid && fulfilled ? 'completed' : idem?.fulfillment_status === 'failed' ? 'failed' : 'pending',
    paymentStatus: payment?.status || 'pending',
    fulfillmentStatus: idem?.fulfillment_status || 'pending',
    itemType: parsed.itemType,
    itemId: parsed.itemId,
    amountLYD: payment ? Number(payment.amount_lyd) : null,
    currency: payment?.currency || 'LYD',
    newBalance: profile?.credit_balance ?? null,
    subscription,
    errorMessage: idem?.error_message || null,
    mode: 'sandbox',
  });
}
