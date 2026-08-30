'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, RefreshCw, RotateCcw, ShoppingBag } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function tone(status) {
  if (['FULFILLED', 'SUCCEEDED', 'PAID', 'ACTIVE_FOR_SALE'].includes(status)) return 'text-emerald-300';
  if (['FAILED', 'CANCELLED'].includes(status)) return 'text-red-300';
  if (['PENDING', 'PROCESSING', 'PAYMENT_PENDING', 'FULFILLMENT_PENDING'].includes(status)) return 'text-amber-300';
  return 'text-gray-400';
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
      const accessToken=await token(); if(!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response=await fetch('/api/v1/admin/store/operations',{method:'PATCH',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({action:'update_provider',providerId:provider.id,providerStatus:provider.status})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error||'تعذر تحديث المورد.'); await load();
    } catch(err){setError(err instanceof Error?err.message:'تعذر تحديث المورد.');} finally{setBusy('');}
  }
  async function updateMapping(mapping) {
    setBusy(mapping.id); setError('');
    try {
      const accessToken=await token(); if(!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response=await fetch('/api/v1/admin/store/operations',{method:'PATCH',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({action:'update_provider_mapping',mappingId:mapping.id,mappingEnabled:mapping.is_enabled,externalProductId:mapping.external_product_id,externalSkuId:mapping.external_sku_id,providerRegion:mapping.provider_region})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error||'تعذر تحديث ربط المورد.'); await load();
    } catch(err){setError(err instanceof Error?err.message:'تعذر تحديث ربط المورد.');} finally{setBusy('');}
  }
  function patchProvider(id,patch){setPayload((current)=>({...current,providers:current.providers.map((p)=>p.id===id?{...p,...patch}:p)}));}
  function patchMapping(providerId,id,patch){setPayload((current)=>({...current,providers:current.providers.map((p)=>p.id===providerId?{...p,store_provider_products:(p.store_provider_products||[]).map((m)=>m.id===id?{...m,...patch}:m)}:p)}));}

  async function updateProduct(product) {
    setBusy(product.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_product', productId: product.id, saleStatus: product.sale_status,
          supplierAuthorizationVerified: product.supplier_authorization_verified,
          regionalValidityVerified: product.regional_validity_verified,
          automatedFulfillmentVerified: product.automated_fulfillment_verified }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث المنتج.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث المنتج.'); } finally { setBusy(''); }
  }

  async function updateSku(sku) {
    setBusy(sku.id); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_sku', skuId: sku.id, sellPriceLyd: Number(sku.sell_price_lyd),
          providerCost: sku.provider_cost == null || sku.provider_cost === '' ? null : Number(sku.provider_cost),
          regionCode: sku.region_code, isActive: sku.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث SKU.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث SKU.'); } finally { setBusy(''); }
  }

  function patchProduct(id, patch) {
    setPayload((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...patch } : product) }));
  }
  function patchSku(productId, skuId, patch) {
    setPayload((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? { ...product, store_skus: product.store_skus.map((sku) => sku.id === skuId ? { ...sku, ...patch } : sku) } : product) }));
  }

  async function reviewRefund(refundId, action) {
    setBusy(refundId);
    setError('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر مراجعة طلب الاسترداد.');
    } finally {
      setBusy('');
    }
  }

  async function retry(jobId) {
    setBusy(jobId);
    setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/operations', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'retry_fulfillment', jobId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر إعادة المحاولة.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة المحاولة.');
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && !payload) {
    return <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin text-[#f31325]" size={18}/> جاري تحميل عمليات المتجر...</div></div>;
  }

  const metrics = payload?.metrics || {};
  const jobs = payload?.jobs || [];
  const orders = payload?.orders || [];
  const products = payload?.products || [];
  const refunds = payload?.refunds || [];
  const providers = payload?.providers || [];
  const canManage = Boolean(payload?.capabilities?.canManage);
  const readinessByProduct = new Map((payload?.readiness || []).map((item) => [item.productId, item]));
  const readyProducts = (payload?.readiness || []).filter((item) => item.ready).length;

  return <div className="space-y-5">
    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}

    <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
      <div><div className="text-[10px] font-black tracking-[.2em] text-[#ff3344]">STORE OPERATIONS</div><h2 className="mt-2 text-xl font-black">تشغيل ومتابعة Brand Box Store</h2><p className="mt-2 text-xs leading-6 text-gray-500">متابعة الطلبات ووظائف التفعيل وإعادة محاولة التفعيل الآمن للرصيد المملوك لـ Brand Box فقط.</p></div>
      <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><ShoppingBag size={18} className="text-[#ff3344]"/><div className="mt-4 text-2xl font-black">{Number(metrics.orderCount || 0).toLocaleString('ar-LY')}</div><div className="mt-1 text-[10px] text-gray-500">آخر الطلبات</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><Loader2 size={18} className="text-amber-300"/><div className="mt-4 text-2xl font-black">{Number(metrics.pendingJobs || 0).toLocaleString('ar-LY')}</div><div className="mt-1 text-[10px] text-gray-500">تفعيل قيد التنفيذ</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><AlertTriangle size={18} className="text-red-300"/><div className="mt-4 text-2xl font-black">{Number(metrics.failedJobs || 0).toLocaleString('ar-LY')}</div><div className="mt-1 text-[10px] text-gray-500">عمليات فاشلة</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><PackageCheck size={18} className="text-emerald-300"/><div className="mt-4 text-2xl font-black">{Number(metrics.fulfilledJobs || 0).toLocaleString('ar-LY')}</div><div className="mt-1 text-[10px] text-gray-500">تفعيل ناجح</div></div>
    </div>

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
      <h3 className="font-black">وظائف التفعيل</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[950px] text-right text-xs">
          <thead className="border-b border-white/10 text-gray-500"><tr><th className="p-3">الخدمة</th><th className="p-3">الحالة</th><th className="p-3">المحاولات</th><th className="p-3">الخطأ</th><th className="p-3">التاريخ</th><th className="p-3">الإجراء</th></tr></thead>
          <tbody className="divide-y divide-white/[.06]">{jobs.map((job) => {
            const item = Array.isArray(job.store_order_items) ? job.store_order_items[0] : job.store_order_items;
            const retryable = canManage && job.status === 'FAILED' && item?.fulfillment_mode === 'BRAND_BOX_CREDITS';
            return <tr key={job.id}><td className="p-3"><div className="font-bold">{item?.product_name_snapshot || '—'}</div><div className="text-[10px] text-gray-600">{item?.sku_title_snapshot || '—'}</div></td><td className={`p-3 font-black ${tone(job.status)}`}>{job.status}</td><td className="p-3">{job.attempt_count}</td><td className="p-3 text-red-300">{job.last_error_code || '—'}</td><td className="p-3 text-gray-500">{new Date(job.created_at).toLocaleString('ar-LY')}</td><td className="p-3">{retryable ? <button disabled={busy === job.id} onClick={() => void retry(job.id)} className="rounded-lg border border-amber-500/20 px-3 py-2 text-amber-300 disabled:opacity-50"><RotateCcw size={13} className="ml-1 inline"/>إعادة المحاولة</button> : <span className="text-gray-700">—</span>}</td></tr>;
          })}</tbody>
        </table>
      </div>
      {!jobs.length && <div className="py-8 text-center text-sm text-gray-500">لا توجد وظائف تفعيل حتى الآن.</div>}
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
      <h3 className="font-black">إدارة الموردين والربط</h3>
      <p className="mt-1 text-[10px] text-gray-500">بيانات الربط غير السرية فقط. مفاتيح API لا تُخزن أو تُعرض هنا.</p>
      <div className="mt-4 space-y-3">{providers.map((provider)=><div key={provider.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{provider.display_name}</div><div className="text-[10px] text-gray-500">{provider.code} · {provider.provider_type}</div></div>
        <div className="flex gap-2"><select disabled={!canManage} value={provider.status} onChange={(e)=>patchProvider(provider.id,{status:e.target.value})} className="rounded-lg border border-white/10 bg-[#090b10] px-2 py-2 text-xs"><option>DRAFT</option><option>ACTIVE</option><option>PAUSED</option><option>DISABLED</option></select>{canManage&&<button disabled={busy===provider.id} onClick={()=>void updateProvider(provider)} className="rounded-lg border border-[#ff3344]/30 px-3 py-2 text-[10px] font-black text-[#ff5967]">حفظ المورد</button>}</div></div>
        <div className="mt-3 space-y-2">{(provider.store_provider_products||[]).map((m)=><div key={m.id} className="grid gap-2 rounded-xl border border-white/[.05] p-3 md:grid-cols-5">
          <input disabled={!canManage} placeholder="External Product ID" value={m.external_product_id||''} onChange={(e)=>patchMapping(provider.id,m.id,{external_product_id:e.target.value})} className="rounded-lg border border-white/10 bg-[#090b10] p-2 text-xs"/>
          <input disabled={!canManage} placeholder="External SKU ID" value={m.external_sku_id||''} onChange={(e)=>patchMapping(provider.id,m.id,{external_sku_id:e.target.value})} className="rounded-lg border border-white/10 bg-[#090b10] p-2 text-xs"/>
          <input disabled={!canManage} placeholder="REGION" value={m.provider_region||''} onChange={(e)=>patchMapping(provider.id,m.id,{provider_region:e.target.value})} className="rounded-lg border border-white/10 bg-[#090b10] p-2 text-xs"/>
          <label className="flex items-center gap-2 text-[10px]"><input disabled={!canManage} type="checkbox" checked={Boolean(m.is_enabled)} onChange={(e)=>patchMapping(provider.id,m.id,{is_enabled:e.target.checked})}/>ربط مفعل</label>
          {canManage&&<button disabled={busy===m.id} onClick={()=>void updateMapping(m)} className="rounded-lg border border-white/10 px-2 py-2 text-[10px]">حفظ الربط</button>}
        </div>)}</div>
      </div>)}</div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
      <h3 className="font-black">طلبات الاسترداد</h3>
      <p className="mt-1 text-[10px] text-gray-500">الموافقة هنا إدارية فقط ولا تنفذ إعادة الأموال لدى مزود الدفع تلقائيًا.</p>
      <div className="mt-4 space-y-3">
        {refunds.map((refund) => {
          const order = Array.isArray(refund.store_orders) ? refund.store_orders[0] : refund.store_orders;
          const reviewable = canManage && ['REQUESTED', 'REVIEWING'].includes(refund.status);
          return <div key={refund.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="font-mono text-[10px] text-gray-500">{order?.order_number || refund.order_id}</div><div className={`mt-1 text-xs font-black ${tone(refund.status)}`}>{refund.status}</div><div className="mt-2 max-w-2xl text-xs text-gray-400">{refund.reason || 'بدون سبب'}</div></div>
              <div className="text-left"><div className="font-black">{Number(refund.amount_lyd || 0).toLocaleString('ar-LY')} د.ل</div><div className="mt-1 text-[10px] text-gray-500">{new Date(refund.created_at).toLocaleString('ar-LY')}</div></div>
            </div>
            {reviewable && <div className="mt-4 flex gap-2 border-t border-white/[.06] pt-3"><button disabled={busy === refund.id} onClick={() => void reviewRefund(refund.id, 'approve_refund')} className="rounded-lg border border-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-300">موافقة للمراجعة المالية</button><button disabled={busy === refund.id} onClick={() => void reviewRefund(refund.id, 'reject_refund')} className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-black text-red-300">رفض</button></div>}
          </div>;
        })}
        {!refunds.length && <div className="py-8 text-center text-sm text-gray-500">لا توجد طلبات استرداد.</div>}
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><h3 className="font-black">آخر الطلبات</h3><div className="mt-4 space-y-3">{orders.slice(0,10).map((order) => <div key={order.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="flex justify-between gap-4"><div><div className="font-mono text-[10px] text-gray-500">{order.order_number}</div><div className={`mt-1 font-black ${tone(order.status)}`}>{order.status}</div></div><div className="text-left"><div className="font-black">{Number(order.total_lyd || 0).toLocaleString('ar-LY')} د.ل</div><div className="mt-1 text-[10px] text-gray-500">{order.payment_status}</div></div></div></div>)}</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div><div className="font-black">جاهزية الكتالوج للبيع</div><div className="mt-1 text-[10px] text-gray-500">لا تعتبر أي خدمة خارجية جاهزة حتى ينجح المورد والمنطقة والتفعيل والربط وSKU.</div></div><div className="text-left"><div className="text-2xl font-black text-[#ff5967]">{readyProducts}/{products.length}</div><div className="text-[10px] text-gray-500">منتجات جاهزة</div></div></div><h3 className="font-black">إدارة المنتجات والأسعار</h3><p className="mt-1 text-[10px] text-gray-500">لا يمكن تفعيل البيع قبل اجتياز بوابات المورد والمنطقة والتفعيل الآلي.</p><div className="mt-4 space-y-3">{products.map((product) => <div key={product.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4">
        <div className="flex flex-wrap justify-between gap-3"><div><div className="font-black">{product.name}</div><div className="mt-1 text-[10px] text-gray-500">{product.fulfillment_mode}</div>{(() => { const r=readinessByProduct.get(product.id); if(!r) return null; const labels={supplierAuthorized:'اعتماد المورد',regionVerified:'صلاحية المنطقة',fulfillmentVerified:'اختبار التفعيل',providerActive:'المورد نشط',activeSku:'SKU نشط',providerMapping:'ربط المورد',sellableMode:'نمط قابل للبيع'}; return <div className="mt-2 flex flex-wrap gap-1">{Object.entries(r.checks).map(([key,ok])=><span key={key} className={`rounded-full border px-2 py-1 text-[9px] font-black ${ok?'border-emerald-500/20 bg-emerald-500/10 text-emerald-300':'border-red-500/20 bg-red-500/10 text-red-300'}`}>{ok?'✓':'×'} {labels[key]||key}</span>)}</div>; })()}</div>
        <select disabled={!canManage} value={product.sale_status} onChange={(e) => patchProduct(product.id,{sale_status:e.target.value})} className="rounded-lg border border-white/10 bg-[#090b10] px-2 py-1 text-xs"><option>DRAFT</option><option>CATALOG_ONLY</option><option>ACTIVE_FOR_SALE</option><option>PAUSED</option><option>ARCHIVED</option></select></div>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-400">{[['supplier_authorization_verified','مورد معتمد'],['regional_validity_verified','منطقة صالحة'],['automated_fulfillment_verified','تفعيل آلي']].map(([key,label]) => <label key={key} className="flex items-center gap-1"><input disabled={!canManage} type="checkbox" checked={Boolean(product[key])} onChange={(e)=>patchProduct(product.id,{[key]:e.target.checked})}/>{label}</label>)}</div>
        {canManage && <button disabled={busy===product.id} onClick={()=>void updateProduct(product)} className="mt-3 rounded-lg border border-[#ff3344]/30 px-3 py-2 text-[10px] font-black text-[#ff5967]">حفظ بوابات المنتج</button>}
        <div className="mt-4 space-y-2">{(product.store_skus||[]).map((sku)=><div key={sku.id} className="grid gap-2 rounded-xl border border-white/[.05] p-3 sm:grid-cols-5">
          <div><div className="text-[10px] text-gray-600">SKU</div><div className="text-xs font-bold">{sku.title}</div>{sku.provider_cost != null && <div className="mt-1 text-[10px] text-gray-500">هامش تقريبي: <span className={Number(sku.sell_price_lyd)-Number(sku.provider_cost)>=0?'text-emerald-300':'text-red-300'}>{(Number(sku.sell_price_lyd)-Number(sku.provider_cost)).toLocaleString('ar-LY')} د.ل</span></div>}</div>
          <label className="text-[10px] text-gray-500">سعر البيع د.ل<input disabled={!canManage} value={sku.sell_price_lyd} onChange={(e)=>patchSku(product.id,sku.id,{sell_price_lyd:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#090b10] p-2 text-white"/></label>
          <label className="text-[10px] text-gray-500">تكلفة المورد<input disabled={!canManage} value={sku.provider_cost ?? ''} onChange={(e)=>patchSku(product.id,sku.id,{provider_cost:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#090b10] p-2 text-white"/></label>
          <label className="text-[10px] text-gray-500">المنطقة<input disabled={!canManage} value={sku.region_code} onChange={(e)=>patchSku(product.id,sku.id,{region_code:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#090b10] p-2 text-white"/></label>
          <div className="flex items-end gap-2"><label className="flex items-center gap-1 text-[10px]"><input disabled={!canManage} type="checkbox" checked={Boolean(sku.is_active)} onChange={(e)=>patchSku(product.id,sku.id,{is_active:e.target.checked})}/>نشط</label>{canManage&&<button disabled={busy===sku.id} onClick={()=>void updateSku(sku)} className="rounded-lg border border-white/10 px-2 py-2 text-[10px]">حفظ</button>}</div>
        </div>)}</div>
      </div>)}</div></div>
    </section>
  </div>;
}
