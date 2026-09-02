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

  return <section className="bb-panel rounded-3xl border p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="bb-text-accent text-[10px] font-black tracking-[.2em]">DIGITAL INVENTORY</div>
        <h3 className="mt-2 font-black">مخزون الأكواد الرقمية</h3>
        <p className="bb-text-tertiary mt-1 text-[10px] leading-5">الأكواد الجديدة تُشفّر على الخادم قبل الحفظ. لا يتم عرض الأكواد الخام في لوحة الإدارة بعد الاستيراد.</p>
      </div>
      <button onClick={() => void load()} disabled={loading} className="bb-button-secondary rounded-xl border p-3 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/></button>
    </div>

    {error && <div className="bb-danger-surface mt-4 rounded-xl border p-3 text-xs">{error}</div>}
    {message && <div className="mt-4 rounded-xl border p-3 text-xs" style={{ background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' }}>{message}</div>}

    {lowStock.length > 0 && <div className="bb-warning-surface mt-4 rounded-2xl border p-4">
      <div className="flex items-center gap-2 text-xs font-black"><AlertTriangle size={15}/> تنبيه مخزون منخفض</div>
      <div className="mt-2 flex flex-wrap gap-2">{lowStock.map((sku) => <span key={sku.id} className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: 'color-mix(in srgb, var(--bb-warning) 25%, transparent)' }}>{sku.title}: {sku.inventory?.available || 0}</span>)}</div>
    </div>}

    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        {payload.skus.map((sku) => <button key={sku.id} onClick={() => setSelectedSkuId(sku.id)} className={`w-full rounded-2xl border p-4 text-right ${selectedSkuId === sku.id ? 'bb-accent-soft' : 'bb-card bb-hoverable'}`}>
          <div className="flex items-center justify-between gap-3">
            <div><div className="font-black">{sku.title}</div><div className="bb-text-tertiary mt-1 text-[10px]">{sku.sku_code}</div></div>
            <div className="text-left text-[10px]"><div style={{ color: 'var(--bb-success)' }}>متاح {sku.inventory?.available || 0}</div><div className="bb-text-warning">محجوز {sku.inventory?.reserved || 0}</div><div className="bb-text-tertiary">مُسلّم {sku.inventory?.delivered || 0}</div></div>
          </div>
        </button>)}
        {!loading && !payload.skus.length && <div className="bb-card bb-text-tertiary rounded-2xl border p-5 text-center text-xs">لا توجد SKU بنمط CODE_STOCK.</div>}
      </div>

      {payload.capabilities?.canManage && <div className="bb-card rounded-2xl border p-4">
        <div className="flex items-center gap-2 font-black"><PackagePlus size={17} className="bb-text-accent"/> إضافة دفعة أكواد</div>
        <textarea value={codesText} onChange={(e) => setCodesText(e.target.value)} rows={9} placeholder={"كود واحد في كل سطر\nCODE-001\nCODE-002"} className="bb-input mt-4 w-full rounded-xl border p-3 font-mono text-xs outline-none"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={supplierBatch} onChange={(e) => setSupplierBatch(e.target.value)} placeholder="Supplier Batch (اختياري)" className="bb-input rounded-xl border p-3 text-xs outline-none"/>
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bb-input rounded-xl border p-3 text-xs outline-none"/>
        </div>
        <button onClick={() => void importBatch()} disabled={busy || !selectedSkuId} className="bb-button-primary mt-4 flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin"/>} استيراد وتشفير الدفعة</button>
      </div>}
    </div>
  </section>;
}
