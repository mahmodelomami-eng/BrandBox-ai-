'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Flame,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  Zap,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { createUserProject } from '../lib/projects/projects-service';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = {
  social: 'اجتماعي',
  comedy: 'كوميدي',
  commercial: 'إعلانات',
  products: 'منتجات',
  portraits: 'صور شخصية',
  video: 'فيديو',
  seasonal: 'مواسم',
  libyan: 'ليبي',
  arabic: 'عربي',
  evergreen: 'دائم',
};

const FILTERS = [
  ['all', 'الكل'],
  ['portraits', 'صور شخصية'],
  ['comedy', 'كوميدي'],
  ['social', 'اجتماعي'],
  ['commercial', 'إعلانات'],
  ['products', 'منتجات'],
  ['arabic', 'عربي'],
  ['evergreen', 'دائم'],
];

function substituteVariables(prompt, variables, values) {
  return (variables || []).reduce((result, field) => {
    const value = String(values[field.key] || '').trim();
    return value ? result.split(`{{${field.key}}}`).join(value) : result;
  }, prompt || '');
}

function trendBackground(trend) {
  if (trend.category === 'products') return 'radial-gradient(circle at 28% 22%,rgba(243,19,37,.28),transparent 34%),linear-gradient(145deg,#201116,#08090d 72%)';
  if (trend.category === 'comedy') return 'radial-gradient(circle at 72% 28%,rgba(255,174,66,.34),transparent 32%),linear-gradient(145deg,#23170b,#08090d 70%)';
  if (trend.category === 'portraits') return 'radial-gradient(circle at 68% 24%,rgba(123,97,255,.32),transparent 34%),linear-gradient(145deg,#171225,#08090d 72%)';
  if (trend.category === 'arabic' || trend.category === 'evergreen') return 'radial-gradient(circle at 32% 24%,rgba(243,19,37,.3),transparent 34%),linear-gradient(145deg,#1c1114,#08090d 72%)';
  return 'radial-gradient(circle at 60% 26%,rgba(59,130,246,.26),transparent 34%),linear-gradient(145deg,#0d1722,#08090d 72%)';
}

