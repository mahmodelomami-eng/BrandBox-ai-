import { createPrivilegedSupabaseClient } from '../supabase/server';
import type { CreateStoreOrderInput, StoreCatalogProduct } from './types';

function assertUuidLike(value: string, label: string) {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) {
    throw new Error(`STORE_VALIDATION_ERROR: ${label} is invalid.`);
  }
}

function normalizeQuantity(quantity?: number) {
  const q = quantity ?? 1;
  if (!Number.isInteger(q) || q < 1 || q > 20) {
    throw new Error('STORE_VALIDATION_ERROR: quantity must be an integer between 1 and 20.');
  }
  return q;
}

export async function listStoreCatalog(): Promise<StoreCatalogProduct[]> {
  const supabase = createPrivilegedSupabaseClient();
  const { data, error } = await supabase
    .from('store_products')
    .select(`
      id,
      slug,
      name,
      brand,
      short_description,
      image_url,
      fulfillment_mode,
      sale_status,
      store_categories (slug, name_ar, name_en),
      store_skus (
        id,
        sku_code,
        title,
        duration_days,
        face_value,
        face_value_currency,
        sell_price_lyd,
        region_code,
        inventory_mode,
        is_active
      )
    `)
    .in('sale_status', ['CATALOG_ONLY', 'ACTIVE_FOR_SALE'])
    .order('name');

  if (error) throw new Error(`STORE_CATALOG_ERROR: ${error.message}`);

  return ((data ?? []) as unknown as StoreCatalogProduct[]).map((product) => ({
    ...product,
    store_skus: (product.store_skus ?? []).filter((sku) => sku.is_active),
  }));
}

/**
 * Creates an order using the current DB price. Client-supplied price is intentionally
 * unsupported. Payment initiation should use the returned total_lyd/order_number.
 */
export async function createStoreOrder(input: CreateStoreOrderInput) {
  assertUuidLike(input.userId, 'userId');
  assertUuidLike(input.skuId, 'skuId');
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new Error('STORE_VALIDATION_ERROR: idempotencyKey is required.');
  }

  const quantity = normalizeQuantity(input.quantity);
  const supabase = createPrivilegedSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from('store_orders')
    .select('*')
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();

  if (existingError) throw new Error(`STORE_ORDER_LOOKUP_ERROR: ${existingError.message}`);
  if (existing) return existing;

  const { data: sku, error: skuError } = await supabase
    .from('store_skus')
    .select(`
      id,
      title,
      sell_price_lyd,
      is_active,
      store_products!inner (
        id,
        name,
        sale_status,
        fulfillment_mode,
        requires_customer_identifier
      )
    `)
    .eq('id', input.skuId)
    .eq('is_active', true)
    .single();

  if (skuError || !sku) throw new Error('STORE_SKU_UNAVAILABLE');

  const product = Array.isArray((sku as any).store_products)
    ? (sku as any).store_products[0]
    : (sku as any).store_products;

  if (!product || product.sale_status !== 'ACTIVE_FOR_SALE') {
    throw new Error('STORE_PRODUCT_NOT_FOR_SALE');
  }

  if (product.requires_customer_identifier && !input.customerIdentifier?.trim()) {
    throw new Error('STORE_CUSTOMER_IDENTIFIER_REQUIRED');
  }

  const unitPrice = Number((sku as any).sell_price_lyd);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('STORE_PRICE_CONFIGURATION_ERROR');

  const subtotal = Number((unitPrice * quantity).toFixed(3));
  const orderNumber = `BBS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const { data: order, error: orderError } = await supabase
    .from('store_orders')
    .insert({
      user_id: input.userId,
      order_number: orderNumber,
      status: 'PAYMENT_PENDING',
      payment_status: 'PENDING',
      currency: 'LYD',
      subtotal_lyd: subtotal,
      discount_lyd: 0,
      total_lyd: subtotal,
      idempotency_key: input.idempotencyKey,
    })
    .select('*')
    .single();

  if (orderError || !order) throw new Error(`STORE_ORDER_CREATE_ERROR: ${orderError?.message ?? 'unknown'}`);

  const { error: itemError } = await supabase.from('store_order_items').insert({
    order_id: order.id,
    sku_id: input.skuId,
    product_name_snapshot: product.name,
    sku_title_snapshot: (sku as any).title,
    quantity,
    unit_price_lyd: unitPrice,
    line_total_lyd: subtotal,
    fulfillment_mode: product.fulfillment_mode,
    customer_identifier: input.customerIdentifier?.trim() || null,
  });

  if (itemError) {
    await supabase.from('store_orders').delete().eq('id', order.id);
    throw new Error(`STORE_ORDER_ITEM_CREATE_ERROR: ${itemError.message}`);
  }

  return order;
}

/** Called only after a server-verified payment event. */
export async function markStoreOrderPaid(orderId: string, paymentReference: string) {
  assertUuidLike(orderId, 'orderId');
  if (!paymentReference) throw new Error('STORE_PAYMENT_REFERENCE_REQUIRED');

  const supabase = createPrivilegedSupabaseClient();

  const { data: order, error } = await supabase
    .from('store_orders')
    .select('id,status,payment_status')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('STORE_ORDER_NOT_FOUND');
  if (order.payment_status === 'PAID') return order;
  if (['CANCELLED', 'REFUNDED'].includes(order.payment_status)) {
    throw new Error('STORE_ORDER_PAYMENT_STATE_INVALID');
  }

  const { data: updated, error: updateError } = await supabase
    .from('store_orders')
    .update({
      payment_status: 'PAID',
      status: 'FULFILLMENT_PENDING',
      payment_reference: paymentReference,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .neq('payment_status', 'PAID')
    .select('*')
    .single();

  if (updateError || !updated) throw new Error(`STORE_PAYMENT_UPDATE_ERROR: ${updateError?.message ?? 'unknown'}`);

  const { data: items, error: itemsError } = await supabase
    .from('store_order_items')
    .select('id')
    .eq('order_id', orderId);

  if (itemsError) throw new Error(`STORE_ORDER_ITEMS_ERROR: ${itemsError.message}`);

  for (const item of items ?? []) {
    await supabase.from('store_fulfillment_jobs').upsert(
      {
        order_item_id: item.id,
        status: 'PENDING',
        idempotency_key: `store-fulfill:${item.id}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
  }

  return updated;
}
