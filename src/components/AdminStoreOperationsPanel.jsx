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
  const canManage = Boolean(payload?.capabilities?.canManage);

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

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><h3 className="font-black">آخر الطلبات</h3><div className="mt-4 space-y-3">{orders.slice(0,10).map((order) => <div key={order.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="flex justify-between gap-4"><div><div className="font-mono text-[10px] text-gray-500">{order.order_number}</div><div className={`mt-1 font-black ${tone(order.status)}`}>{order.status}</div></div><div className="text-left"><div className="font-black">{Number(order.total_lyd || 0).toLocaleString('ar-LY')} د.ل</div><div className="mt-1 text-[10px] text-gray-500">{order.payment_status}</div></div></div></div>)}</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><h3 className="font-black">بوابات بيع المنتجات</h3><div className="mt-4 space-y-3">{products.map((product) => <div key={product.id} className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="flex justify-between gap-3"><div><div className="font-black">{product.name}</div><div className="mt-1 text-[10px] text-gray-500">{product.fulfillment_mode}</div></div><div className={`text-xs font-black ${tone(product.sale_status)}`}>{product.sale_status}</div></div><div className="mt-3 flex gap-2 text-[10px] text-gray-500"><span>{product.supplier_authorization_verified ? <CheckCircle2 size={12} className="inline text-emerald-300"/> : '○'} مورد</span><span>{product.regional_validity_verified ? <CheckCircle2 size={12} className="inline text-emerald-300"/> : '○'} منطقة</span><span>{product.automated_fulfillment_verified ? <CheckCircle2 size={12} className="inline text-emerald-300"/> : '○'} تفعيل</span></div></div>)}</div></div>
    </section>
  </div>;
}
