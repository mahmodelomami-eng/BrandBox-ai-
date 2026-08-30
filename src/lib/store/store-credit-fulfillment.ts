import { createPrivilegedSupabaseClient } from '../supabase/server';

type RpcRow = {
  success?: boolean;
  new_balance?: number;
  transaction_id?: string;
  message?: string;
};

export async function processBrandBoxCreditFulfillmentForOrder(orderId: string) {
  const database = createPrivilegedSupabaseClient();

  const { data: order, error: orderError } = await database
    .from('store_orders')
    .select('id,user_id,status,payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) throw new Error('STORE_ORDER_NOT_FOUND');
  if (order.payment_status !== 'PAID') throw new Error('STORE_ORDER_NOT_PAID');

  const { data: items, error: itemsError } = await database
    .from('store_order_items')
    .select('id,sku_id,quantity,fulfillment_mode')
    .eq('order_id', orderId);

  if (itemsError) throw new Error(`STORE_ORDER_ITEMS_ERROR: ${itemsError.message}`);

  let processed = 0;

  for (const item of items ?? []) {
    if (item.fulfillment_mode !== 'BRAND_BOX_CREDITS') continue;

    const { data: job, error: jobError } = await database
      .from('store_fulfillment_jobs')
      .select('id,status,idempotency_key')
      .eq('order_item_id', item.id)
      .maybeSingle();

    if (jobError || !job) throw new Error('STORE_FULFILLMENT_JOB_NOT_FOUND');
    if (job.status === 'SUCCEEDED') {
      processed += 1;
      continue;
    }

    const { data: sku, error: skuError } = await database
      .from('store_skus')
      .select('metadata')
      .eq('id', item.sku_id)
      .maybeSingle();

    if (skuError || !sku) throw new Error('STORE_SKU_UNAVAILABLE');

    const creditsPerUnit = Number((sku.metadata as Record<string, unknown> | null)?.brand_box_credits ?? 0);
    const quantity = Number(item.quantity || 1);
    const credits = creditsPerUnit * quantity;

    if (!Number.isInteger(credits) || credits <= 0) {
      await database.from('store_fulfillment_jobs').update({
        status: 'FAILED',
        last_error_code: 'STORE_CREDIT_SKU_INVALID',
        last_error_message: 'Brand Box credit amount is missing or invalid.',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id);
      throw new Error('STORE_CREDIT_SKU_INVALID');
    }

    await database.from('store_fulfillment_jobs').update({
      status: 'PROCESSING',
      attempt_count: 1,
      locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).in('status', ['PENDING', 'FAILED']);

    const { data: rpcData, error: rpcError } = await database.rpc('grant_credits_idempotent', {
      p_user_id: order.user_id,
      p_amount: credits,
      p_description: `Brand Box Store credit fulfillment (${order.id})`,
      p_reference_type: 'store_order',
      p_reference_id: order.id,
      p_idempotency_key: `store-credits:${item.id}`,
      p_actor_id: order.user_id,
      p_tx_type: 'purchase',
    });

    if (rpcError) {
      await database.from('store_fulfillment_jobs').update({
        status: 'FAILED',
        last_error_code: 'STORE_CREDIT_GRANT_FAILED',
        last_error_message: rpcError.message,
        updated_at: new Date().toISOString(),
      }).eq('id', job.id);
      throw new Error(`STORE_CREDIT_GRANT_FAILED: ${rpcError.message}`);
    }

    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcRow | null;
    if (!row?.success) {
      await database.from('store_fulfillment_jobs').update({
        status: 'FAILED',
        last_error_code: 'STORE_CREDIT_GRANT_INVALID_RESPONSE',
        last_error_message: row?.message || 'Credit RPC returned an invalid response.',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id);
      throw new Error('STORE_CREDIT_GRANT_INVALID_RESPONSE');
    }

    await database.from('store_fulfillment_jobs').update({
      status: 'SUCCEEDED',
      external_reference: row.transaction_id || `credits:${item.id}`,
      completed_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', job.id);

    await database.from('store_entitlements').upsert({
      user_id: order.user_id,
      order_item_id: item.id,
      entitlement_type: 'CREDITS',
      status: 'ACTIVE',
      external_reference: row.transaction_id || null,
      delivery_payload: {
        credits_granted: credits,
        new_balance: row.new_balance ?? null,
      },
      starts_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'order_item_id' });

    processed += 1;
  }

  const { data: outstanding, error: outstandingError } = await database
    .from('store_fulfillment_jobs')
    .select('id,status,store_order_items!inner(order_id)')
    .eq('store_order_items.order_id', orderId)
    .neq('status', 'SUCCEEDED');

  if (outstandingError) throw new Error(`STORE_FULFILLMENT_STATUS_ERROR: ${outstandingError.message}`);

  if ((outstanding ?? []).length === 0 && (items ?? []).length > 0) {
    await database.from('store_orders').update({
      status: 'FULFILLED',
      fulfilled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', orderId).eq('payment_status', 'PAID');
  }

  return { processed };
}
