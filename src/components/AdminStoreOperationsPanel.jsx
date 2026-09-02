'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, PackageCheck, RefreshCw, RotateCcw, ShoppingBag } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import AdminStoreInventoryPanel from './AdminStoreInventoryPanel';
import AdminStoreLaunchReadinessPanel from './AdminStoreLaunchReadinessPanel';

function tone(status) {
  if (['FULFILLED', 'SUCCEEDED', 'PAID', 'ACTIVE_FOR_SALE'].includes(status)) return 'var(--bb-success)';
  if (['FAILED', 'CANCELLED'].includes(status)) return 'var(--bb-danger)';
  if (status === 'REVIEW_REQUIRED') return 'var(--bb-warning)';
  if (['PENDING', 'PROCESSING', 'PAYMENT_PENDING', 'FULFILLMENT_PENDING'].includes(status)) return 'var(--bb-warning)';
  return 'var(--bb-text-secondary)';
}

function GateBadge({ ok, children }) {
  const color = ok ? 'var(--bb-success)' : 'var(--bb-danger)';
  const background = ok ? 'var(--bb-success-soft)' : 'var(--bb-danger-soft)';
  return <span className="rounded-full border px-2 py-1 text-[9px] font-black" style={{ color, background, borderColor: `color-mix(in srgb, ${color} 24%, transparent)` }}>{ok ? '✓' : '×'} {children}</span>;
}

