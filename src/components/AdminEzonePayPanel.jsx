'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CreditCard, KeyRound, Loader2, RefreshCw, ShieldCheck, TestTube2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function badge(ok, yes = 'جاهز', no = 'غير مهيأ') {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{ok ? yes : no}</span>;
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

  if (loading && !payload) return <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><div className="flex items-center gap-3 text-sm text-gray-500"><Loader2 className="animate-spin text-[#f31325]" size={18}/> جاري تحميل حالة Ezone Pay...</div></div>;

  const runtime = payload?.runtime || {};
  const metrics = payload?.metrics || {};
  const webhook = payload?.webhook || {};
  const payments = payload?.recentPayments || [];

  return <div className="space-y-5">
    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}

    <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="text-[10px] font-black tracking-[.2em] text-amber-300">EZONE PAY SANDBOX</div><h2 className="mt-2 text-xl font-black">الدفع التجريبي والتحقق التشغيلي</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-amber-100/70">الشراء يحول المستخدم إلى Ezone Pay ثم يرجعه إلى Brand Box. العودة وحدها لا تضيف الرصيد؛ التنفيذ يتم فقط بعد Webhook موثق والتحقق من العملية على الخادم.</p></div>
        <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><TestTube2 size={18} className="text-amber-300"/> الوضع</div><div className="mt-4 text-2xl font-black uppercase">{runtime.mode || 'sandbox'}</div><div className="mt-2 text-[10px] text-gray-500">Production Enabled: {runtime.productionEnabled ? 'YES' : 'NO'}</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><KeyRound size={18} className="text-[#ff3344]"/> الاتصال</div><div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span>API Key</span>{badge(runtime.apiKeyConfigured)}</div><div className="flex justify-between"><span>Base URL</span>{badge(runtime.baseUrlConfigured)}</div><div className="flex justify-between"><span>HMAC</span>{badge(runtime.hmacConfigured)}</div></div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><CreditCard size={18} className="text-emerald-300"/> المدفوعات المؤكدة</div><div className="mt-4 text-2xl font-black">{Number(metrics.paidCount || 0).toLocaleString('ar-LY')}</div><div className="mt-2 text-[10px] text-gray-500">{Number(metrics.paidAmountLYD || 0).toLocaleString('ar-LY')} د.ل ضمن آخر السجلات</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><ShieldCheck size={18} className="text-cyan-300"/> Webhook</div><div className="mt-4 text-xs leading-6 text-gray-500">{webhook.route}<br/>Signature: required<br/>Client fulfillment: disabled</div></div>
    </div>

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
      <div className="mb-4 flex items-center gap-2 font-black"><Activity size={18} className="text-[#ff3344]"/> آخر عمليات Ezone Pay</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-right text-xs">
          <thead className="border-b border-white/10 text-gray-500"><tr><th className="p-3">المرجع</th><th className="p-3">النوع</th><th className="p-3">المبلغ</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody className="divide-y divide-white/[.06]">{payments.map((item) => <tr key={item.id}><td className="p-3 font-mono text-[10px]">{item.order_reference}</td><td className="p-3">{item.item_type}</td><td className="p-3">{Number(item.amount_lyd || 0).toLocaleString('ar-LY')} د.ل</td><td className="p-3">{item.status === 'paid' ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={13}/> paid</span> : item.status}</td><td className="p-3 text-gray-500">{new Date(item.created_at).toLocaleString('ar-LY')}</td></tr>)}</tbody>
        </table>
      </div>
      {!payments.length && <div className="py-10 text-center text-sm text-gray-500">لا توجد عمليات Ezone Pay مسجلة بعد.</div>}
    </section>
  </div>;
}
