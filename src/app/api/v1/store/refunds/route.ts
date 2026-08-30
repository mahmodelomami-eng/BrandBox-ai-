import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requestStoreRefund } from '@/lib/store/store-refund-service';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null) as { orderId?: string; reason?: string } | null;
  if (!body?.orderId || !body.reason) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

  try {
    const refund = await requestStoreRefund(data.user.id, body.orderId, body.reason);
    return NextResponse.json({ refund }, { status: 201 });
  } catch (refundError) {
    const code = refundError instanceof Error ? refundError.message : 'STORE_REFUND_FAILED';
    const status = code === 'STORE_ORDER_NOT_FOUND' ? 404 : code === 'STORE_ORDER_NOT_REFUNDABLE' ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
