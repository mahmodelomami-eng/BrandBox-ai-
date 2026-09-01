'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Code2,
  Database,
  ExternalLink,
  FlaskConical,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const AGENT_ICONS = {
  manager: BrainCircuit,
  frontend: Code2,
  backend: ServerCog,
  ai: Sparkles,
  database: Database,
  qa: FlaskConical,
  security: ShieldCheck,
  devops: Rocket,
};

const STATUS_LABELS = {
  working: 'يعمل الآن',
  testing: 'يختبر',
  reviewing: 'يراجع',
  deploying: 'ينشر',
  waiting: 'انتظار',
  blocked: 'متوقف',
  completed: 'مكتمل',
  success: 'ناجح',
  failed: 'فشل',
  running: 'قيد التشغيل',
  open: 'مفتوح',
  closed: 'مغلق',
  draft: 'مسودة',
  pending: 'انتظار',
  unknown: 'غير متاح',
};

function statusClass(status) {
  if (['completed', 'success', 'closed'].includes(status)) return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  if (['blocked', 'failed'].includes(status)) return 'border-red-500/25 bg-red-500/10 text-red-300';
  if (['working', 'testing', 'reviewing', 'deploying', 'running', 'open'].includes(status)) return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300';
  return 'border-white/10 bg-white/[.04] text-gray-400';
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(status)}`}>{STATUS_LABELS[status] || status || '—'}</span>;
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ar-LY'); } catch { return '—'; }
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-white/10 bg-[#10131a] p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-gray-500">{label}</div><div className="mt-2 text-3xl font-black">{value}</div><div className="mt-2 text-[10px] text-gray-600">{note}</div></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/10 text-[#ff3344]"><Icon size={20}/></span></div></div>;
}

function Card({ title, subtitle, children }) {
  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016]"><div className="border-b border-white/10 px-5 py-4"><h2 className="font-black">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-6 text-gray-500">{subtitle}</p>}</div><div className="p-4 sm:p-5">{children}</div></section>;
}

export default function AdminAITeamControlCenter() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(fresh = false) {
    if (fresh) setRefreshing(true);
    else if (!payload) setLoading(true);
    setError('');

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت جلسة الدخول.');

      const response = await fetch(`/api/v1/admin/ai-team${fresh ? '?fresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === 'FORBIDDEN' ? 'لا تملك صلاحية مراقبة فريق البرمجة.' : 'تعذر تحميل حالة فريق البرمجة.');
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل حالة فريق البرمجة.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => { void load(false); }, 0);
    const interval = window.setInterval(() => { void load(false); }, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
    // The Supabase client is stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !payload) {
    return <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] text-white"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm text-gray-400"><Loader2 className="animate-spin text-[#ff3344]" size={19}/> جاري قراءة نشاط فريق البرمجة...</div></main>;
  }

  const agents = payload?.agents || [];
  const launch = payload?.launch || {};
  const counts = payload?.statusCounts || {};
  const progress = launch.total ? Math.round((Number(launch.completed || 0) / Number(launch.total)) * 100) : 0;

  return <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] px-4 py-6 text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f31325] shadow-[0_0_40px_rgba(243,19,37,.2)]"><Bot size={27}/></span>
            <div className="min-w-0"><div className="text-[10px] font-black tracking-[.22em] text-[#ff6674]">AI TEAM CONTROL CENTER</div><h1 className="mt-1 text-2xl font-black">مراقبة فريق البرمجة الآلي</h1><p className="mt-2 text-xs leading-6 text-gray-500">الحالة مستنتجة من GitHub Issues وPull Requests وActions وVercel، وليست Presence مباشرًا لكل Agent.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black text-gray-300"><ArrowRight size={15}/> مركز الإدارة</Link>
            <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-xs font-black disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> تحديث مباشر</button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-gray-500"><span className="rounded-full border border-white/10 px-3 py-1.5">المصدر: {payload?.statusSource || 'GitHub'}</span><span className="rounded-full border border-white/10 px-3 py-1.5">آخر لقطة: {formatDate(payload?.snapshotAt)}</span><span className="rounded-full border border-white/10 px-3 py-1.5">التحديث التلقائي: 60 ثانية · Cache GitHub: {payload?.cacheSeconds ?? 300} ثانية</span></div>
      </header>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Agents يعملون/يراجعون" value={Number(counts.working || 0) + Number(counts.testing || 0) + Number(counts.reviewing || 0) + Number(counts.deploying || 0)} note={`${agents.length} أدوار مراقبة`} icon={Activity}/>
        <Metric label="المهام المكتملة" value={`${launch.completed || 0}/${launch.total || 0}`} note={`تقدم برنامج الإطلاق ${progress}%`} icon={CheckCircle2}/>
        <Metric label="Pull Requests مفتوحة" value={(payload?.pullRequests || []).length} note={payload?.currentPull ? `الحالي #${payload.currentPull.number}` : 'لا يوجد PR حالي'} icon={GitPullRequest}/>
        <Metric label="Agents متوقفة" value={counts.blocked || 0} note={counts.blocked ? 'يتطلب فحص سبب التوقف' : 'لا توجد عوائق حالية'} icon={CircleDot}/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card title="المهمة الحالية" subtitle="أقل مهمة مفتوحة في برنامج #85–#97">
          {launch.currentIssue ? <div className="rounded-2xl border border-[#f31325]/20 bg-[#f31325]/5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black text-[#ff6674]">ISSUE #{launch.currentIssue.number}</div><h3 className="mt-2 text-lg font-black">{launch.currentIssue.title}</h3></div><StatusBadge status={launch.currentIssue.state}/></div><a href={launch.currentIssue.html_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-cyan-300">فتح المهمة في GitHub <ExternalLink size={13}/></a></div> : <div className="rounded-2xl border border-white/10 bg-[#10131a] p-5 text-sm text-gray-500">لا توجد مهمة إطلاق مفتوحة حاليًا.</div>}
          <div className="mt-4"><div className="mb-2 flex justify-between text-[10px] font-black text-gray-500"><span>تقدم Launch Program</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[#f31325] transition-all" style={{ width: `${progress}%` }}/></div></div>
        </Card>

        <Card title="حالة بوابات الدمج" subtitle={payload?.currentPull ? `PR #${payload.currentPull.number} · ${payload.currentPull.branch}` : 'لا يوجد PR مفتوح'}>
          <div className="space-y-3">
            {[['Safety Gate', payload?.ci?.safety], ['Release verification', payload?.ci?.release], ['Vercel Preview', payload?.ci?.vercel]].map(([label, item]) => <a key={label} href={item?.url || '#'} target={item?.url ? '_blank' : undefined} rel="noreferrer" className={`flex items-center justify-between rounded-xl border border-white/[.07] bg-[#10131a] p-4 ${item?.url ? 'hover:border-white/20' : ''}`}><div><div className="text-sm font-black">{label}</div>{item?.description && <div className="mt-1 text-[10px] text-gray-500">{item.description}</div>}</div><StatusBadge status={item?.state || 'unknown'}/></a>)}
          </div>
        </Card>
      </div>

      <Card title="الفريق" subtitle="الحالة تُستنتج من نوع المهمة الحالية وCI؛ يمكن أن يعمل أكثر من دور على نفس PR">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => {
            const Icon = AGENT_ICONS[agent.id] || Bot;
            return <div key={agent.id} className="rounded-2xl border border-white/[.07] bg-[#10131a] p-4"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={18}/></span><StatusBadge status={agent.status}/></div><div className="mt-4 font-black">{agent.name}</div><div className="mt-1 text-[10px] font-bold text-gray-600">{agent.specialty}</div><div className="mt-4 min-h-12 text-xs leading-5 text-gray-300">{agent.task}</div><div className="mt-3 border-t border-white/[.06] pt-3 text-[10px] leading-5 text-gray-600">{agent.note}</div></div>;
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Pull Requests المفتوحة" subtitle="الفروع التي يعمل عليها الفريق الآن">
          <div className="space-y-2">{(payload?.pullRequests || []).length ? payload.pullRequests.map((pr) => <a key={pr.number} href={pr.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-4 hover:border-white/20"><GitPullRequest className="shrink-0 text-[#ff3344]" size={17}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">#{pr.number} · {pr.title}</div><div className="mt-1 truncate text-[10px] text-gray-600">{pr.branch} · {formatDate(pr.updatedAt)}</div></div><ExternalLink size={13} className="text-gray-600"/></a>) : <div className="rounded-xl border border-white/10 bg-[#10131a] p-5 text-center text-sm text-gray-500">لا توجد Pull Requests مفتوحة.</div>}</div>
        </Card>

        <Card title="Timeline" subtitle="أحدث نشاطات GitHub وCI وبرنامج الإطلاق">
          <div className="space-y-2">{(payload?.timeline || []).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#10131a] p-3 hover:border-white/20"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${['success','closed'].includes(item.status) ? 'bg-emerald-400' : ['failed','blocked'].includes(item.status) ? 'bg-red-400' : 'bg-cyan-400'}`}/><div className="min-w-0 flex-1"><div className="truncate text-xs font-black">{item.title}</div><div className="mt-1 text-[10px] text-gray-600">{formatDate(item.at)}</div></div><StatusBadge status={item.status}/></a>)}</div>
        </Card>
      </div>

      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-[10px] leading-6 text-amber-200/70">هذه الشاشة تراقب آثار عمل الـAgents في GitHub وCI. عندما نربط لاحقًا Coding Agents بهويات مستقلة أو Webhooks، يمكن تحويل الحالة من استدلالية إلى Presence مباشر لحظي.</div>
    </div>
  </main>;
}
