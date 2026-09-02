'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const BRIEF_STATUSES = [
  ['discovered', 'مكتشف'],
  ['shortlisted', 'مختار'],
  ['designing', 'قيد التصميم'],
  ['testing', 'قيد الاختبار'],
  ['approved', 'معتمد'],
  ['rejected', 'مرفوض'],
  ['published', 'منشور'],
];

const CATEGORIES = [
  ['now', 'ترند الآن'], ['personal', 'صور شخصية'], ['comedy', 'كوميدي'], ['social', 'اجتماعي'],
  ['commercial', 'إعلانات'], ['products', 'منتجات'], ['video', 'فيديو'], ['occasions', 'مناسبات'],
  ['arabic', 'عربي/ليبي'], ['evergreen', 'Evergreen'],
];

const scoreLabels = [
  ['viral', 'الانتشار'], ['shareability', 'قابلية المشاركة'], ['aiFit', 'ملاءمة AI'],
  ['arabicFit', 'ملاءمة الجمهور العربي'], ['brandFit', 'ملاءمة Brand Box'], ['commercialFit', 'القيمة التجارية'],
];

const emptyBrief = {
  title: '', concept: '', audience: '', contentAngle: '', sourcePlatform: 'internal', sourceUrl: '', sourceNote: '',
  scores: { viral: 70, shareability: 70, aiFit: 80, arabicFit: 80, brandFit: 80, commercialFit: 60 },
};

const emptyTemplate = {
  title: '', subtitle: '', description: '', slug: '', category: 'now', tool: 'images', generationMode: 'text_to_image',
  readiness: 'live', lifecycle: 'trending', promptTemplate: '', negativePrompt: '', aspectRatio: '9:16', trendScore: 80,
  tags: '', briefId: '', isPublished: false, isFeatured: false,
};

