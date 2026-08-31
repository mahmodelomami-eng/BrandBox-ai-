'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function AdminStoreLaunchReadinessPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/store/readiness', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر فحص جاهزية المتجر.');
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر فحص جاهزية المتجر.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && !payload) {
    return <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={16} className="animate-spin text-[#ff3344]"/> جاري فحص جاهزية المتجر...</div></section>;
  }

  const status = payload?.status || 'blocked';
  const blockers = payload?.blockers || [];
  const warnings = payload?.warnings || [];
  const metrics = payload?.metrics || {};

  return <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="text-[10px] font-black tracking-[.2em] text-[#ff3344]">STORE LAUNCH READINESS</div>
        <h3 className="mt-2 text-lg font-black">جاهزية المتجر للإطلاق</h3>
        <p className="mt-1 text-xs leading-6 text-gray-500">فحص تشغيلي للمنتجات والتفعيل والمخزون والاستردادات ووضع Ezone Pay.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${status === 'ready' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : status === 'ready_with_warnings' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {status === 'ready' ? 'READY' : status === 'ready_with_warnings' ? 'READY WITH WARNINGS' : 'BLOCKED'}
        </span>
        <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 p-2.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
      </div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="text-[10px] text-gray-500">منتجات مفعلة</div><div className="mt-2 text-2xl font-black">{metrics.activeProducts || 0}</div></div>
      <div className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="text-[10px] text-gray-500">تفعيل فاشل</div><div className={`mt-2 text-2xl font-black ${metrics.failedJobs ? 'text-red-300' : 'text-emerald-300'}`}>{metrics.failedJobs || 0}</div></div>
      <div className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="text-[10px] text-gray-500">استردادات مفتوحة</div><div className="mt-2 text-2xl font-black">{metrics.openRefunds || 0}</div></div>
      <div className="rounded-2xl border border-white/[.06] bg-[#10131a] p-4"><div className="text-[10px] text-gray-500">Ezone Pay</div><div className="mt-2 text-lg font-black uppercase">{metrics.ezoneMode || 'sandbox'}</div></div>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[.03] p-4">
        <div className="flex items-center gap-2 text-xs font-black text-red-300"><ShieldAlert size={15}/> العوائق</div>
        <div className="mt-3 space-y-2">
          {blockers.map((item) => <div key={item.code} className="flex items-center justify-between rounded-xl border border-red-500/10 px-3 py-2 text-xs"><span>{item.label}</span><b>{item.count}</b></div>)}
          {!blockers.length && <div className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14}/> لا توجد عوائق حرجة حاليًا.</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[.03] p-4">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300"><AlertTriangle size={15}/> التنبيهات</div>
        <div className="mt-3 space-y-2">
          {warnings.map((item) => <div key={item.code} className="flex items-center justify-between rounded-xl border border-amber-500/10 px-3 py-2 text-xs"><span>{item.label}</span><b>{item.count}</b></div>)}
          {!warnings.length && <div className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14}/> لا توجد تنبيهات تشغيلية.</div>}
        </div>
      </div>
    </div>
  </section>;
}
