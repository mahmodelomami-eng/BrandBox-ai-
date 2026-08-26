'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, PlugZap, RefreshCw, XCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : '—';
}

export default function OpenRouterHealthCard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function checkConnection() {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت جلسة الدخول.');

      const response = await fetch('/api/v1/admin/openrouter/health', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      setResult(payload);
      if (!response.ok) throw new Error(payload.status || payload.error || 'OPENROUTER_CHECK_FAILED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر اختبار OpenRouter.');
    } finally {
      setLoading(false);
    }
  }

  const connected = Boolean(result?.connected);
  const account = result?.account || {};

  return (
    <section dir="rtl" className="mx-auto mt-6 max-w-[1500px] px-4 sm:px-6 lg:px-8">
      <div className={`rounded-3xl border p-5 ${connected ? 'border-emerald-500/20 bg-emerald-500/[.04]' : 'border-white/10 bg-[#0d1016]'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl ${connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[.05] text-gray-400'}`}><PlugZap size={21}/></span>
            <div>
              <div className="flex items-center gap-2"><h2 className="font-black text-white">OpenRouter Connection</h2>{result && (connected ? <CheckCircle2 size={16} className="text-emerald-300"/> : <XCircle size={16} className="text-red-300"/>)}</div>
              <p className="mt-1 text-xs text-gray-500">فحص آمن لمفتاح Preview بدون عرض المفتاح نفسه.</p>
            </div>
          </div>
          <button type="button" onClick={checkConnection} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#151923] px-4 py-3 text-xs font-black text-white disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>} اختبار OpenRouter
          </button>
        </div>

        {connected && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-gray-500">الحالة</span><div className="mt-1 font-black text-emerald-300">متصل</div></div>
            <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-gray-500">حد المفتاح</span><div className="mt-1 font-black text-white">{money(account.limitUsd)}</div></div>
            <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-gray-500">المتبقي من الحد</span><div className="mt-1 font-black text-white">{money(account.limitRemainingUsd)}</div></div>
            <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-gray-500">الاستخدام</span><div className="mt-1 font-black text-white">{money(account.usageUsd)}</div></div>
          </div>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-3 py-2 text-xs font-bold text-red-300">{error}</div>}
      </div>
    </section>
  );
}
