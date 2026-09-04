import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';
import { isActiveProfileStatus } from '@/lib/auth/user-status';
import { encryptStoreCode, fingerprintStoreCode } from '@/lib/store/store-code-crypto';

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const db = createPrivilegedSupabaseClient();
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  if (!profile || !isActiveProfileStatus(profile.status)) return null;

  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role)) return null;
  const canRead = checkPermission(role, 'providers.read') || checkPermission(role, 'payments.read');
  const canManage = checkPermission(role, 'providers.manage') || checkPermission(role, 'payments.manage');
  if (!canRead) return null;
  return { userId: data.user.id, role, canManage };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const db = createPrivilegedSupabaseClient();
  const { data, error } = await db
    .from('store_skus')
    .select('id,sku_code,title,inventory_mode,is_active,store_products!inner(id,name,sale_status)')
    .eq('inventory_mode', 'CODE_STOCK')
    .order('title');

  if (error) return NextResponse.json({ error: 'STORE_INVENTORY_UNAVAILABLE' }, { status: 503 });

  const skus = data || [];
  const skuIds = skus.map((sku) => sku.id);
  let codeRows: any[] = [];
  if (skuIds.length) {
    const result = await db.from('store_digital_codes').select('sku_id,status,expires_at,supplier_batch').in('sku_id', skuIds);
    if (result.error) return NextResponse.json({ error: 'STORE_INVENTORY_UNAVAILABLE' }, { status: 503 });
    codeRows = result.data || [];
  }

  const rows = skus.map((sku: any) => {
    const codes = codeRows.filter((code) => code.sku_id === sku.id);
    const available = codes.filter((code) => code.status === 'AVAILABLE' && (!code.expires_at || new Date(code.expires_at) > new Date())).length;
    const reserved = codes.filter((code) => code.status === 'RESERVED').length;
    const delivered = codes.filter((code) => code.status === 'DELIVERED').length;
    const voided = codes.filter((code) => code.status === 'VOID').length;
    return { ...sku, inventory: { available, reserved, delivered, voided, lowStock: available <= 5 } };
  });

  return NextResponse.json({ capabilities: { canManage: actor.canManage }, skus: rows });
}

export async function POST(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!actor.canManage) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    skuId?: string;
    codes?: string[];
    supplierBatch?: string;
    expiresAt?: string | null;
  } | null;

  const codes = Array.isArray(body?.codes)
    ? [...new Set(body!.codes.map((code) => String(code).trim()).filter(Boolean))]
    : [];

  if (!body?.skuId || codes.length < 1 || codes.length > 500) {
    return NextResponse.json({ error: 'INVALID_CODE_BATCH' }, { status: 400 });
  }

  const db = createPrivilegedSupabaseClient();
  const { data: sku, error: skuError } = await db
    .from('store_skus')
    .select('id,inventory_mode')
    .eq('id', body.skuId)
    .maybeSingle();

  if (skuError || !sku) return NextResponse.json({ error: 'STORE_SKU_NOT_FOUND' }, { status: 404 });
  if (sku.inventory_mode !== 'CODE_STOCK') return NextResponse.json({ error: 'STORE_SKU_NOT_CODE_STOCK' }, { status: 409 });

  const rows = codes.map((code) => ({
    sku_id: body.skuId,
    code_ciphertext: encryptStoreCode(code),
    code_fingerprint: fingerprintStoreCode(code),
    status: 'AVAILABLE',
    expires_at: body.expiresAt || null,
    supplier_batch: body.supplierBatch?.trim().slice(0, 120) || null,
    metadata: { imported_by: actor.userId },
  }));

  const { data: inserted, error: insertError } = await db
    .from('store_digital_codes')
    .upsert(rows, { onConflict: 'code_fingerprint', ignoreDuplicates: true })
    .select('id');

  if (insertError) return NextResponse.json({ error: 'STORE_CODE_IMPORT_FAILED' }, { status: 409 });

  await db.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action: 'ADMIN_IMPORTED_STORE_CODE_BATCH',
    resource: 'store_skus',
    resource_id: body.skuId,
    metadata: { requested_count: codes.length, inserted_count: inserted?.length || 0, supplier_batch: body.supplierBatch || null },
  });

  return NextResponse.json({ success: true, requested: codes.length, inserted: inserted?.length || 0 });
}
