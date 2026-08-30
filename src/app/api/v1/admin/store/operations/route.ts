import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';
import { processBrandBoxCreditFulfillmentForOrder } from '@/lib/store/store-credit-fulfillment';
import { decideStoreRefund } from '@/lib/store/store-refund-service';

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile } = await database
    .from('profiles')
    .select('id,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role)) return null;

  const canRead = checkPermission(role, 'payments.read') || checkPermission(role, 'providers.read');
  const canManage = checkPermission(role, 'payments.manage') || checkPermission(role, 'providers.manage');
  if (!canRead) return null;

  return { userId: data.user.id, role, canManage };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();

  const [ordersResult, jobsResult, productsResult, refundsResult, categoriesResult, providersResult] = await Promise.all([
    database
      .from('store_orders')
      .select('id,order_number,user_id,status,payment_status,total_lyd,currency,created_at,paid_at,fulfilled_at,store_order_items(id,product_name_snapshot,sku_title_snapshot,quantity,fulfillment_mode)')
      .order('created_at', { ascending: false })
      .limit(30),
    database
      .from('store_fulfillment_jobs')
      .select('id,order_item_id,status,attempt_count,last_error_code,last_error_message,next_retry_at,completed_at,created_at,store_order_items!inner(order_id,product_name_snapshot,sku_title_snapshot,fulfillment_mode)')
      .order('created_at', { ascending: false })
      .limit(50),
    database
      .from('store_products')
      .select('id,category_id,provider_id,slug,name,brand,short_description,fulfillment_mode,sale_status,requires_customer_identifier,supplier_authorization_verified,regional_validity_verified,automated_fulfillment_verified,store_skus(id,sku_code,title,sell_price_lyd,provider_cost,provider_cost_currency,region_code,is_active)')
      .order('name'),
    database
      .from('store_refunds')
      .select('id,order_id,amount_lyd,status,reason,requested_by,provider_reference,created_at,updated_at,store_orders!inner(order_number,user_id,payment_status,status)')
      .order('created_at', { ascending: false })
      .limit(50),
    database.from('store_categories').select('id,slug,name_ar,name_en,is_active,sort_order').order('sort_order'),
    database.from('store_providers').select('id,code,display_name,provider_type,status').order('display_name'),
  ]);

  if (ordersResult.error || jobsResult.error || productsResult.error || refundsResult.error || categoriesResult.error || providersResult.error) {
    return NextResponse.json({ error: 'STORE_OPERATIONS_UNAVAILABLE' }, { status: 503 });
  }

  const jobs = jobsResult.data || [];
  return NextResponse.json({
    capabilities: { canManage: actor.canManage },
    metrics: {
      orderCount: (ordersResult.data || []).length,
      pendingJobs: jobs.filter((job) => ['PENDING', 'PROCESSING'].includes(job.status)).length,
      failedJobs: jobs.filter((job) => job.status === 'FAILED').length,
      fulfilledJobs: jobs.filter((job) => job.status === 'SUCCEEDED').length,
      pendingRefunds: (refundsResult.data || []).filter((refund) => ['REQUESTED', 'REVIEWING'].includes(refund.status)).length,
    },
    orders: ordersResult.data || [],
    jobs,
    products: productsResult.data || [],
    refunds: refundsResult.data || [],
    categories: categoriesResult.data || [],
    providers: providersResult.data || [],
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!actor.canManage) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: string; jobId?: string; refundId?: string; note?: string; productId?: string; saleStatus?: string; supplierAuthorizationVerified?: boolean; regionalValidityVerified?: boolean; automatedFulfillmentVerified?: boolean; skuId?: string; sellPriceLyd?: number; providerCost?: number | null; regionCode?: string; isActive?: boolean } | null;
  if (!body?.action) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

  if (body.action === 'update_product') {
    const input = body as typeof body & { productId?: string; saleStatus?: string; supplierAuthorizationVerified?: boolean; regionalValidityVerified?: boolean; automatedFulfillmentVerified?: boolean };
    if (!input.productId) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

    const allowedStatuses = ['DRAFT', 'CATALOG_ONLY', 'ACTIVE_FOR_SALE', 'PAUSED', 'ARCHIVED'];
    if (!input.saleStatus || !allowedStatuses.includes(input.saleStatus)) {
      return NextResponse.json({ error: 'INVALID_SALE_STATUS' }, { status: 400 });
    }

    const { data: current } = await createPrivilegedSupabaseClient().from('store_products')
      .select('id,fulfillment_mode').eq('id', input.productId).maybeSingle();
    if (!current) return NextResponse.json({ error: 'STORE_PRODUCT_NOT_FOUND' }, { status: 404 });

    const gates = {
      supplier_authorization_verified: Boolean(input.supplierAuthorizationVerified),
      regional_validity_verified: Boolean(input.regionalValidityVerified),
      automated_fulfillment_verified: Boolean(input.automatedFulfillmentVerified),
    };
    if (input.saleStatus === 'ACTIVE_FOR_SALE' && (
      !gates.supplier_authorization_verified ||
      !gates.regional_validity_verified ||
      !gates.automated_fulfillment_verified ||
      ['PARTNER_REQUIRED', 'CATALOG_ONLY'].includes(current.fulfillment_mode)
    )) return NextResponse.json({ error: 'STORE_PRODUCT_SALE_GATE_FAILED' }, { status: 409 });

    const database = createPrivilegedSupabaseClient();
    const { data: product, error: productError } = await database.from('store_products').update({
      sale_status: input.saleStatus,
      ...gates,
      updated_at: new Date().toISOString(),
    }).eq('id', input.productId).select('*').single();
    if (productError || !product) return NextResponse.json({ error: 'STORE_PRODUCT_UPDATE_FAILED' }, { status: 409 });

    await database.from('audit_logs').insert({
      actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_UPDATED_STORE_PRODUCT_GATE',
      resource: 'store_products', resource_id: input.productId,
      metadata: { sale_status: input.saleStatus, ...gates },
    });
    return NextResponse.json({ success: true, product });
  }

  if (body.action === 'update_sku') {
    const input = body as typeof body & { skuId?: string; sellPriceLyd?: number; providerCost?: number | null; regionCode?: string; isActive?: boolean };
    const price = Number(input.sellPriceLyd);
    if (!input.skuId || !Number.isFinite(price) || price < 0 || !input.regionCode?.trim()) {
      return NextResponse.json({ error: 'INVALID_SKU_UPDATE' }, { status: 400 });
    }
    const providerCost = input.providerCost == null ? null : Number(input.providerCost);
    if (providerCost != null && (!Number.isFinite(providerCost) || providerCost < 0)) {
      return NextResponse.json({ error: 'INVALID_PROVIDER_COST' }, { status: 400 });
    }

    const database = createPrivilegedSupabaseClient();
    const { data: sku, error: skuError } = await database.from('store_skus').update({
      sell_price_lyd: price,
      provider_cost: providerCost,
      region_code: input.regionCode.trim().toUpperCase().slice(0, 32),
      is_active: Boolean(input.isActive),
      updated_at: new Date().toISOString(),
    }).eq('id', input.skuId).select('*').single();
    if (skuError || !sku) return NextResponse.json({ error: 'STORE_SKU_UPDATE_FAILED' }, { status: 409 });

    await database.from('audit_logs').insert({
      actor_id: actor.userId, actor_role: actor.role, action: 'ADMIN_UPDATED_STORE_SKU',
      resource: 'store_skus', resource_id: input.skuId,
      metadata: { sell_price_lyd: price, provider_cost: providerCost, region_code: input.regionCode, is_active: Boolean(input.isActive) },
    });
    return NextResponse.json({ success: true, sku });
  }

  if (body.action === 'approve_refund' || body.action === 'reject_refund') {
    if (!body.refundId) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    try {
      const refund = await decideStoreRefund(
        actor.userId,
        actor.role,
        body.refundId,
        body.action === 'approve_refund' ? 'APPROVED' : 'REJECTED',
        body.note,
      );
      return NextResponse.json({ success: true, refund });
    } catch (refundError) {
      return NextResponse.json({
        error: refundError instanceof Error ? refundError.message : 'STORE_REFUND_REVIEW_FAILED',
      }, { status: 409 });
    }
  }

  if (body.action !== 'retry_fulfillment' || !body.jobId) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: job, error } = await database
    .from('store_fulfillment_jobs')
    .select('id,status,order_item_id,store_order_items!inner(order_id,fulfillment_mode)')
    .eq('id', body.jobId)
    .maybeSingle();

  if (error || !job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
  if (job.status !== 'FAILED') return NextResponse.json({ error: 'JOB_NOT_RETRYABLE' }, { status: 409 });

  const item = Array.isArray(job.store_order_items) ? job.store_order_items[0] : job.store_order_items;
  if (!item || item.fulfillment_mode !== 'BRAND_BOX_CREDITS') {
    return NextResponse.json({ error: 'MANUAL_RETRY_NOT_SUPPORTED' }, { status: 400 });
  }

  await database.from('store_fulfillment_jobs').update({
    status: 'PENDING',
    last_error_code: null,
    last_error_message: null,
    next_retry_at: null,
    locked_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);

  try {
    const result = await processBrandBoxCreditFulfillmentForOrder(item.order_id);

    await database.from('audit_logs').insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: 'ADMIN_RETRIED_STORE_FULFILLMENT',
      resource: 'store_fulfillment_jobs',
      resource_id: job.id,
      metadata: { order_id: item.order_id, processed: result.processed },
    });

    return NextResponse.json({ success: true, processed: result.processed });
  } catch (retryError) {
    return NextResponse.json({
      error: retryError instanceof Error ? retryError.message : 'STORE_RETRY_FAILED',
    }, { status: 500 });
  }
}
