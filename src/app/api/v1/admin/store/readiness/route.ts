import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';
import { getEzonePayRuntimeStatus } from '@/lib/payments/ezonepay-mode';

async function authorize(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const db = createPrivilegedSupabaseClient();
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  if (!profile || profile.status === 'suspended') return null;

  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role)) return null;
  if (!checkPermission(role, 'payments.read') && !checkPermission(role, 'providers.read')) return null;
  return { userId: data.user.id, role };
}

export async function GET(request: NextRequest) {
  const actor = await authorize(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const db = createPrivilegedSupabaseClient();
  const [productsR, jobsR, refundsR, codesR] = await Promise.all([
    db.from('store_products').select('id,name,sale_status,fulfillment_mode,supplier_authorization_verified,regional_validity_verified,automated_fulfillment_verified,store_skus(id,is_active,inventory_mode)'),
    db.from('store_fulfillment_jobs').select('id,status,last_error_code').in('status', ['FAILED','REVIEW_REQUIRED','PROCESSING','PENDING']),
    db.from('store_refunds').select('id,status').in('status', ['REQUESTED','REVIEWING','APPROVED','PROCESSING']),
    db.from('store_digital_codes').select('sku_id,status,expires_at'),
  ]);

  if (productsR.error || jobsR.error || refundsR.error || codesR.error) {
    return NextResponse.json({ error: 'STORE_READINESS_UNAVAILABLE' }, { status: 503 });
  }

  const products = productsR.data || [];
  const jobs = jobsR.data || [];
  const refunds = refundsR.data || [];
  const codes = codesR.data || [];
  const ezone = getEzonePayRuntimeStatus();

  const activeProducts = products.filter((p) => p.sale_status === 'ACTIVE_FOR_SALE');
  const invalidActiveProducts = activeProducts.filter((p) => {
    const activeSkus = (p.store_skus || []).filter((sku) => sku.is_active);
    return !p.supplier_authorization_verified || !p.regional_validity_verified || !p.automated_fulfillment_verified || !activeSkus.length;
  });

  const codeStockSkus = products.flatMap((p) => (p.store_skus || []).filter((sku) => sku.inventory_mode === 'CODE_STOCK' && sku.is_active));
  const now = Date.now();
  const lowStock = codeStockSkus.map((sku) => {
    const available = codes.filter((code) => code.sku_id === sku.id && code.status === 'AVAILABLE' && (!code.expires_at || new Date(code.expires_at).getTime() > now)).length;
    return { skuId: sku.id, available };
  }).filter((row) => row.available <= 5);

  const blockers = [
    ...(invalidActiveProducts.length ? [{ code: 'ACTIVE_PRODUCT_GATE_INVALID', count: invalidActiveProducts.length, label: 'منتجات مفعلة لا تجتاز بوابات البيع' }] : []),
    ...(jobs.some((job) => job.status === 'FAILED') ? [{ code: 'FAILED_FULFILLMENT_JOBS', count: jobs.filter((job) => job.status === 'FAILED').length, label: 'عمليات تفعيل فاشلة تحتاج معالجة' }] : []),
  ];

  const warnings = [
    ...(!process.env.STORE_CODE_ENCRYPTION_KEY && codeStockSkus.length ? [{ code: 'STORE_CODE_ENCRYPTION_KEY_MISSING', count: 1, label: 'مفتاح تشفير مخزون الأكواد غير مضبوط' }] : []),
    ...(lowStock.length ? [{ code: 'LOW_DIGITAL_STOCK', count: lowStock.length, label: 'SKU رقمية بمخزون منخفض' }] : []),
    ...(refunds.length ? [{ code: 'OPEN_REFUNDS', count: refunds.length, label: 'طلبات استرداد مفتوحة' }] : []),
    ...(ezone.mode === 'sandbox' ? [{ code: 'EZONE_SANDBOX', count: 1, label: 'Ezone Pay ما زال في الوضع التجريبي' }] : []),
  ];

  return NextResponse.json({
    status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready',
    blockers,
    warnings,
    metrics: {
      activeProducts: activeProducts.length,
      failedJobs: jobs.filter((job) => job.status === 'FAILED').length,
      pendingJobs: jobs.filter((job) => ['PENDING','PROCESSING'].includes(job.status)).length,
      openRefunds: refunds.length,
      lowStockSkus: lowStock.length,
      codeEncryptionConfigured: Boolean(process.env.STORE_CODE_ENCRYPTION_KEY),
      ezoneMode: ezone.mode,
    },
  });
}
