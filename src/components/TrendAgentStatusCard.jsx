'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function TrendAgentStatusCard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const response = await fetch('/api/v1/admin/trend-agent', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!response.ok) return;
      setData(await response.json());
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const agent = data?.agent;
  return (
    <section dir="rtl" className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="bb-panel rounded-3xl border p-5 shadow-[var(--bb-shadow-sm)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="bb-accent-soft grid h-11 w-11 place-items-center rounded-xl border"><Bot size={21} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="bb-text-primary text-sm font-black">{agent?.name || 'Trend Intelligence & Prompt Research Agent'}</h2><span className="rounded-full border border-[var(--bb-success)] bg-[var(--bb-success-soft)] px-2 py-0.5 text-[9px] font-black text-[var(--bb-success)]">Agent دائم</span></div>
              <p className="bb-text-tertiary mt-1 text-[10px]">{agent?.specialty || 'Trend Discovery · Prompt Research · Arabic Localization · Scoring'}</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} className="bb-button-secondary inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> تحديث حالة الباحث</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="الحالة" value={loading ? '...' : agent?.status || 'waiting'} />
          <Stat label="المهمة الحالية" value={agent?.task || 'البحث عن موجة ترند جديدة'} wide />
          <Stat label="Shortlisted" value={data?.queue?.shortlisted ?? 0} />
          <Stat label="Design / Test" value={data?.queue?.designing ?? 0} />
        </div>
        <div className="bb-surface-1 bb-text-tertiary mt-3 flex items-center gap-2 rounded-xl border bb-border-subtle px-3 py-2 text-[10px]"><Sparkles size={13} className="bb-text-accent" /> الحالة مستمدة من مسار Trend Lab؛ البحث الدوري الخارجي يضيف Briefs ولا ينشر قوالب تلقائيًا.</div>
      </div>
    </section>
  );
}

function Stat({ label, value, wide = false }) {
  return <div className={`bb-card rounded-xl border p-3 ${wide ? 'sm:col-span-1' : ''}`}><div className="bb-text-disabled text-[9px]">{label}</div><div className="bb-text-primary mt-1 truncate text-xs font-black">{value}</div></div>;
}