export default function AdminStoreOperationsPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل عمليات المتجر.');
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل عمليات المتجر.');
    } finally {
      setLoading(false);
    }
  }

  async function updateProvider(provider) {
    setBusy(provider.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_provider', providerId: provider.id, providerStatus: provider.status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث المورد.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث المورد.'); }
    finally { setBusy(''); }
  }

  async function updateMapping(mapping) {
    setBusy(mapping.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_provider_mapping',
          mappingId: mapping.id,
          mappingEnabled: mapping.is_enabled,
          externalProductId: mapping.external_product_id,
          externalSkuId: mapping.external_sku_id,
          providerRegion: mapping.provider_region,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث ربط المورد.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث ربط المورد.'); }
    finally { setBusy(''); }
  }

  function patchProvider(id, patch) {
    setPayload((current) => ({ ...current, providers: current.providers.map((provider) => provider.id === id ? { ...provider, ...patch } : provider) }));
  }

  function patchMapping(providerId, id, patch) {
    setPayload((current) => ({
      ...current,
      providers: current.providers.map((provider) => provider.id === providerId ? {
        ...provider,
        store_provider_products: (provider.store_provider_products || []).map((mapping) => mapping.id === id ? { ...mapping, ...patch } : mapping),
      } : provider),
    }));
  }

  async function updateProduct(product) {
    setBusy(product.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_product',
          productId: product.id,
          saleStatus: product.sale_status,
          supplierAuthorizationVerified: product.supplier_authorization_verified,
          regionalValidityVerified: product.regional_validity_verified,
          automatedFulfillmentVerified: product.automated_fulfillment_verified,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث المنتج.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث المنتج.'); }
    finally { setBusy(''); }
  }

  async function updateSku(sku) {
    setBusy(sku.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sku',
          skuId: sku.id,
          sellPriceLyd: Number(sku.sell_price_lyd),
          providerCost: sku.provider_cost == null || sku.provider_cost === '' ? null : Number(sku.provider_cost),
          regionCode: sku.region_code,
          isActive: sku.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث SKU.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث SKU.'); }
    finally { setBusy(''); }
  }

  function patchProduct(id, patch) {
    setPayload((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...patch } : product) }));
  }

  function patchSku(productId, skuId, patch) {
    setPayload((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? { ...product, store_skus: product.store_skus.map((sku) => sku.id === skuId ? { ...sku, ...patch } : sku) } : product) }));
  }

  async function reviewRefund(refundId, action) {
    setBusy(refundId); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, refundId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر مراجعة طلب الاسترداد.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر مراجعة طلب الاسترداد.'); }
    finally { setBusy(''); }
  }

  async function retry(jobId) {
    setBusy(jobId); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_fulfillment', jobId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر إعادة المحاولة.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إعادة المحاولة.'); }
    finally { setBusy(''); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && !payload) {
    return <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border"><div className="bb-text-tertiary flex items-center gap-2 text-sm"><Loader2 className="bb-text-accent animate-spin" size={18}/> جاري تحميل عمليات المتجر...</div></div>;
  }

  const metrics = payload?.metrics || {};
  const jobs = payload?.jobs || [];
  const orders = payload?.orders || [];
  const products = payload?.products || [];
  const refunds = payload?.refunds || [];
  const providers = payload?.providers || [];
  const canManage = Boolean(payload?.capabilities?.canManage);
  const inventoryBySku = payload?.inventoryBySku || {};
  const readinessByProduct = new Map((payload?.readiness || []).map((item) => [item.productId, item]));
  const readyProducts = (payload?.readiness || []).filter((item) => item.ready).length;

  return <div className="space-y-5">
    {error && <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-xs">{error}</div>}

    <AdminStoreLaunchReadinessPanel />

    <section className="bb-panel flex flex-col gap-4 rounded-3xl border p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
      <div><div className="bb-text-accent text-[10px] font-black tracking-[.2em]">STORE OPERATIONS</div><h2 className="mt-2 text-xl font-black">تشغيل ومتابعة Brand Box Store</h2><p className="bb-text-tertiary mt-2 text-xs leading-6">متابعة الطلبات ووظائف التفعيل وإعادة محاولة التفعيل الآمن للرصيد المملوك لـ Brand Box فقط.</p></div>
      <button onClick={() => void load()} disabled={loading} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OperationMetric icon={ShoppingBag} label="آخر الطلبات" value={metrics.orderCount || 0} tone="accent" />
      <OperationMetric icon={Loader2} label="تفعيل قيد التنفيذ" value={metrics.pendingJobs || 0} tone="warning" />
      <OperationMetric icon={AlertTriangle} label="عمليات فاشلة" value={metrics.failedJobs || 0} tone="danger" />
      <OperationMetric icon={PackageCheck} label="تفعيل ناجح" value={metrics.fulfilledJobs || 0} tone="success" />
    </div>

    <section className="bb-panel rounded-3xl border p-5">
      <h3 className="font-black">وظائف التفعيل</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[950px] text-right text-xs">
          <thead className="bb-text-tertiary bb-divider border-b"><tr><th className="p-3">الخدمة</th><th className="p-3">الحالة</th><th className="p-3">المحاولات</th><th className="p-3">الخطأ</th><th className="p-3">التاريخ</th><th className="p-3">الإجراء</th></tr></thead>
          <tbody className="divide-y divide-[var(--bb-border-subtle)]">{jobs.map((job) => {
            const item = Array.isArray(job.store_order_items) ? job.store_order_items[0] : job.store_order_items;
            const retryable = canManage && ['FAILED','REVIEW_REQUIRED'].includes(job.status) && (item?.fulfillment_mode === 'BRAND_BOX_CREDITS' || job.last_error_code === 'STORE_OUT_OF_STOCK');
            return <tr key={job.id}><td className="p-3"><div className="font-bold">{item?.product_name_snapshot || '—'}</div><div className="bb-text-disabled text-[10px]">{item?.sku_title_snapshot || '—'}</div></td><td className="p-3 font-black" style={{ color: tone(job.status) }}>{job.status}</td><td className="p-3">{job.attempt_count}</td><td className="bb-text-danger p-3">{job.last_error_code || '—'}</td><td className="bb-text-tertiary p-3">{new Date(job.created_at).toLocaleString('ar-LY')}</td><td className="p-3">{retryable ? <button disabled={busy === job.id} onClick={() => void retry(job.id)} className="bb-button-secondary rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-50"><RotateCcw size={13} className="ml-1 inline"/>إعادة المحاولة بعد المعالجة</button> : <span className="bb-text-disabled">—</span>}</td></tr>;
          })}</tbody>
        </table>
      </div>
      {!jobs.length && <div className="bb-text-tertiary py-8 text-center text-sm">لا توجد وظائف تفعيل حتى الآن.</div>}
    </section>

    <section className="bb-panel rounded-3xl border p-5">
      <h3 className="font-black">إدارة الموردين والربط</h3>
      <p className="bb-text-tertiary mt-1 text-[10px]">بيانات الربط غير السرية فقط. مفاتيح API لا تُخزن أو تُعرض هنا.</p>
      <div className="mt-4 space-y-3">{providers.map((provider) => <div key={provider.id} className="bb-card rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{provider.display_name}</div><div className="bb-text-tertiary text-[10px]">{provider.code} · {provider.provider_type}</div></div>
          <div className="flex gap-2"><select disabled={!canManage} value={provider.status} onChange={(event) => patchProvider(provider.id, { status: event.target.value })} className="bb-input rounded-lg border px-2 py-2 text-xs"><option>DRAFT</option><option>ACTIVE</option><option>PAUSED</option><option>DISABLED</option></select>{canManage && <button disabled={busy === provider.id} onClick={() => void updateProvider(provider)} className="bb-button-secondary rounded-lg border px-3 py-2 text-[10px] font-black">حفظ المورد</button>}</div>
        </div>
        <div className="mt-3 space-y-2">{(provider.store_provider_products || []).map((mapping) => <div key={mapping.id} className="bb-border-subtle grid gap-2 rounded-xl border p-3 md:grid-cols-5">
          <input disabled={!canManage} placeholder="External Product ID" value={mapping.external_product_id || ''} onChange={(event) => patchMapping(provider.id, mapping.id, { external_product_id: event.target.value })} className="bb-input rounded-lg border p-2 text-xs"/>
          <input disabled={!canManage} placeholder="External SKU ID" value={mapping.external_sku_id || ''} onChange={(event) => patchMapping(provider.id, mapping.id, { external_sku_id: event.target.value })} className="bb-input rounded-lg border p-2 text-xs"/>
          <input disabled={!canManage} placeholder="REGION" value={mapping.provider_region || ''} onChange={(event) => patchMapping(provider.id, mapping.id, { provider_region: event.target.value })} className="bb-input rounded-lg border p-2 text-xs"/>
          <label className="bb-text-secondary flex items-center gap-2 text-[10px]"><input disabled={!canManage} type="checkbox" checked={Boolean(mapping.is_enabled)} onChange={(event) => patchMapping(provider.id, mapping.id, { is_enabled: event.target.checked })}/>ربط مفعل</label>
          {canManage && <button disabled={busy === mapping.id} onClick={() => void updateMapping(mapping)} className="bb-button-secondary rounded-lg border px-2 py-2 text-[10px]">حفظ الربط</button>}
        </div>)}</div>
      </div>)}</div>
    </section>

    <AdminStoreInventoryPanel />

    <section className="bb-panel rounded-3xl border p-5">
      <h3 className="font-black">طلبات الاسترداد</h3>
      <p className="bb-text-tertiary mt-1 text-[10px]">الموافقة هنا إدارية فقط ولا تنفذ إعادة الأموال لدى مزود الدفع تلقائيًا.</p>
      <div className="mt-4 space-y-3">
        {refunds.map((refund) => {
          const order = Array.isArray(refund.store_orders) ? refund.store_orders[0] : refund.store_orders;
          const reviewable = canManage && ['REQUESTED', 'REVIEWING'].includes(refund.status);
          return <div key={refund.id} className="bb-card rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="bb-text-tertiary font-mono text-[10px]">{order?.order_number || refund.order_id}</div><div className="mt-1 text-xs font-black" style={{ color: tone(refund.status) }}>{refund.status}</div><div className="bb-text-secondary mt-2 max-w-2xl text-xs">{refund.reason || 'بدون سبب'}</div></div>
              <div className="text-left"><div className="font-black">{Number(refund.amount_lyd || 0).toLocaleString('ar-LY')} د.ل</div><div className="bb-text-tertiary mt-1 text-[10px]">{new Date(refund.created_at).toLocaleString('ar-LY')}</div></div>
            </div>
            {reviewable && <div className="bb-divider mt-4 flex gap-2 border-t pt-3"><button disabled={busy === refund.id} onClick={() => void reviewRefund(refund.id, 'approve_refund')} className="bb-button-secondary rounded-lg border px-3 py-2 text-xs font-black" style={{ color: 'var(--bb-success)' }}>موافقة للمراجعة المالية</button><button disabled={busy === refund.id} onClick={() => void reviewRefund(refund.id, 'reject_refund')} className="bb-button-secondary rounded-lg border px-3 py-2 text-xs font-black" style={{ color: 'var(--bb-danger)' }}>رفض</button></div>}
          </div>;
        })}
        {!refunds.length && <div className="bb-text-tertiary py-8 text-center text-sm">لا توجد طلبات استرداد.</div>}
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="bb-panel rounded-3xl border p-5"><h3 className="font-black">آخر الطلبات</h3><div className="mt-4 space-y-3">{orders.slice(0, 10).map((order) => <div key={order.id} className="bb-card rounded-2xl border p-4"><div className="flex justify-between gap-4"><div><div className="bb-text-tertiary font-mono text-[10px]">{order.order_number}</div><div className="mt-1 font-black" style={{ color: tone(order.status) }}>{order.status}</div></div><div className="text-left"><div className="font-black">{Number(order.total_lyd || 0).toLocaleString('ar-LY')} د.ل</div><div className="bb-text-tertiary mt-1 text-[10px]">{order.payment_status}</div></div></div></div>)}</div></div>
      <div className="bb-panel rounded-3xl border p-5">
        <div className="bb-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div><div className="font-black">جاهزية الكتالوج للبيع</div><div className="bb-text-tertiary mt-1 text-[10px]">لا تعتبر أي خدمة خارجية جاهزة حتى ينجح المورد والمنطقة والتفعيل والربط وSKU.</div></div><div className="text-left"><div className="bb-text-accent text-2xl font-black">{readyProducts}/{products.length}</div><div className="bb-text-tertiary text-[10px]">منتجات جاهزة</div></div></div>
        <h3 className="font-black">إدارة المنتجات والأسعار</h3><p className="bb-text-tertiary mt-1 text-[10px]">لا يمكن تفعيل البيع قبل اجتياز بوابات المورد والمنطقة والتفعيل الآلي.</p>
        <div className="mt-4 space-y-3">{products.map((product) => <ProductEditor key={product.id} product={product} canManage={canManage} busy={busy} inventoryBySku={inventoryBySku} readiness={readinessByProduct.get(product.id)} patchProduct={patchProduct} patchSku={patchSku} updateProduct={updateProduct} updateSku={updateSku} />)}</div>
      </div>
    </section>
  </div>;
}

