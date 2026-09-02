import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createStoreOrder } from '@/lib/store/store-service';
import { createStorePaymentReference } from '@/lib/store/store-payment-reference';
import { EzonePayClient } from '@/lib/payments/ezonepay-client';

function appOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('STORE_APP_URL_INVALID');
    return url.origin;
  }
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateActiveUser(request);
    if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const { user } = auth;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.skuId !== 'string' || typeof body.idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'INVALID_CHECKOUT_REQUEST' }, { status: 400 });
    }

    const order = await createStoreOrder({
      userId: user.id,
      skuId: body.skuId,
      quantity: typeof body.quantity === 'number' ? body.quantity : 1,
      customerIdentifier: typeof body.customerIdentifier === 'string' ? body.customerIdentifier : undefined,
      idempotencyKey: body.idempotencyKey,
    });

    const orderReference = createStorePaymentReference({ userId: user.id, orderId: order.id });
    const redirectUrl = `${appOrigin(request)}/store/purchases?order=${encodeURIComponent(order.id)}`;
    const payment = await EzonePayClient.createPaymentLink({
      title: `Brand Box Store ${order.order_number}`,
      orderReference,
      internalReference: order.id,
      amount: Number(order.total_lyd),
      redirectUrl,
    });

    const { error: updateError } = await createPrivilegedSupabaseClient()
      .from('store_orders')
      .update({
        payment_provider: 'EZONEPAY',
        payment_reference: orderReference,
        customer_data: { ezonepay_payment_link_id: payment.id },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('user_id', user.id);

    if (updateError) throw new Error(`STORE_PAYMENT_LINK_PERSIST_FAILED: ${updateError.message}`);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      amountLYD: Number(order.total_lyd),
      paymentUrl: payment.link,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'STORE_CHECKOUT_FAILED';
    const clientErrors = [
      'STORE_SKU_UNAVAILABLE',
      'STORE_PRODUCT_NOT_FOR_SALE',
      'STORE_CUSTOMER_IDENTIFIER_REQUIRED',
      'STORE_OUT_OF_STOCK',
      'STORE_VALIDATION_ERROR',
    ];
    let status = 500;
    if (message.includes('STORE_IDEMPOTENCY_KEY_CONFLICT')) status = 409;
    else if (clientErrors.some((code) => message.includes(code))) status = 400;
    return NextResponse.json({ error: status < 500 ? message : 'STORE_CHECKOUT_FAILED' }, { status });
  }
}
