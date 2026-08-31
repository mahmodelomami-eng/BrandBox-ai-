'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, PackagePlus, RefreshCw } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function AdminStoreInventoryPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState({ skus: [], capabilities: { canManage: false } });
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [codesText, setCodesText] = useState('');
  const [supplierBatch, setSupplierBatch] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
      const response = await fetch('/api/v1/admin/store/inventory', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل المخزون الرقمي.');
      setPayload(result);
      if (!selectedSkuId && result.skus?.length) setSelectedSkuId(result.skus[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المخزون الرقمي.');
    } finally {
      setLoading(false);
    }
  }

  async function importBatch() {
    const codes = codesText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!selectedSkuId || !codes.length) {
      setError('اختر SKU وأدخل كودًا واحدًا على الأقل.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/inventory', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skuId: selectedSkuId,
          codes,
          supplierBatch: supplierBatch || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر إضافة دفعة الأكواد.');
      setMessage(`تمت معالجة ${result.requested} كود، وأضيف ${result.inserted} كود جديد.`);
      setCodesText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إضافة دفعة الأكواد.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const lowStock = payload.skus.filter((sku) => sku.inventory?.lowStock);

  return <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="text-[10px] font-black tracking-[.2em] text-[#ff3344]">DIGITAL INVENTORY</div>
        <h3 className="mt-2 font-black">مخزون الأكواد الرقمية</h3>
        <p className="mt-1 text-[10px] leading-5 text-gray-500">الأكواد الجديدة تُشفّر على الخادم قبل الحفظ. لا يتم عرض الأكواد الخام في لوحة الإدارة بعد الاستيراد.</p>
      </div>
      <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 p-3"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/></button>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
    {message && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div>}

    {lowStock.length > 0 && <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-xs font-black text-amber-300"><AlertTriangle size={15}/> تنبيه مخزون منخفض</div>
      <div className="mt-2 flex flex-wrap gap-2">{lowStock.map((sku) => <span key={sku.id} className="rounded-full border border-amber-500/20 px-2.5 py-1 text-[10px] text-amber-200">{sku.title}: {sku.inventory?.available || 0}</span>)}</div>
    </div>}

    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        {payload.skus.map((sku) => <button key={sku.id} onClick={() => setSelectedSkuId(sku.id)} className={`w-full rounded-2xl border p-4 text-right ${selectedSkuId === sku.id ? 'border-[#ff3344]/40 bg-[#ff3344]/5' : 'border-white/[.06] bg-[#10131a]'}`}>
          <div className="flex items-center justify-between gap-3">
            <div><div className="font-black">{sku.title}</div><div className="mt-1 text-[10px] text-gray-500">{sku.sku_code}</div></div>
            <div className="text-left text-[10px]"><div className="text-emerald-300">متاح {sku.inventory?.available || 0}</div><div className="text-amber-300">محجوز {sku.inventory?.reserved || 0}</div><div className="text-gray-500">مُسلّم {sku.inventory?.delivered || 0}</div></div>
          </div>
        </button>)}
        {!loading && !payload.skus.length && <div className="rounded-2xl border border-white/[.06] p-5 text-center text-xs text-gray-500">لا توجد SKU بنمط CODE_STOCK.</div>}
      </div>

      {payload.capabilities?.canManage && <div className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4">
        <div className="flex items-center gap-2 font-black"><PackagePlus size={17} className="text-[#ff3344]"/> إضافة دفعة أكواد</div>
        <textarea value={codesText} onChange={(e) => setCodesText(e.target.value)} rows={9} placeholder={"كود واحد في كل سطر\nCODE-001\nCODE-002"} className="mt-4 w-full rounded-xl border border-white/10 bg-[#090b10] p-3 font-mono text-xs outline-none"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={supplierBatch} onChange={(e) => setSupplierBatch(e.target.value)} placeholder="Supplier Batch (اختياري)" className="rounded-xl border border-white/10 bg-[#090b10] p-3 text-xs outline-none"/>
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-xl border border-white/10 bg-[#090b10] p-3 text-xs outline-none"/>
        </div>
        <button onClick={() => void importBatch()} disabled={busy || !selectedSkuId} className="mt-4 flex items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-xs font-black disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin"/>} استيراد وتشفير الدفعة</button>
      </div>}
    </div>
  </section>;
}
