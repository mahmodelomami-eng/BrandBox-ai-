'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Flame, Image as ImageIcon, Loader2, Search, Sparkles, TrendingUp, Video, Wand2, Zap } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { createUserProject } from '../lib/projects/projects-service';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = {
  now: 'ترند الآن', personal: 'صور شخصية', comedy: 'كوميدي', social: 'اجتماعي', commercial: 'إعلانات', products: 'منتجات', video: 'فيديو', occasions: 'مناسبات', arabic: 'عربي', evergreen: 'دائم',
};

const FILTERS = [
  ['all', 'الكل'], ['now', 'ترند الآن'], ['personal', 'صور شخصية'], ['comedy', 'كوميدي'], ['social', 'اجتماعي'], ['commercial', 'إعلانات'], ['products', 'منتجات'], ['video', 'فيديو'], ['arabic', 'عربي'], ['evergreen', 'دائم'],
];

function substituteVariables(prompt, inputs, values) {
  return (inputs || []).reduce((result, field) => {
    const value = String(values[field.key] || '').trim();
    return value ? result.split(`{{${field.key}}}`).join(value) : result;
  }, prompt || '');
}

function ScoreBadge({ score }) {
  const hot = Number(score) >= 85;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${hot ? 'bb-accent-soft' : 'bb-button-secondary'}`}><TrendingUp size={12} /> {Math.round(Number(score || 0))}/100</span>;
}

function TrendArtwork({ trend, large = false }) {
  const Icon = trend.tool === 'video' ? Video : ImageIcon;
  const backgroundImage = trend.preview_url
    ? `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.18) 45%,rgba(0,0,0,.82)),url(${trend.preview_url})`
    : `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.18) 45%,rgba(0,0,0,.82)),${trend.preview_gradient || 'linear-gradient(145deg,#1b1d24,#08090c)'}`;
  return (
    <div className={`relative overflow-hidden bg-cover bg-center ${large ? 'aspect-[16/9] min-h-[260px]' : 'aspect-[4/3]'}`} style={{ backgroundImage }}>
      <div className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur"><Icon size={20} /></div>
      {trend.readiness !== 'live' && <div className="absolute left-4 top-4 rounded-full border border-amber-300/25 bg-amber-500/20 px-3 py-1.5 text-[10px] font-black text-amber-100 backdrop-blur">قريبًا · يحتاج صورة مرجعية</div>}
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div className="flex items-center gap-2 text-[10px] font-black text-white/65"><Flame size={12} className="text-[#ff3344]" /> Brand Box Trend Lab</div>
        <div className={`${large ? 'mt-2 text-2xl' : 'mt-1 text-lg'} font-black`}>{trend.title_ar}</div>
        <div className="mt-1 line-clamp-1 text-xs text-white/65">{trend.subtitle_ar}</div>
      </div>
    </div>
  );
}

export default function TrendLibrary() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function loadTrends() {
      setLoading(true); setError('');
      try {
        const response = await fetch('/api/v1/trends');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'TREND_LIBRARY_UNAVAILABLE');
        if (active) setTrends(Array.isArray(payload.trends) ? payload.trends : []);
      } catch {
        if (active) setError('تعذر تحميل ترندات Brand Box الآن.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTrends();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); };
  }, [selected]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = trends.filter((trend) => {
    const categoryMatch = category === 'all' || trend.category === category;
    const text = `${trend.title_ar} ${trend.subtitle_ar} ${trend.description_ar} ${(trend.tags || []).join(' ')} ${CATEGORY_LABELS[trend.category] || ''}`.toLowerCase();
    return categoryMatch && (!normalizedQuery || text.includes(normalizedQuery));
  });
  const hotCount = trends.filter((trend) => Number(trend.trend_score) >= 85).length;
  const evergreenCount = trends.filter((trend) => trend.lifecycle === 'evergreen').length;

  async function launchTrend(trend) {
    if (trend.readiness !== 'live' || ['reference_image', 'image_to_video'].includes(trend.generation_mode)) {
      setNotice('هذا الترند يحتاج صورة مرجعية حقيقية. تم حفظه في المكتبة، لكن لن نعرض تنفيذًا وهميًا قبل اكتمال Image-to-Image / Image-to-Video في الأداة المناسبة.');
      return;
    }
    if (authLoading) return;
    if (!user) { router.push('/auth?next=%2Ftemplates%2Ftrends'); return; }

    const inputs = Array.isArray(trend.required_inputs) ? trend.required_inputs : [];
    const missing = inputs.filter((field) => field.type !== 'image' && field.required && !String(values[field.key] || '').trim());
    if (missing.length) { setNotice(`أكمل ${missing.length} ${missing.length === 1 ? 'حقل مطلوب' : 'حقول مطلوبة'} أولًا.`); return; }

    const prompt = substituteVariables(trend.prompt_template, inputs, values);
    setCreating(true); setNotice('');
    try {
      const type = trend.tool === 'video' ? 'فيديو' : 'صورة';
      const path = trend.tool === 'video' ? '/projects/video/workspace' : '/projects/images/workspace';
      const project = await createUserProject({ name: trend.title_ar, industry: 'Trend Lab', description: `ترند Brand Box: ${trend.title_ar} — ${trend.description_ar}`, type, language: 'العربية', tone: 'إبداعي' });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        void fetch('/api/v1/trends', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ trendId: trend.id, projectId: project.id }) });
      }
      const params = new URLSearchParams({ project: project.id, prompt });
      if (trend.aspect_ratio) params.set('aspect', trend.aspect_ratio);
      router.push(`${path}?${params.toString()}`);
    } catch (err) {
      setNotice(err?.message || 'تعذر تجهيز مشروع الترند الآن.');
      setCreating(false);
    }
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      {selected && <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setSelected(null)}>
        <div role="dialog" aria-modal="true" className="bb-panel max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] border shadow-[var(--bb-shadow-lg)] sm:max-w-4xl sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
          <TrendArtwork trend={selected} large />
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2"><ScoreBadge score={selected.trend_score} /><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{CATEGORY_LABELS[selected.category] || selected.category}</span><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{selected.tool === 'video' ? 'Video AI' : 'Images AI'}</span><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{selected.aspect_ratio}</span></div>
            <h2 className="bb-text-primary mt-4 text-2xl font-black">{selected.title_ar}</h2><p className="bb-text-accent mt-2 text-sm font-black">{selected.subtitle_ar}</p><p className="bb-text-secondary mt-4 text-sm leading-7">{selected.description_ar}</p>

            {Array.isArray(selected.required_inputs) && selected.required_inputs.filter((field) => field.type !== 'image').length > 0 && <section className="bb-accent-soft mt-6 rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="bb-text-primary text-xs font-black">خصّص الترند</h3><p className="bb-text-tertiary mt-1 text-[10px]">غيّر القيم المطلوبة فقط، وسنجهّز البرومبت النهائي تلقائيًا.</p></div><Sparkles size={17} className="bb-text-accent" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{selected.required_inputs.filter((field) => field.type !== 'image').map((field) => <label key={field.key} className="bb-text-secondary text-[10px] font-black">{field.label}{field.required ? <span className="bb-text-accent"> *</span> : null}<input value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value.slice(0, 240) }))} placeholder={field.placeholder || ''} className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-xs outline-none" /></label>)}</div></section>}

            <section className="bb-surface-1 bb-border mt-5 rounded-2xl border p-4"><div className="bb-text-accent text-[10px] font-black">البرومبت الذي سيذهب إلى الأداة</div><p className="bb-text-secondary mt-2 line-clamp-6 text-xs leading-6">{substituteVariables(selected.prompt_template, Array.isArray(selected.required_inputs) ? selected.required_inputs : [], values)}</p></section>
            {notice && <div className="bb-danger-surface mt-4 rounded-xl border px-4 py-3 text-xs font-bold">{notice}</div>}
            <div className="mt-5 flex gap-2"><button type="button" className="bb-button-secondary flex-1 rounded-xl border py-3 text-xs font-black" onClick={() => { setSelected(null); setNotice(''); }}>رجوع</button><button type="button" disabled={creating} className="bb-button-primary flex-[1.6] rounded-xl py-3 text-xs font-black disabled:opacity-50" onClick={() => void launchTrend(selected)}>{creating ? 'جاري تجهيز المشروع...' : selected.readiness === 'live' ? 'جرّب هذا الترند' : 'محفوظ — بانتظار الصور المرجعية'}</button></div>
          </div>
        </div>
      </div>}

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="bb-text-tertiary flex items-center gap-2 text-xs"><span>القوالب</span><ArrowLeft size={13} className="rotate-180" /><span className="bb-text-secondary">Trend Lab</span></div>
        <section className="bb-dashboard-hero overflow-hidden rounded-[28px] border p-6 sm:p-8 lg:p-10"><div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center"><div><span className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black"><Flame size={14} /> ترندات تتجدد باستمرار</span><h1 className="bb-text-primary mt-5 text-3xl font-black leading-tight sm:text-5xl">Brand Box <span className="bb-text-accent">Trend Lab</span></h1><p className="bb-text-secondary mt-4 max-w-2xl text-sm leading-8">نحوّل آليات الترند العامة إلى أفكار Brand Box أصلية: عربي، اجتماعي، ترفيهي، منتجات وإعلانات وفيديو. لا ننسخ برومبتات أو أصول المنافسين.</p><div className="mt-6 flex flex-wrap gap-2 text-[10px] sm:text-xs"><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Flame size={14} className="bb-text-accent" /><strong>{hotCount}</strong> ترند ساخن</span><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><BadgeCheck size={14} className="text-[var(--bb-success)]" /><strong>{trends.length}</strong> منشور</span><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Wand2 size={14} className="bb-text-accent" /><strong>{evergreenCount}</strong> دائم</span></div></div>{trends[0] ? <div className="bb-card overflow-hidden rounded-3xl border p-2"><TrendArtwork trend={trends[0]} large /></div> : <div className="bb-panel min-h-64 rounded-3xl border" />}</div></section>

        <section className="bb-surface-elevated sticky top-20 z-30 rounded-2xl border p-3 backdrop-blur-xl"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex gap-2 overflow-x-auto">{FILTERS.map(([id, label]) => <button key={id} type="button" onClick={() => setCategory(id)} className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-xs font-black ${category === id ? 'bb-button-primary' : 'bb-button-secondary'}`}>{label}</button>)}</div><label className="bb-input flex items-center gap-2 rounded-xl border px-4 py-2.5 xl:w-[340px]"><Search size={15} className="bb-text-tertiary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن ترند أو فكرة..." className="bb-text-primary w-full bg-transparent text-xs outline-none" /></label></div></section>

        {error && <div className="bb-danger-surface rounded-2xl border p-5 text-sm font-bold">{error}</div>}
        {loading ? <div className="bb-panel grid min-h-72 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div> : filtered.length === 0 ? <div className="bb-panel bb-text-tertiary rounded-3xl border p-12 text-center text-sm">لا توجد ترندات مطابقة حاليًا.</div> : <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map((trend) => <article key={trend.id} className="bb-card group overflow-hidden rounded-[24px] border transition hover:-translate-y-1"><TrendArtwork trend={trend} /><div className="p-5"><div className="flex items-center justify-between gap-2"><ScoreBadge score={trend.trend_score} /><span className="bb-text-tertiary text-[10px] font-black">{CATEGORY_LABELS[trend.category] || trend.category}</span></div><p className="bb-text-secondary mt-4 line-clamp-3 text-xs leading-6">{trend.description_ar}</p><div className="bb-divider bb-text-tertiary mt-4 flex items-center justify-between border-t pt-4 text-[10px]"><span>{trend.aspect_ratio}</span><span>{Number(trend.use_count || 0)} استخدام</span></div><button type="button" onClick={() => { setSelected(trend); setValues({}); setNotice(''); }} className="bb-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black"><Zap size={15} /> {trend.readiness === 'live' ? (user ? 'جرّب هذا الترند' : 'سجّل الدخول للتجربة') : 'قريبًا — صورة مرجعية'}</button></div></article>)}</section>}
      </div>
    </main>
  );
}
