'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Film,
  Flame,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { createUserProject } from '../lib/projects/projects-service';

const FILTERS = [
  ['all', 'الكل'],
  ['now', '🔥 ترند الآن'],
  ['arabic', 'عربي / ليبي'],
  ['social', 'اجتماعي'],
  ['commercial', 'إعلانات'],
  ['products', 'منتجات'],
  ['video', 'فيديو'],
  ['evergreen', 'Evergreen'],
  ['personal', 'صور شخصية'],
];

function replaceTokens(template, values) {
  let output = String(template || '');
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, String(value || '').trim());
  }
  return output;
}

function toolMeta(tool) {
  return tool === 'video'
    ? { label: 'فيديو AI', icon: Film, type: 'فيديو', path: '/projects/video/workspace' }
    : { label: 'صور AI', icon: ImageIcon, type: 'صورة', path: '/projects/images/workspace' };
}

function readinessLabel(trend) {
  if (trend.readiness === 'requires_reference') return 'يتطلب صورة مرجعية';
  if (trend.readiness === 'draft') return 'قيد التجهيز';
  return trend.lifecycle === 'evergreen' ? 'دائم' : 'رائج الآن';
}

export default function TrendLabLibrary() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [trends, setTrends] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/trends?limit=30', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'TREND_CATALOG_UNAVAILABLE');
      setTrends(Array.isArray(payload.trends) ? payload.trends : []);
    } catch {
      setError('تعذر تحميل الترندات الآن. أعد المحاولة دون فقد القوالب الأخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTrends(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTrends]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return trends;
    if (filter === 'evergreen') return trends.filter((trend) => trend.lifecycle === 'evergreen');
    return trends.filter((trend) => trend.category === filter);
  }, [filter, trends]);

  function openTrend(trend) {
    setSelected(trend);
    setNotice('');
    setValues(Object.fromEntries((Array.isArray(trend.requiredInputs) ? trend.requiredInputs : []).filter((field) => field.type !== 'image').map((field) => [field.key, ''])));
  }

  async function recordUse(trendId, projectId, prompt) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/v1/trends', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trendId, eventType: 'use', projectId, metadata: { promptLength: prompt.length } }),
      keepalive: true,
    }).catch(() => {});
  }

  async function applyTrend() {
    if (!selected || busy) return;
    if (selected.readiness !== 'live') {
      setNotice('هذا الترند محفوظ وجاهز داخل Trend Lab، لكنه يحتاج مسار صورة/فيديو مرجعي قبل تفعيله للمستخدمين. لن نظهر زرًا وهميًا حتى يصبح المسار مدعومًا فعليًا.');
      return;
    }
    const requiredTextFields = (Array.isArray(selected.requiredInputs) ? selected.requiredInputs : []).filter((field) => field.type !== 'image' && field.required);
    const missing = requiredTextFields.find((field) => !String(values[field.key] || '').trim());
    if (missing) {
      setNotice(`أكمل حقل «${missing.label}» أولًا.`);
      return;
    }
    if (!user) {
      router.push('/auth?next=%2Ftemplates');
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const tool = toolMeta(selected.tool);
      const project = await createUserProject({
        name: `ترند · ${selected.title}`,
        type: tool.type,
        description: selected.subtitle,
        industry: selected.category === 'products' || selected.category === 'commercial' ? 'التجارة والتسويق' : 'المحتوى والإبداع',
        language: 'العربية',
        tone: 'إبداعي',
      });
      let prompt = replaceTokens(selected.promptTemplate, values);
      if (selected.negativePrompt) prompt += `\n\nAvoid: ${selected.negativePrompt}`;
      await recordUse(selected.id, project.id, prompt);
      const params = new URLSearchParams({
        project: project.id,
        prompt,
        aspect: selected.aspectRatio || '9:16',
        source: 'trend-lab',
        trend: selected.slug,
      });
      router.push(`${tool.path}?${params.toString()}`);
    } catch {
      setNotice('تعذر تجهيز مشروع الترند الآن. أعد المحاولة؛ لم يتم خصم نقاط.');
      setBusy(false);
    }
  }

  return (
    <section dir="rtl" id="trend-lab" className="mx-auto w-full max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
      <div className="bb-dashboard-hero overflow-hidden rounded-[2rem] border p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black"><Flame size={14} /> BRAND BOX TREND LAB</div>
            <h2 className="bb-text-primary mt-4 text-2xl font-black sm:text-3xl">برومبتات وأفكار رائجة، جاهزة للتطبيق</h2>
            <p className="bb-text-secondary mt-3 text-sm leading-7">نحوّل ميكانيكية الترند إلى تنفيذ أصلي لبراند بوكس: عربي، تجاري، ترفيهي وعملي — مع متغيرات بسيطة بدل نسخ برومبتات الآخرين.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
            <Stat label="ترند منشور" value={trends.length} />
            <Stat label="الأعلى" value={trends.length ? `${Math.max(...trends.map((item) => Number(item.trendScore || 0)))}%` : '—'} />
            <Stat label="الأدوات" value="صور + فيديو" compact />
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-black transition ${filter === id ? 'bb-menu-item-active border-[var(--bb-accent-border)]' : 'bb-button-secondary'}`}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bb-panel mt-5 grid min-h-48 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div>
      ) : error ? (
        <div className="bb-danger-surface mt-5 rounded-3xl border p-6 text-center text-sm font-bold"><div>{error}</div><button type="button" onClick={() => void loadTrends()} className="bb-button-secondary mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2"><RefreshCw size={14} /> إعادة المحاولة</button></div>
      ) : filtered.length === 0 ? (
        <div className="bb-panel bb-text-tertiary mt-5 rounded-3xl border p-10 text-center text-sm">لا توجد ترندات منشورة ضمن هذا التصنيف حاليًا.</div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((trend) => {
            const ToolIcon = toolMeta(trend.tool).icon;
            return (
              <article key={trend.id} className="bb-card overflow-hidden rounded-3xl border shadow-[var(--bb-shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--bb-shadow-md)]">
                <button type="button" onClick={() => openTrend(trend)} className="block w-full text-right">
                  <div className="bb-media-canvas relative h-44 overflow-hidden" style={{ background: trend.previewGradient }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.12),transparent_28%)]" />
                    <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                      <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">{readinessLabel(trend)}</span>
                      <span className="flex items-center gap-1 rounded-full bg-[#f31325] px-2.5 py-1 text-[10px] font-black text-white"><TrendingUp size={11} /> {Math.round(Number(trend.trendScore || 0))}</span>
                    </div>
                    <div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-black/25 text-white shadow-2xl backdrop-blur"><ToolIcon size={28} /></div></div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] font-black text-white/80"><Sparkles size={12} /> {toolMeta(trend.tool).label}</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="bb-text-primary text-sm font-black leading-6">{trend.title}</h3>{trend.featured && <BadgeCheck size={17} className="bb-text-accent shrink-0" />}</div>
                    <p className="bb-text-tertiary mt-2 line-clamp-2 text-[11px] leading-6">{trend.subtitle}</p>
                    <div className="mt-4 flex items-center justify-between"><span className="bb-text-disabled text-[9px]">{Number(trend.useCount || 0).toLocaleString('ar-LY')} استخدام</span><span className="bb-text-accent inline-flex items-center gap-1 text-[10px] font-black">عرض الترند <ArrowLeft size={12} /></span></div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="trend-dialog-title" className="bb-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-5 shadow-[var(--bb-shadow-lg)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black"><Zap size={12} /> {readinessLabel(selected)} · Score {Math.round(Number(selected.trendScore || 0))}</div><h3 id="trend-dialog-title" className="bb-text-primary mt-3 text-xl font-black">{selected.title}</h3><p className="bb-text-secondary mt-2 text-xs leading-7">{selected.description}</p></div>
              <button type="button" onClick={() => setSelected(null)} className="bb-button-secondary grid h-9 w-9 shrink-0 place-items-center rounded-xl border">×</button>
            </div>

            <div className="bb-surface-1 mt-5 rounded-2xl border bb-border-subtle p-4">
              <div className="bb-text-primary flex items-center gap-2 text-xs font-black"><WandSparkles size={15} className="bb-text-accent" /> خصّص الفكرة</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(Array.isArray(selected.requiredInputs) ? selected.requiredInputs : []).map((field) => field.type === 'image' ? (
                  <div key={field.key} className="bb-card rounded-xl border p-3 sm:col-span-2"><div className="bb-text-secondary text-xs font-black">{field.label}</div><div className="bb-text-tertiary mt-1 text-[10px] leading-5">هذا الإدخال يحتاج Image-to-Image حقيقي. القالب محفوظ ولا يتم ادعاء دعمه قبل تفعيل مسار الصور المرجعية.</div></div>
                ) : (
                  <label key={field.key} className="bb-text-secondary text-[11px] font-bold">{field.label}{field.required && <span className="bb-text-accent"> *</span>}<input value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} maxLength={220} placeholder={field.placeholder || ''} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs outline-none" /></label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">{(selected.tags || []).map((tag) => <span key={tag} className="bb-card bb-text-tertiary rounded-full border px-2.5 py-1 text-[9px] font-bold">#{tag}</span>)}</div>
            {notice && <div className="bb-accent-soft mt-4 rounded-xl border px-4 py-3 text-xs font-bold">{notice}</div>}
            <button type="button" disabled={busy || selected.readiness === 'draft'} onClick={() => void applyTrend()} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black ${selected.readiness === 'live' ? 'bb-button-primary' : 'bb-button-secondary border'}`}>{busy ? <Loader2 size={17} className="animate-spin" /> : <WandSparkles size={17} />}{selected.readiness === 'live' ? (busy ? 'جاري تجهيز المشروع...' : 'جرّب هذا الترند الآن') : 'محفوظ — ينتظر دعم الصورة المرجعية'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, compact = false }) {
  return <div className="bb-card rounded-2xl border p-3 text-center"><div className="bb-text-primary text-sm font-black">{value}</div><div className={`bb-text-disabled mt-1 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>{label}</div></div>;
}