function OperationMetric({ icon: Icon, label, value, tone: iconTone }) {
  const color = iconTone === 'success' ? 'var(--bb-success)' : iconTone === 'danger' ? 'var(--bb-danger)' : iconTone === 'warning' ? 'var(--bb-warning)' : 'var(--bb-accent)';
  return <div className="bb-card rounded-3xl border p-5"><Icon size={18} style={{ color }}/><div className="mt-4 text-2xl font-black">{Number(value || 0).toLocaleString('ar-LY')}</div><div className="bb-text-tertiary mt-1 text-[10px]">{label}</div></div>;
}

function ProductEditor({ product, canManage, busy, inventoryBySku, readiness, patchProduct, patchSku, updateProduct, updateSku }) {
  const labels = { supplierAuthorized: 'اعتماد المورد', regionVerified: 'صلاحية المنطقة', fulfillmentVerified: 'اختبار التفعيل', providerActive: 'المورد نشط', activeSku: 'SKU نشط', providerMapping: 'ربط المورد', sellableMode: 'نمط قابل للبيع' };
  return <div className="bb-card rounded-2xl border p-4">
    <div className="flex flex-wrap justify-between gap-3">
      <div><div className="font-black">{product.name}</div><div className="bb-text-tertiary mt-1 text-[10px]">{product.fulfillment_mode}</div>{readiness && <div className="mt-2 flex flex-wrap gap-1">{Object.entries(readiness.checks).map(([key, ok]) => <GateBadge key={key} ok={ok}>{labels[key] || key}</GateBadge>)}</div>}</div>
      <select disabled={!canManage} value={product.sale_status} onChange={(event) => patchProduct(product.id, { sale_status: event.target.value })} className="bb-input rounded-lg border px-2 py-1 text-xs"><option>DRAFT</option><option>CATALOG_ONLY</option><option>ACTIVE_FOR_SALE</option><option>PAUSED</option><option>ARCHIVED</option></select>
    </div>
    <div className="bb-text-secondary mt-3 flex flex-wrap gap-3 text-[10px]">{[['supplier_authorization_verified','مورد معتمد'],['regional_validity_verified','منطقة صالحة'],['automated_fulfillment_verified','تفعيل آلي']].map(([key, label]) => <label key={key} className="flex items-center gap-1"><input disabled={!canManage} type="checkbox" checked={Boolean(product[key])} onChange={(event) => patchProduct(product.id, { [key]: event.target.checked })}/>{label}</label>)}</div>
    {canManage && <button disabled={busy === product.id} onClick={() => void updateProduct(product)} className="bb-button-secondary mt-3 rounded-lg border px-3 py-2 text-[10px] font-black">حفظ بوابات المنتج</button>}
    <div className="mt-4 space-y-2">{(product.store_skus || []).map((sku) => <div key={sku.id} className="bb-border-subtle grid gap-2 rounded-xl border p-3 sm:grid-cols-5">
      <div><div className="bb-text-disabled text-[10px]">SKU</div><div className="text-xs font-bold">{sku.title}</div>{sku.inventory_mode === 'CODE_STOCK' && <div className="mt-1 flex flex-wrap gap-1 text-[9px]"><span style={{ color: 'var(--bb-success)' }}>متاح {inventoryBySku[sku.id]?.available || 0}</span><span className="bb-text-warning">محجوز {inventoryBySku[sku.id]?.reserved || 0}</span><span className="bb-text-tertiary">مُسلّم {inventoryBySku[sku.id]?.delivered || 0}</span></div>}{sku.provider_cost != null && <div className="bb-text-tertiary mt-1 text-[10px]">هامش تقريبي: <span style={{ color: Number(sku.sell_price_lyd) - Number(sku.provider_cost) >= 0 ? 'var(--bb-success)' : 'var(--bb-danger)' }}>{(Number(sku.sell_price_lyd) - Number(sku.provider_cost)).toLocaleString('ar-LY')} د.ل</span></div>}</div>
      <label className="bb-text-tertiary text-[10px]">سعر البيع د.ل<input disabled={!canManage} value={sku.sell_price_lyd} onChange={(event) => patchSku(product.id, sku.id, { sell_price_lyd: event.target.value })} className="bb-input mt-1 w-full rounded-lg border p-2"/></label>
      <label className="bb-text-tertiary text-[10px]">تكلفة المورد<input disabled={!canManage} value={sku.provider_cost ?? ''} onChange={(event) => patchSku(product.id, sku.id, { provider_cost: event.target.value })} className="bb-input mt-1 w-full rounded-lg border p-2"/></label>
      <label className="bb-text-tertiary text-[10px]">المنطقة<input disabled={!canManage} value={sku.region_code} onChange={(event) => patchSku(product.id, sku.id, { region_code: event.target.value })} className="bb-input mt-1 w-full rounded-lg border p-2"/></label>
      <div className="flex items-end gap-2"><label className="bb-text-secondary flex items-center gap-1 text-[10px]"><input disabled={!canManage} type="checkbox" checked={Boolean(sku.is_active)} onChange={(event) => patchSku(product.id, sku.id, { is_active: event.target.checked })}/>نشط</label>{canManage && <button disabled={busy === sku.id} onClick={() => void updateSku(sku)} className="bb-button-secondary rounded-lg border px-2 py-2 text-[10px]">حفظ</button>}</div>
    </div>)}</div>
  </div>;
}