export default function AdminTrendLabPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState({ briefs: [], templates: [], stats: {}, capabilities: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [briefForm, setBriefForm] = useState(emptyBrief);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);

  const token = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const api = useCallback(async (path = '', options = {}) => {
    const accessToken = await token();
    if (!accessToken) throw new Error('انتهت جلسة الدخول.');
    const response = await fetch(`/api/v1/admin/trends${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'TREND_ADMIN_REQUEST_FAILED');
    return data;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPayload(await api()); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل Trend Lab.'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  async function createBrief(event) {
    event.preventDefault();
    setBusy('brief'); setMessage(''); setError('');
    try {
      await api('', { method: 'POST', body: JSON.stringify({ action: 'createBrief', ...briefForm }) });
      setBriefForm(emptyBrief);
      setMessage('تمت إضافة الفكرة إلى مسار Trend Intelligence.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ الفكرة.'); }
    finally { setBusy(''); }
  }

  async function createTemplate(event) {
    event.preventDefault();
    setBusy('template'); setMessage(''); setError('');
    try {
      const requiredInputs = [...templateForm.promptTemplate.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1]);
      const uniqueInputs = [...new Set(requiredInputs)].map((key) => ({ key, label: key.replaceAll('_', ' '), type: 'text', required: true, placeholder: '' }));
      await api('', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createTemplate',
          ...templateForm,
          tags: templateForm.tags.split(',').map((item) => item.trim()).filter(Boolean),
          requiredInputs: uniqueInputs,
        }),
      });
      setTemplateForm(emptyTemplate);
      setMessage('تم إنشاء قالب Trend Lab.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء القالب.'); }
    finally { setBusy(''); }
  }

  async function patch(body, key) {
    setBusy(key); setMessage(''); setError('');
    try {
      await api('', { method: 'PATCH', body: JSON.stringify(body) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث العنصر.'); }
    finally { setBusy(''); }
  }

  const canManage = payload.capabilities?.canManage === true;

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="bb-text-tertiary inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-black"><ArrowRight size={14} /> العودة إلى مركز الإدارة</Link>
            <div className="mt-4 flex items-center gap-3"><span className="bb-accent-soft grid h-12 w-12 place-items-center rounded-xl border"><Flame size={24} /></span><div><h1 className="bb-text-primary text-3xl font-black">Brand Box Trend Lab</h1><p className="bb-text-tertiary mt-1 text-sm">اكتشاف → تقييم → تصميم → اختبار → اعتماد → نشر → قياس.</p></div></div>
          </div>
          <div className="flex items-center gap-2"><Link href="/templates#trend-lab" className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><Eye size={15} /> معاينة المكتبة</Link><button type="button" onClick={() => void load()} className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button></div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="أفكار مكتشفة" value={payload.stats?.briefs || 0} icon={Bot} />
          <Metric label="قوالب منشورة" value={payload.stats?.published || 0} icon={CheckCircle2} />
          <Metric label="ترند الآن" value={payload.stats?.trending || 0} icon={TrendingUp} />
          <Metric label="استخدام آخر 30 يوم" value={payload.stats?.uses30d || 0} icon={Sparkles} />
        </section>

        {message && <div className="bb-accent-soft mt-5 rounded-xl border px-4 py-3 text-xs font-bold">{message}</div>}
        {error && <div className="bb-danger-surface mt-5 rounded-xl border px-4 py-3 text-xs font-bold">{error}</div>}

        {loading ? <div className="bb-panel mt-6 grid min-h-64 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div> : (
          <div className="mt-6 space-y-6">
            <section className="grid gap-5 xl:grid-cols-2">
              <form onSubmit={createBrief} className="bb-panel rounded-3xl border p-5 sm:p-6">
                <Header icon={Bot} title="إضافة Trend Brief" subtitle="للباحث الآلي أو الفريق: الفكرة والدليل والدرجة قبل التصميم." />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="عنوان الفكرة" value={briefForm.title} onChange={(value) => setBriefForm((current) => ({ ...current, title: value }))} required />
                  <Field label="الجمهور" value={briefForm.audience} onChange={(value) => setBriefForm((current) => ({ ...current, audience: value }))} />
                  <Field label="زاوية المحتوى" value={briefForm.contentAngle} onChange={(value) => setBriefForm((current) => ({ ...current, contentAngle: value }))} />
                  <label className="bb-text-secondary text-xs font-bold">المصدر<select value={briefForm.sourcePlatform} onChange={(event) => setBriefForm((current) => ({ ...current, sourcePlatform: event.target.value }))} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs"><option value="internal">داخلي / بحث عام</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="pinterest">Pinterest</option><option value="reddit">Reddit</option><option value="x">X</option><option value="web">Web</option></select></label>
                  <Field label="رابط المصدر" value={briefForm.sourceUrl} onChange={(value) => setBriefForm((current) => ({ ...current, sourceUrl: value }))} />
                  <Field label="ملاحظة المصدر" value={briefForm.sourceNote} onChange={(value) => setBriefForm((current) => ({ ...current, sourceNote: value }))} />
                </div>
                <label className="bb-text-secondary mt-3 block text-xs font-bold">الفكرة بالتفصيل<textarea required minLength={10} value={briefForm.concept} onChange={(event) => setBriefForm((current) => ({ ...current, concept: event.target.value }))} className="bb-input mt-1.5 min-h-28 w-full rounded-xl border p-3 text-xs leading-6" /></label>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{scoreLabels.map(([key, label]) => <label key={key} className="bb-card rounded-xl border p-3"><span className="bb-text-tertiary text-[10px] font-bold">{label}</span><div className="mt-2 flex items-center gap-2"><input type="range" min="0" max="100" value={briefForm.scores[key]} onChange={(event) => setBriefForm((current) => ({ ...current, scores: { ...current.scores, [key]: Number(event.target.value) } }))} className="w-full accent-[var(--bb-accent)]" /><span className="bb-text-primary w-7 text-left text-[10px] font-black">{briefForm.scores[key]}</span></div></label>)}</div>
                <button type="submit" disabled={!canManage || busy === 'brief'} className="bb-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-50">{busy === 'brief' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} إضافة إلى البحث</button>
              </form>

              <form onSubmit={createTemplate} className="bb-panel rounded-3xl border p-5 sm:p-6">
                <Header icon={Sparkles} title="تحويل الفكرة إلى قالب" subtitle="القالب لا يصبح عامًا إلا إذا تم نشره صراحة." />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="اسم القالب" value={templateForm.title} onChange={(value) => setTemplateForm((current) => ({ ...current, title: value }))} required />
                  <Field label="Slug اختياري" value={templateForm.slug} onChange={(value) => setTemplateForm((current) => ({ ...current, slug: value }))} />
                  <Field label="العنوان الفرعي" value={templateForm.subtitle} onChange={(value) => setTemplateForm((current) => ({ ...current, subtitle: value }))} required />
                  <label className="bb-text-secondary text-xs font-bold">الفكرة المرتبطة<select value={templateForm.briefId} onChange={(event) => setTemplateForm((current) => ({ ...current, briefId: event.target.value }))} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs"><option value="">بدون ربط</option>{payload.briefs.map((brief) => <option key={brief.id} value={brief.id}>{brief.title}</option>)}</select></label>
                  <label className="bb-text-secondary text-xs font-bold">التصنيف<select value={templateForm.category} onChange={(event) => setTemplateForm((current) => ({ ...current, category: event.target.value }))} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs">{CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                  <label className="bb-text-secondary text-xs font-bold">الأداة<select value={templateForm.tool} onChange={(event) => setTemplateForm((current) => ({ ...current, tool: event.target.value, generationMode: event.target.value === 'video' ? 'text_to_video' : 'text_to_image' }))} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs"><option value="images">صور AI</option><option value="video">فيديو AI</option></select></label>
                  <Field label="Trend Score" type="number" value={templateForm.trendScore} onChange={(value) => setTemplateForm((current) => ({ ...current, trendScore: Number(value) }))} />
                  <Field label="Tags مفصولة بفاصلة" value={templateForm.tags} onChange={(value) => setTemplateForm((current) => ({ ...current, tags: value }))} />
                </div>
                <label className="bb-text-secondary mt-3 block text-xs font-bold">وصف القالب<textarea required minLength={10} value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className="bb-input mt-1.5 min-h-20 w-full rounded-xl border p-3 text-xs" /></label>
                <label className="bb-text-secondary mt-3 block text-xs font-bold">Prompt Template<textarea required minLength={20} value={templateForm.promptTemplate} onChange={(event) => setTemplateForm((current) => ({ ...current, promptTemplate: event.target.value }))} placeholder="استخدم {{product}} أو {{location}} لإنشاء حقول تخصيص تلقائيًا." className="bb-input mt-1.5 min-h-32 w-full rounded-xl border p-3 font-mono text-xs leading-6" /></label>
                <div className="mt-3 flex flex-wrap gap-4"><label className="bb-text-secondary flex items-center gap-2 text-xs"><input type="checkbox" checked={templateForm.isPublished} onChange={(event) => setTemplateForm((current) => ({ ...current, isPublished: event.target.checked }))} /> نشر مباشرة</label><label className="bb-text-secondary flex items-center gap-2 text-xs"><input type="checkbox" checked={templateForm.isFeatured} onChange={(event) => setTemplateForm((current) => ({ ...current, isFeatured: event.target.checked }))} /> مميز</label></div>
                <button type="submit" disabled={!canManage || busy === 'template'} className="bb-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-50">{busy === 'template' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ القالب</button>
              </form>
            </section>

            <section className="bb-panel rounded-3xl border p-5 sm:p-6">
              <Header icon={TrendingUp} title="Trend Intelligence Pipeline" subtitle="الأفكار الأعلى تنتقل من الاكتشاف إلى التصميم والاختبار ثم النشر." />
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead className="bb-text-tertiary"><tr><th className="p-3">الفكرة</th><th className="p-3">Score</th><th className="p-3">المصدر</th><th className="p-3">الحالة</th><th className="p-3">اكتشاف</th></tr></thead><tbody>{payload.briefs.map((brief) => <tr key={brief.id} className="border-t bb-border-subtle"><td className="p-3"><div className="bb-text-primary font-black">{brief.title}</div><div className="bb-text-tertiary mt-1 max-w-lg line-clamp-2 text-[10px]">{brief.concept}</div></td><td className="p-3"><span className="bb-accent-soft rounded-full border px-2 py-1 font-black">{Number(brief.trend_score).toFixed(0)}</span></td><td className="p-3 bb-text-tertiary">{brief.source_platform}</td><td className="p-3"><select disabled={!canManage || busy === `brief-${brief.id}`} value={brief.workflow_status} onChange={(event) => void patch({ action: 'updateBriefStatus', id: brief.id, status: event.target.value }, `brief-${brief.id}`)} className="bb-input rounded-lg border px-2 py-2 text-[10px] font-black">{BRIEF_STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td><td className="p-3 bb-text-disabled text-[10px]">{new Date(brief.discovered_at).toLocaleDateString('ar-LY')}</td></tr>)}</tbody></table></div>
            </section>

            <section className="bb-panel rounded-3xl border p-5 sm:p-6">
              <Header icon={Flame} title="القوالب المنشورة والمسودات" subtitle="التحكم في Trending / Evergreen / Archive والنشر والتمييز." />
              <div className="mt-4 grid gap-3 lg:grid-cols-2">{payload.templates.map((template) => <article key={template.id} className="bb-card rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="bb-text-primary text-sm font-black">{template.title_ar}</h3>{template.is_featured && <Star size={14} className="bb-text-accent" fill="currentColor" />}</div><p className="bb-text-tertiary mt-1 text-[10px]">{template.tool} · {template.generation_mode} · Score {Number(template.trend_score).toFixed(0)}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${template.is_published ? 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' : 'bb-button-secondary'}`}>{template.is_published ? 'منشور' : 'مخفي'}</span></div><p className="bb-text-secondary mt-3 text-[11px] leading-6">{template.subtitle_ar}</p><div className="mt-4 grid grid-cols-3 gap-2"><button disabled={!canManage} type="button" onClick={() => void patch({ action: 'updateTemplate', id: template.id, isPublished: !template.is_published }, `template-${template.id}`)} className="bb-button-secondary flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[9px] font-black">{template.is_published ? <EyeOff size={12} /> : <Eye size={12} />} {template.is_published ? 'إخفاء' : 'نشر'}</button><button disabled={!canManage} type="button" onClick={() => void patch({ action: 'updateTemplate', id: template.id, isFeatured: !template.is_featured }, `template-${template.id}`)} className="bb-button-secondary flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[9px] font-black"><Star size={12} /> تمييز</button><button disabled={!canManage} type="button" onClick={() => void patch({ action: 'updateTemplate', id: template.id, lifecycle: template.lifecycle === 'trending' ? 'evergreen' : 'trending' }, `template-${template.id}`)} className="bb-button-secondary rounded-lg border px-2 py-2 text-[9px] font-black">{template.lifecycle === 'trending' ? '→ دائم' : '→ ترند'}</button></div></article>)}</div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, icon: Icon }) {
  return <div className="bb-card rounded-2xl border p-5"><div className="flex items-center justify-between"><div><div className="bb-text-tertiary text-[10px]">{label}</div><div className="bb-text-primary mt-2 text-2xl font-black">{value}</div></div><span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><Icon size={18} /></span></div></div>;
}

function Header({ icon: Icon, title, subtitle }) {
  return <div className="flex items-center gap-3"><span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><Icon size={18} /></span><div><h2 className="bb-text-primary text-base font-black">{title}</h2><p className="bb-text-tertiary mt-1 text-[10px]">{subtitle}</p></div></div>;
}

function Field({ label, value, onChange, required = false, type = 'text' }) {
  return <label className="bb-text-secondary text-xs font-bold">{label}{required && <span className="bb-text-accent"> *</span>}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="bb-input mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs outline-none" /></label>;
}
