'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Database,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const ICONS = {
  'mobile-product-ux': BrainCircuit,
  'mobile-expo-engineer': Code2,
  'mobile-ai-integration': Sparkles,
  'mobile-trends': TrendingUp,
  'mobile-social': UsersRound,
  'mobile-commerce': ShoppingBag,
  'mobile-backend-db': Database,
  'mobile-security': ShieldCheck,
  'mobile-qa-release': FlaskConical,
};

const STATUS_LABELS = {
  working: 'يعمل الآن',
  testing: 'يختبر',
  reviewing: 'يراجع',
  waiting: 'انتظار',
  blocked: 'متوقف',
  completed: 'مكتمل',
  running: 'قيد التشغيل',
  success: 'ناجح',
  failed: 'فشل',
  unknown: 'غير متاح',
};

function statusTone(status) {
  if (['completed', 'success'].includes(status)) return ['var(--bb-success-soft)', 'var(--bb-success)'];
  if (['blocked', 'failed'].includes(status)) return ['var(--bb-danger-soft)', 'var(--bb-danger)'];
  if (['working', 'testing', 'reviewing', 'running'].includes(status)) return ['var(--bb-info-soft)', 'var(--bb-info)'];
  return ['var(--bb-hover)', 'var(--bb-text-secondary)'];
}

function StatusBadge({ status }) {
  const [background, color] = statusTone(status);
  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black"
      style={{ background, color, borderColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
    >
      {STATUS_LABELS[status] || status || '—'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ar-LY'); } catch { return '—'; }
}

export default function AdminMobileAITeamPanel() {
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

      const response = await fetch(`/api/v1/admin/mobile-ai-team${fresh ? '?fresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === 'FORBIDDEN' ? 'لا تملك صلاحية مراقبة فريق التطبيق.' : 'تعذر تحميل حالة فريق التطبيق.');
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل حالة فريق التطبيق.');
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

  const agents = payload?.agents || [];
  const counts = payload?.statusCounts || {};
  const activeCount = Number(counts.working || 0) + Number(counts.testing || 0) + Number(counts.reviewing || 0);

  return (
    <section dir="rtl" className="bb-app-canvas px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="bb-panel rounded-3xl border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-2xl border"><Activity size={22}/></span>
              <div>
                <div className="bb-text-accent text-[10px] font-black tracking-[.22em]">MOBILE APP TEAM</div>
                <h2 className="mt-1 text-xl font-black">فريق تطوير وتصميم تطبيق Brand Box</h2>
                <p className="bb-text-tertiary mt-2 max-w-3xl text-xs leading-6">
                  فريق متخصص مستقل عن فريق الويب. الحالة مستنتجة من مهام وPRs وMobile CI الخاصة بالتطبيق، وتظهر المهمة الحالية حتى قبل فتح Pull Request.
                </p>
              </div>
            </div>
            <button
              onClick={() => void load(true)}
              disabled={refreshing}
              className="bb-button-secondary inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-black disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>
              تحديث فريق التطبيق
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px] font-bold">إجمالي فريق التطبيق</div><div className="mt-2 text-2xl font-black">{payload?.agentCount ?? 9}</div><div className="bb-text-disabled mt-1 text-[10px]">أدوار Mobile متخصصة</div></div>
            <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px] font-bold">نشط الآن</div><div className="mt-2 text-2xl font-black">{activeCount}</div><div className="bb-text-disabled mt-1 text-[10px]">Working / Testing / Reviewing</div></div>
            <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px] font-bold">Mobile CI</div><div className="mt-2"><StatusBadge status={payload?.ci?.state || 'unknown'}/></div><div className="bb-text-disabled mt-2 text-[10px]">بوابة TypeScript وSecurity Guards</div></div>
            <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px] font-bold">آخر لقطة</div><div className="bb-text-secondary mt-2 text-xs font-black">{formatDate(payload?.snapshotAt)}</div><div className="bb-text-disabled mt-1 text-[10px]">تحديث تلقائي كل 60 ثانية</div></div>
          </div>
        </div>

        {error ? <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-sm">{error}</div> : null}

        <div className="bb-panel rounded-3xl border p-5">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: 'var(--bb-border)' }}>
            <div>
              <h3 className="font-black">المهمة الحالية لفريق التطبيق</h3>
              <p className="bb-text-tertiary mt-1 text-xs">المصدر: Issue أو PR Mobile الأحدث، وليس PR عام للموقع.</p>
            </div>
            {payload?.currentPull ? <StatusBadge status="working"/> : payload?.currentIssue ? <StatusBadge status="reviewing"/> : <StatusBadge status="waiting"/>}
          </div>
          <div className="mt-4 bb-card rounded-2xl border p-4">
            {payload?.currentPull ? (
              <a href={payload.currentPull.url} target="_blank" rel="noreferrer" className="block">
                <div className="bb-text-accent text-[10px] font-black">PR #{payload.currentPull.number}</div>
                <div className="mt-1 font-black">{payload.currentPull.title}</div>
                <div className="bb-text-disabled mt-2 text-[10px]">{payload.currentPull.branch}</div>
              </a>
            ) : payload?.currentIssue ? (
              <a href={payload.currentIssue.url} target="_blank" rel="noreferrer" className="block">
                <div className="bb-text-accent text-[10px] font-black">ISSUE #{payload.currentIssue.number}</div>
                <div className="mt-1 font-black">{payload.currentIssue.title}</div>
              </a>
            ) : (
              <div className="bb-text-tertiary text-sm">لا توجد مهمة Mobile مفتوحة حاليًا.</div>
            )}
          </div>
        </div>

        <div className="bb-panel rounded-3xl border p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h3 className="font-black">Mobile App Team · {agents.length || 9} Agents</h3><p className="bb-text-tertiary mt-1 text-xs">كل دور يظهر مستقلًا حتى لو كان له نظير عام في فريق المنصة.</p></div>
            {loading && !payload ? <span className="bb-text-tertiary text-xs">جاري التحميل…</span> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const Icon = ICONS[agent.id] || Activity;
              return (
                <div key={agent.id} className="bb-card rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><Icon size={18}/></span>
                    <StatusBadge status={agent.status}/>
                  </div>
                  <div className="mt-4 font-black">{agent.name}</div>
                  <div className="bb-text-disabled mt-1 text-[10px] font-bold leading-5">{agent.specialty}</div>
                  <div className="bb-text-secondary mt-4 min-h-12 text-xs leading-5">{agent.task}</div>
                  <div className="bb-divider bb-text-disabled mt-3 border-t pt-3 text-[10px] leading-5">{agent.note}</div>
                </div>
              );
            })}
          </div>
          {!loading && !agents.length ? <div className="bb-card bb-text-tertiary rounded-2xl border p-5 text-sm">لم يتم تحميل قائمة فريق التطبيق. استخدم تحديث فريق التطبيق لإعادة المحاولة.</div> : null}
        </div>

        <div className="bb-success-surface flex items-start gap-3 rounded-2xl border p-4 text-xs leading-6">
          <CheckCircle2 className="mt-0.5 shrink-0" size={17}/>
          <div><strong>الفصل مقصود:</strong> الـ12 إيجنت العامون يراقبون المنصة ككل، والـ9 هنا مسؤولون حصريًا عن تطبيق الهاتف. الإجمالي المرئي بعد هذا التحديث: 21 دورًا آليًا.</div>
        </div>
      </div>
    </section>
  );
}