function ScoreBadge({ score }) {
  const hot = Number(score) >= 85;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${hot ? 'bb-accent-soft' : 'bb-button-secondary'}`}>
      <TrendingUp size={12} /> {score}/100
    </span>
  );
}

function TrendArtwork({ trend, large = false }) {
  const Icon = trend.content_type === 'video' ? Video : ImageIcon;
  return (
    <div className={`relative overflow-hidden ${large ? 'aspect-[16/9] min-h-[260px]' : 'aspect-[4/3]'}`} style={{ background: trendBackground(trend) }}>
      {trend.preview_url ? <img src={trend.preview_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.18)_45%,rgba(0,0,0,.82))]" />
      <div className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur"><Icon size={20} /></div>
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
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from('trend_templates')
        .select('id,slug,title_ar,subtitle_ar,description_ar,category,content_type,status,trend_score,prompt_template,negative_prompt,variables,model_hint,aspect_ratios,requires_reference,preview_url,social_caption_ar,cta_ar,usage_count,published_at')
        .in('status', ['published', 'evergreen'])
        .order('trend_score', { ascending: false })
        .order('published_at', { ascending: false });
      if (!active) return;
      if (loadError) setError('تعذر تحميل ترندات Brand Box الآن.');
      else setTrends(data || []);
      setLoading(false);
    }
    void loadTrends();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = trends.filter((trend) => {
    const categoryMatch = category === 'all' || trend.category === category;
    const text = `${trend.title_ar} ${trend.subtitle_ar} ${trend.description_ar} ${CATEGORY_LABELS[trend.category] || ''}`.toLowerCase();
    return categoryMatch && (!normalizedQuery || text.includes(normalizedQuery));
  });

  const hotCount = trends.filter((trend) => Number(trend.trend_score) >= 85).length;
  const evergreenCount = trends.filter((trend) => trend.status === 'evergreen').length;

  async function launchTrend(trend) {
    if (trend.requires_reference) {
      setNotice('هذا الترند يتطلب صورة مرجعية. لن نعرض قدرة وهمية قبل اكتمال Image-to-Image داخل استوديو الصور.');
      return;
    }
    if (authLoading) return;
    if (!user) {
      router.push('/auth?next=%2Ftemplates%2Ftrends');
      return;
    }

    const variables = Array.isArray(trend.variables) ? trend.variables : [];
    const missing = variables.filter((field) => field.required && !String(values[field.key] || '').trim());
    if (missing.length) {
      setNotice(`أكمل ${missing.length} ${missing.length === 1 ? 'حقل مطلوب' : 'حقول مطلوبة'} أولًا.`);
      return;
    }

    const prompt = substituteVariables(trend.prompt_template, variables, values);
    setCreating(true);
    setNotice('');
    try {
      const type = trend.content_type === 'video' ? 'فيديو' : 'صورة';
      const path = trend.content_type === 'video' ? '/projects/video/workspace' : '/projects/images/workspace';
      const project = await createUserProject({
        name: trend.title_ar,
        industry: 'Trend Lab',
        description: `ترند Brand Box: ${trend.title_ar} — ${trend.description_ar}`,
        type,
        language: 'العربية',
        tone: 'إبداعي',
      });

      void supabase.rpc('increment_trend_template_usage', { p_trend_id: trend.id });
      const params = new URLSearchParams({ project: project.id, prompt });
      const aspect = Array.isArray(trend.aspect_ratios) ? trend.aspect_ratios[0] : null;
      if (aspect) params.set('aspect', aspect);
      router.push(`${path}?${params.toString()}`);
    } catch (err) {
      setNotice(err?.message || 'تعذر تجهيز مشروع الترند الآن.');
      setCreating(false);
    }
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      {selected && (
        <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" className="bb-panel max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] border shadow-[var(--bb-shadow-lg)] sm:max-w-4xl sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
            <TrendArtwork trend={selected} large />
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2"><ScoreBadge score={selected.trend_score} /><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{CATEGORY_LABELS[selected.category] || selected.category}</span><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{selected.content_type === 'video' ? 'Video AI' : 'Images AI'}</span></div>
              <h2 className="bb-text-primary mt-4 text-2xl font-black">{selected.title_ar}</h2>
              <p className="bb-text-accent mt-2 text-sm font-black">{selected.subtitle_ar}</p>
              <p className="bb-text-secondary mt-4 text-sm leading-7">{selected.description_ar}</p>

              {Array.isArray(selected.variables) && selected.variables.length > 0 && (
                <section className="bb-accent-soft mt-6 rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="bb-text-primary text-xs font-black">خصّص الترند</h3><p className="bb-text-tertiary mt-1 text-[10px]">غيّر هذه القيم فقط، وسنجهّز البرومبت النهائي تلقائيًا.</p></div><Sparkles size={17} className="bb-text-accent" /></div>
                  <div className={`mt-4 grid gap-3 ${selected.variables.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                    {selected.variables.map((field) => (
                      <label key={field.key} className="bb-text-secondary text-[10px] font-black">{field.label}{field.required ? <span className="bb-text-accent"> *</span> : null}
                        <input value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value.slice(0, field.maxLength || 200) }))} placeholder={field.placeholder || ''} className="bb-input mt-2 w-full rounded-xl border px-4 py-3 text-xs outline-none" />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section className="bb-surface-1 bb-border mt-5 rounded-2xl border p-4">
                <div className="bb-text-accent text-[10px] font-black">البرومبت الذي سيذهب إلى الأداة</div>
                <p className="bb-text-secondary mt-2 line-clamp-6 text-xs leading-6">{substituteVariables(selected.prompt_template, Array.isArray(selected.variables) ? selected.variables : [], values)}</p>
              </section>

              {notice && <div className="bb-danger-surface mt-4 rounded-xl border px-4 py-3 text-xs font-bold">{notice}</div>}
              <div className="mt-5 flex gap-2"><button type="button" className="bb-button-secondary flex-1 rounded-xl border py-3 text-xs font-black" onClick={() => { setSelected(null); setNotice(''); }}>رجوع</button><button type="button" disabled={creating} className="bb-button-primary flex-[1.6] rounded-xl py-3 text-xs font-black disabled:opacity-50" onClick={() => void launchTrend(selected)}>{creating ? 'جاري تجهيز المشروع...' : selected.cta_ar || 'جرّب هذا الترند'}</button></div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="bb-text-tertiary flex items-center gap-2 text-xs"><span>القوالب</span><ArrowLeft size={13} className="rotate-180" /><span className="bb-text-secondary">Trend Lab</span></div>

        <section className="bb-dashboard-hero overflow-hidden rounded-[28px] border p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
            <div>
              <span className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black"><Flame size={14} /> ترندات تتجدد باستمرار</span>
              <h1 className="bb-text-primary mt-5 text-3xl font-black leading-tight sm:text-5xl">Brand Box <span className="bb-text-accent">Trend Lab</span></h1>
              <p className="bb-text-secondary mt-4 max-w-2xl text-sm leading-8">أفكار بصرية رائجة نحولها إلى قوالب أصلية قابلة للاستخدام: عربي، اجتماعي، كوميدي، منتجات وإعلانات. لا ننسخ برومبتات الآخرين؛ نأخذ الميكانيكية الإبداعية ونبني نسخة Brand Box الخاصة.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-[10px] sm:text-xs"><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Flame size={14} className="bb-text-accent" /><strong>{hotCount}</strong> ترند ساخن</span><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><BadgeCheck size={14} className="text-[var(--bb-success)]" /><strong>{trends.length}</strong> منشور</span><span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Wand2 size={14} className="bb-text-accent" /><strong>{evergreenCount}</strong> دائم</span></div>
            </div>
            {trends[0] ? <div className="bb-card overflow-hidden rounded-3xl border p-2"><TrendArtwork trend={trends[0]} large /></div> : <div className="bb-panel min-h-64 rounded-3xl border" />}
          </div>
        </section>

        <section className="bb-surface-elevated sticky top-20 z-30 rounded-2xl border p-3 backdrop-blur-xl">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex gap-2 overflow-x-auto">{FILTERS.map(([id, label]) => <button key={id} type="button" onClick={() => setCategory(id)} className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-xs font-black ${category === id ? 'bb-button-primary' : 'bb-button-secondary'}`}>{label}</button>)}</div><label className="bb-input flex items-center gap-2 rounded-xl border px-4 py-2.5 xl:w-[340px]"><Search size={15} className="bb-text-tertiary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن ترند أو فكرة..." className="bb-text-primary w-full bg-transparent text-xs outline-none" /></label></div>
        </section>

        {error && <div className="bb-danger-surface rounded-2xl border p-5 text-sm font-bold">{error}</div>}
        {loading ? <div className="bb-panel grid min-h-72 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div> : filtered.length === 0 ? <div className="bb-panel bb-text-tertiary rounded-3xl border p-12 text-center text-sm">لا توجد ترندات مطابقة حاليًا.</div> : <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map((trend) => <article key={trend.id} className="bb-card group overflow-hidden rounded-[24px] border transition hover:-translate-y-1"><TrendArtwork trend={trend} /><div className="p-5"><div className="flex items-center justify-between gap-2"><ScoreBadge score={trend.trend_score} /><span className="bb-text-tertiary text-[10px] font-black">{CATEGORY_LABELS[trend.category] || trend.category}</span></div><p className="bb-text-secondary mt-4 line-clamp-3 text-xs leading-6">{trend.description_ar}</p><div className="bb-divider bb-text-tertiary mt-4 flex items-center justify-between border-t pt-4 text-[10px]"><span>{trend.aspect_ratios?.join(' · ') || '4:5'}</span><span>{Number(trend.usage_count || 0)} استخدام</span></div><button type="button" onClick={() => { setSelected(trend); setValues({}); setNotice(''); }} className="bb-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black"><Zap size={15} /> {user ? trend.cta_ar || 'جرّب هذا الترند' : 'سجّل الدخول للتجربة'}</button></div></article>)}</section>}
      </div>
    </main>
  );
}
