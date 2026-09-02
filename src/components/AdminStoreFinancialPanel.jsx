'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Loader2, RefreshCw, ReceiptText, RotateCcw, TrendingUp } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const money = (value) => Number(value || 0).toLocaleString('ar-LY', { maximumFractionDigits: 3 });

export default function AdminStoreFinancialPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/finance', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل مالية المتجر.');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل مالية المتجر.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && !data) return <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div>;

  const metrics = data?.metrics || {};
  const rows = data?.skuProfitability || [];

  return <div className="space-y-5">
    {error && <div className="bb-danger-surface rounded-2xl border p-4 text-xs">{error}</div>}

    <section className="bb-panel flex items-center justify-between gap-4 rounded-3xl border p-5">
      <div><div className="bb-text-accent text-[10px] font-black tracking-[.2em]">STORE FINANCE</div><h2 className="mt-2 text-xl font-black">التحليل المالي للمتجر</h2><p className="bb-text-tertiary mt-2 text-xs">الأرقام محسوبة من الطلبات المدفوعة وتكلفة المورد المسجلة وطلبات الاسترداد المعتمدة.</p></div>
      <button onClick={() => void load()} disabled={loading} className="bb-button-secondary rounded-xl border p-3 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[[CircleDollarSign,'صافي الإيرادات',metrics.netRevenueLYD,'د.ل'],[ReceiptText,'تكلفة الموردين',metrics.providerCostLYD,'د.ل'],[TrendingUp,'إجمالي الربح',metrics.grossProfitLYD,'د.ل'],[RotateCcw,'الاستردادات',metrics.refundsLYD,'د.ل']].map(([Icon,label,value,unit]) => <div key={label} className="bb-card rounded-3xl border p-5"><Icon size={18} className="bb-text-accent"/><div className="mt-4 text-2xl font-black">{money(value)} {unit}</div><div className="bb-text-tertiary mt-1 text-[10px]">{label}</div></div>)}
    </div>

    <section className="bb-panel rounded-3xl border p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black">ربحية المنتجات وSKU</h3><p className="bb-text-tertiary mt-1 text-[10px]">الهامش هنا إجمالي قبل المصروفات التشغيلية والضرائب.</p></div><div className="text-left"><div className="text-xl font-black">{metrics.grossMarginPercent == null ? '—' : Number(metrics.grossMarginPercent).toFixed(1) + '%'}</div><div className="bb-text-tertiary text-[10px]">هامش الربح الإجمالي</div></div></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead className="bb-text-tertiary"><tr className="bb-divider border-b"><th className="p-3">المنتج</th><th className="p-3">SKU</th><th className="p-3">الإيراد</th><th className="p-3">التكلفة</th><th className="p-3">الربح</th><th className="p-3">الهامش</th></tr></thead><tbody className="divide-y divide-[var(--bb-border-subtle)]">{rows.map((row) => <tr key={row.skuId}><td className="p-3 font-black">{row.product}</td><td className="p-3">{row.sku}</td><td className="p-3">{money(row.revenue)} د.ل</td><td className="p-3">{money(row.cost)} د.ل</td><td className="p-3 font-black" style={{ color: row.grossProfit >= 0 ? 'var(--bb-success)' : 'var(--bb-danger)' }}>{money(row.grossProfit)} د.ل</td><td className="p-3">{row.marginPercent == null ? '—' : Number(row.marginPercent).toFixed(1) + '%'}</td></tr>)}</tbody></table>{!rows.length && <div className="bb-text-tertiary py-10 text-center text-sm">لا توجد مبيعات مدفوعة بعد.</div>}</div>
    </section>

    <div className="bb-card bb-text-secondary rounded-2xl border p-4 text-xs">طلبات مدفوعة: <b className="bb-text-primary">{metrics.paidOrders || 0}</b> · الإيراد الإجمالي: <b className="bb-text-primary">{money(metrics.grossRevenueLYD)} د.ل</b></div>
  </div>;
}
