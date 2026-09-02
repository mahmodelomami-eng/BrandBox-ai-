'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CreditCard, KeyRound, Loader2, RefreshCw, ShieldCheck, TestTube2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function badge(ok, yes = 'جاهز', no = 'غير مهيأ') {
  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[10px] font-black"
      style={{
        background: ok ? 'var(--bb-success-soft)' : 'var(--bb-danger-soft)',
        borderColor: ok ? 'color-mix(in srgb, var(--bb-success) 28%, transparent)' : 'color-mix(in srgb, var(--bb-danger) 28%, transparent)',
        color: ok ? 'var(--bb-success)' : 'var(--bb-danger)',
      }}
    >
      {ok ? yes : no}
    </span>
  );
}

export default function AdminEzonePayPanel() {
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
      const response = await fetch('/api/v1/admin/ezonepay', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل حالة Ezone Pay.');
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل حالة Ezone Pay.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && !payload) {
    return (
      <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border">
        <div className="bb-text-secondary flex items-center gap-3 text-sm">
          <Loader2 className="bb-text-accent animate-spin" size={18} /> جاري تحميل حالة Ezone Pay...
        </div>
      </div>
    );
  }

  const runtime = payload?.runtime || {};
  const metrics = payload?.metrics || {};
  const webhook = payload?.webhook || {};
  const payments = payload?.recentPayments || [];

  return <div className="space-y-5">
    {error && <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-xs">{error}</div>}

    <section className="bb-warning-surface rounded-3xl border p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[10px] font-black tracking-[.2em]">EZONE PAY SANDBOX</div>
          <h2 className="bb-text-primary mt-2 text-xl font-black">الدفع التجريبي والتحقق التشغيلي</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6">الشراء يحول المستخدم إلى Ezone Pay ثم يرجعه إلى Brand Box. العودة وحدها لا تضيف الرصيد؛ التنفيذ يتم فقط بعد Webhook موثق والتحقق من العملية على الخادم.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><TestTube2 size={18} className="bb-text-warning"/> الوضع</div><div className="mt-4 text-2xl font-black uppercase">{runtime.mode || 'sandbox'}</div><div className="bb-text-tertiary mt-2 text-[10px]">Production Enabled: {runtime.productionEnabled ? 'YES' : 'NO'}</div></div>
      <div className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><KeyRound size={18} className="bb-text-accent"/> الاتصال</div><div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span>API Key</span>{badge(runtime.apiKeyConfigured)}</div><div className="flex justify-between"><span>Base URL</span>{badge(runtime.baseUrlConfigured)}</div><div className="flex justify-between"><span>HMAC</span>{badge(runtime.hmacConfigured)}</div></div></div>
      <div className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><CreditCard size={18} style={{ color: 'var(--bb-success)' }}/> المدفوعات المؤكدة</div><div className="mt-4 text-2xl font-black">{Number(metrics.paidCount || 0).toLocaleString('ar-LY')}</div><div className="bb-text-tertiary mt-2 text-[10px]">{Number(metrics.paidAmountLYD || 0).toLocaleString('ar-LY')} د.ل ضمن آخر السجلات</div></div>
      <div className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><ShieldCheck size={18} style={{ color: 'var(--bb-info)' }}/> Webhook</div><div className="bb-text-tertiary mt-4 text-xs leading-6">{webhook.route}<br/>Signature: required<br/>Client fulfillment: disabled</div></div>
    </div>

    <section className="bb-panel rounded-3xl border p-5">
      <div className="mb-4 flex items-center gap-2 font-black"><Activity size={18} className="bb-text-accent"/> آخر عمليات Ezone Pay</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-right text-xs">
          <thead className="bb-text-tertiary bb-divider border-b"><tr><th className="p-3">المرجع</th><th className="p-3">النوع</th><th className="p-3">المبلغ</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody className="divide-y divide-[var(--bb-border-subtle)]">{payments.map((item) => <tr key={item.id}><td className="p-3 font-mono text-[10px]">{item.order_reference}</td><td className="p-3">{item.item_type}</td><td className="p-3">{Number(item.amount_lyd || 0).toLocaleString('ar-LY')} د.ل</td><td className="p-3">{item.status === 'paid' ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--bb-success)' }}><CheckCircle2 size={13}/> paid</span> : item.status}</td><td className="bb-text-tertiary p-3">{new Date(item.created_at).toLocaleString('ar-LY')}</td></tr>)}</tbody>
        </table>
      </div>
      {!payments.length && <div className="bb-text-tertiary py-10 text-center text-sm">لا توجد عمليات Ezone Pay مسجلة بعد.</div>}
    </section>
  </div>;
}
