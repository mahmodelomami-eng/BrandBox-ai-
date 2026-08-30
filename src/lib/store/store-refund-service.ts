import { createPrivilegedSupabaseClient } from '../supabase/server';

export type StoreRefundDecision = 'APPROVED' | 'REJECTED';

export async function requestStoreRefund(userId: string, orderId: string, reason: string) {
  const database = createPrivilegedSupabaseClient();
  const normalizedReason = reason.trim();

  if (normalizedReason.length < 5 || normalizedReason.length > 1000) {
    throw new Error('STORE_REFUND_REASON_INVALID');
  }

  const { data: order, error: orderError } = await database
    .from('store_orders')
    .select('id,user_id,status,payment_status,total_lyd')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (orderError || !order) throw new Error('STORE_ORDER_NOT_FOUND');
  if (order.payment_status !== 'PAID' || !['FULFILLED', 'FULFILLMENT_PENDING', 'REVIEW_REQUIRED'].includes(order.status)) {
    throw new Error('STORE_ORDER_NOT_REFUNDABLE');
  }

  const { data: existing } = await database
    .from('store_refunds')
    .select('id,status')
    .eq('order_id', orderId)
    .in('status', ['REQUESTED', 'REVIEWING', 'APPROVED', 'PROCESSING'])
    .maybeSingle();

  if (existing) return existing;

  const { data: refund, error: refundError } = await database
    .from('store_refunds')
    .insert({
      order_id: orderId,
      amount_lyd: Number(order.total_lyd),
      status: 'REQUESTED',
      reason: normalizedReason,
      requested_by: userId,
    })
    .select('*')
    .single();

  if (refundError || !refund) throw new Error('STORE_REFUND_CREATE_FAILED');
  return refund;
}

export async function decideStoreRefund(
  actorId: string,
  actorRole: string,
  refundId: string,
  decision: StoreRefundDecision,
  note?: string,
) {
  const database = createPrivilegedSupabaseClient();

  const { data: refund, error } = await database
    .from('store_refunds')
    .select('id,order_id,status,amount_lyd')
    .eq('id', refundId)
    .maybeSingle();

  if (error || !refund) throw new Error('STORE_REFUND_NOT_FOUND');
  if (!['REQUESTED', 'REVIEWING'].includes(refund.status)) throw new Error('STORE_REFUND_STATE_INVALID');

  const { data: updated, error: updateError } = await database
    .from('store_refunds')
    .update({
      status: decision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', refundId)
    .in('status', ['REQUESTED', 'REVIEWING'])
    .select('*')
    .single();

  if (updateError || !updated) throw new Error('STORE_REFUND_UPDATE_FAILED');

  if (decision === 'APPROVED') {
    await database.from('store_orders').update({
      status: 'REVIEW_REQUIRED',
      updated_at: new Date().toISOString(),
    }).eq('id', refund.order_id).eq('payment_status', 'PAID');
  }

  await database.from('audit_logs').insert({
    actor_id: actorId,
    actor_role: actorRole,
    action: decision === 'APPROVED' ? 'ADMIN_APPROVED_STORE_REFUND' : 'ADMIN_REJECTED_STORE_REFUND',
    resource: 'store_refunds',
    resource_id: refundId,
    metadata: {
      order_id: refund.order_id,
      amount_lyd: refund.amount_lyd,
      note: note?.trim().slice(0, 500) || null,
      payment_refund_executed: false,
    },
  });

  return updated;
}
