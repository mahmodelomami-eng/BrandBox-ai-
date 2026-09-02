'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function readinessStyle(status) {
  const color = status === 'ready' ? 'var(--bb-success)' : status === 'ready_with_warnings' ? 'var(--bb-warning)' : 'var(--bb-danger)';
  const background = status === 'ready' ? 'var(--bb-success-soft)' : status === 'ready_with_warnings' ? 'var(--bb-warning-soft)' : 'var(--bb-danger-soft)';
  return { color, background, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` };
}

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
    return <section className="bb-panel rounded-3xl border p-5"><div className="bb-text-tertiary flex items-center gap-2 text-xs"><Loader2 size={16} className="bb-text-accent animate-spin"/> جاري فحص جاهزية المتجر...</div></section>;
  }

  const status = payload?.status || 'blocked';
  const blockers = payload?.blockers || [];
  const warnings = payload?.warnings || [];
  const metrics = payload?.metrics || {};

  return <section className="bb-panel rounded-3xl border p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="bb-text-accent text-[10px] font-black tracking-[.2em]">STORE LAUNCH READINESS</div>
        <h3 className="mt-2 text-lg font-black">جاهزية المتجر للإطلاق</h3>
        <p className="bb-text-tertiary mt-1 text-xs leading-6">فحص تشغيلي للمنتجات والتفعيل والمخزون والاستردادات ووضع Ezone Pay.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border px-3 py-1.5 text-[10px] font-black" style={readinessStyle(status)}>
          {status === 'ready' ? 'READY' : status === 'ready_with_warnings' ? 'READY WITH WARNINGS' : 'BLOCKED'}
        </span>
        <button onClick={() => void load()} disabled={loading} className="bb-button-secondary rounded-xl border p-2.5 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
      </div>
    </div>

    {error && <div className="bb-danger-surface mt-4 rounded-xl border p-3 text-xs">{error}</div>}

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="منتجات مفعلة" value={metrics.activeProducts || 0} />
      <Metric label="تفعيل فاشل" value={metrics.failedJobs || 0} tone={metrics.failedJobs ? 'danger' : 'success'} />
      <Metric label="استردادات مفتوحة" value={metrics.openRefunds || 0} />
      <Metric label="Ezone Pay" value={String(metrics.ezoneMode || 'sandbox').toUpperCase()} compact />
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="bb-danger-surface rounded-2xl border p-4">
        <div className="flex items-center gap-2 text-xs font-black"><ShieldAlert size={15}/> العوائق</div>
        <div className="mt-3 space-y-2">
          {blockers.map((item) => <div key={item.code} className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--bb-danger) 18%, transparent)' }}><div className="flex items-center justify-between"><span>{item.label}</span><b>{item.count}</b></div></div>)}
          {!blockers.length && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={14}/> لا توجد عوائق حرجة حاليًا.</div>}
        </div>
      </div>

      <div className="bb-warning-surface rounded-2xl border p-4">
        <div className="flex items-center gap-2 text-xs font-black"><AlertTriangle size={15}/> التنبيهات</div>
        <div className="mt-3 space-y-2">
          {warnings.map((item) => <div key={item.code} className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--bb-warning) 18%, transparent)' }}><div className="flex items-center justify-between"><span>{item.label}</span><b>{item.count}</b></div></div>)}
          {!warnings.length && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={14}/> لا توجد تنبيهات تشغيلية.</div>}
        </div>
      </div>
    </div>
  </section>;
}

function Metric({ label, value, tone = 'default', compact = false }) {
  const color = tone === 'danger' ? 'var(--bb-danger)' : tone === 'success' ? 'var(--bb-success)' : 'var(--bb-text-primary)';
  return <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px]">{label}</div><div className={`${compact ? 'text-lg' : 'text-2xl'} mt-2 font-black`} style={{ color }}>{value}</div></div>;
}
