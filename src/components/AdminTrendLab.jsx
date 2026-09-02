'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Eye, Flame, Loader2, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const STATUSES = [
  ['all','الكل'],['discovered','مكتشف'],['review','مراجعة'],['designing','قيد التصميم'],['approved','معتمد'],['published','منشور'],['evergreen','دائم'],['archived','مؤرشف'],
];
const CATEGORY_OPTIONS = [['social','اجتماعي'],['comedy','كوميدي'],['commercial','إعلانات'],['products','منتجات'],['portraits','صور شخصية'],['video','فيديو'],['seasonal','موسمي'],['libyan','ليبي'],['arabic','عربي'],['evergreen','دائم']];
const EMPTY = {
  id: '', slug: '', titleAr: '', subtitleAr: '', descriptionAr: '', category: 'social', contentType: 'image', status: 'discovered', trendScore: 70,
  sourcePlatform: '', sourceUrl: '', sourceSignal: '', promptTemplate: '', negativePrompt: '', variablesText: '[]', modelHint: 'image generation', aspectRatiosText: '4:5,9:16', requiresReference: false, previewUrl: '', sampleUrlsText: '', socialCaptionAr: '', ctaAr: 'جرّب هذا الترند', expiresAt: '',
};

function toForm(item) {
  return {
    id: item.id || '', slug: item.slug || '', titleAr: item.title_ar || '', subtitleAr: item.subtitle_ar || '', descriptionAr: item.description_ar || '', category: item.category || 'social', contentType: item.content_type || 'image', status: item.status || 'discovered', trendScore: Number(item.trend_score || 0),
    sourcePlatform: item.source_platform || '', sourceUrl: item.source_url || '', sourceSignal: item.source_signal || '', promptTemplate: item.prompt_template || '', negativePrompt: item.negative_prompt || '', variablesText: JSON.stringify(item.variables || [], null, 2), modelHint: item.model_hint || '', aspectRatiosText: (item.aspect_ratios || []).join(','), requiresReference: Boolean(item.requires_reference), previewUrl: item.preview_url || '', sampleUrlsText: (item.sample_urls || []).join('\n'), socialCaptionAr: item.social_caption_ar || '', ctaAr: item.cta_ar || 'جرّب هذا الترند', expiresAt: item.expires_at ? String(item.expires_at).slice(0, 16) : '',
  };
}

function statusStyle(status) {
  if (['published','evergreen'].includes(status)) return { color: 'var(--bb-success)', background: 'var(--bb-success-soft)', borderColor: 'color-mix(in srgb,var(--bb-success) 25%,transparent)' };
  if (['approved','designing','review'].includes(status)) return { color: 'var(--bb-warning)', background: 'var(--bb-warning-soft)', borderColor: 'color-mix(in srgb,var(--bb-warning) 25%,transparent)' };
  return undefined;
}

export default function AdminTrendLab() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const accessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const suffix = filter === 'all' ? '' : `?status=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/v1/admin/trends${suffix}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل Trend Lab.');
      setRows(Array.isArray(payload.trends) ? payload.trends : []);
      setCanManage(Boolean(payload.canManage));
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل Trend Lab.'); }
    finally { setLoading(false); }
  }, [accessToken, filter]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function save() {
    if (!canManage || saving) return;
    setSaving(true); setMessage(''); setError('');
    try {
      let variables;
      try { variables = JSON.parse(form.variablesText || '[]'); } catch { throw new Error('صيغة متغيرات البرومبت JSON غير صحيحة.'); }
      if (!Array.isArray(variables)) throw new Error('متغيرات البرومبت يجب أن تكون Array.');
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const body = {
        id: form.id || undefined, slug: form.slug, titleAr: form.titleAr, subtitleAr: form.subtitleAr, descriptionAr: form.descriptionAr, category: form.category, contentType: form.contentType, status: form.status, trendScore: Number(form.trendScore || 0), sourcePlatform: form.sourcePlatform, sourceUrl: form.sourceUrl, sourceSignal: form.sourceSignal, promptTemplate: form.promptTemplate, negativePrompt: form.negativePrompt, variables, modelHint: form.modelHint, aspectRatios: form.aspectRatiosText.split(',').map((item) => item.trim()).filter(Boolean), requiresReference: form.requiresReference, previewUrl: form.previewUrl, sampleUrls: form.sampleUrlsText.split('\n').map((item) => item.trim()).filter(Boolean), socialCaptionAr: form.socialCaptionAr, ctaAr: form.ctaAr, expiresAt: form.expiresAt || null,
      };
      const response = await fetch('/api/v1/admin/trends', { method: form.id ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ الترند.');
      setMessage(form.id ? 'تم تحديث الترند.' : 'تم إنشاء الترند المرشح.');
      setForm(toForm(payload.trend));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ الترند.'); }
    finally { setSaving(false); }
  }

  async function quickStatus(item, status) {
    if (!canManage) return;
    setForm({ ...toForm(item), status });
    setMessage(`تم تجهيز «${item.title_ar}» لحالة ${STATUSES.find(([id]) => id === status)?.[1] || status}. اضغط حفظ لتأكيد التغيير مع مراجعة البرومبت.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const normalized = query.trim().toLowerCase();
  const visible = rows.filter((item) => !normalized || `${item.title_ar} ${item.subtitle_ar} ${item.category} ${item.source_platform || ''}`.toLowerCase().includes(normalized));
  const published = rows.filter((item) => ['published','evergreen'].includes(item.status)).length;
  const queue = rows.filter((item) => ['discovered','review','designing','approved'].includes(item.status)).length;
  const highScore = rows.filter((item) => Number(item.trend_score) >= 80).length;

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><Link href="/admin" className="bb-text-tertiary inline-flex items-center gap-2 text-xs font-black"><ArrowRight size={14} /> العودة إلى مركز الإدارة</Link><div className="mt-4 flex items-center gap-3"><span className="bb-accent-soft grid h-12 w-12 place-items-center rounded-xl border"><Flame size={23} /></span><div><h1 className="bb-text-primary text-3xl font-black">Trend Lab Control Center</h1><p className="bb-text-tertiary mt-1 text-xs">Discover → Review → Design → Approve → Publish → Measure</p></div></div></div>
          <div className="flex flex-wrap gap-2"><Link href="/templates/trends" className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><Eye size={15} /> المكتبة العامة</Link><button type="button" onClick={() => void load()} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button><button type="button" disabled={!canManage} onClick={() => setForm(EMPTY)} className="bb-button-primary flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black disabled:opacity-50"><Plus size={15} /> فكرة جديدة</button></div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="قيد المعالجة" value={queue} icon={Sparkles} /><Metric label="Trend Score ≥ 80" value={highScore} icon={TrendingUp} /><Metric label="منشور/دائم" value={published} icon={CheckCircle2} /></section>
        <section className="bb-accent-soft mt-5 rounded-2xl border p-4 text-xs leading-6"><div className="flex items-start gap-3"><ShieldCheck size={18} className="bb-text-accent mt-0.5 shrink-0" /><div><strong className="bb-text-primary">قاعدة النشر:</strong> الباحث لا ينشر تلقائيًا. أي فكرة جديدة تبدأ كمكتشفة/مراجعة، ثم يراجعها التصميم والـQA قبل `published`. لا ننسخ برومبتًا أو أصلًا بصريًا من منافس؛ نسجل فقط مصدر الإشارة ونبني تنفيذ Brand Box أصليًا.</div></div></section>

        {message && <div className="bb-accent-soft mt-5 rounded-xl border px-4 py-3 text-xs font-bold">{message}</div>}
        {error && <div className="bb-danger-surface mt-5 rounded-xl border px-4 py-3 text-xs font-bold">{error}</div>}

        <section className="bb-panel mt-6 rounded-3xl border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="bb-text-primary text-lg font-black">{form.id ? 'تحرير الترند' : 'إضافة فكرة مرشحة'}</h2><p className="bb-text-tertiary mt-1 text-[10px]">احفظ المصدر كإشارة بحث فقط، واكتب البرومبت الأصلي الخاص ببراند بوكس.</p></div><span className="bb-text-tertiary text-[10px]">{canManage ? 'صلاحية إدارة فعالة' : 'قراءة فقط'}</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Slug"><input value={form.slug} onChange={(e) => update('slug', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="العنوان"><input value={form.titleAr} onChange={(e) => update('titleAr', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="التصنيف"><select value={form.category} onChange={(e) => update('category', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs">{CATEGORY_OPTIONS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => update('status', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs">{STATUSES.filter(([id]) => id !== 'all').map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
            <Field label="Trend Score"><input type="number" min="0" max="100" value={form.trendScore} onChange={(e) => update('trendScore', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="نوع المحتوى"><select value={form.contentType} onChange={(e) => update('contentType', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs"><option value="image">صورة</option><option value="video">فيديو</option><option value="mixed">مختلط</option></select></Field>
            <Field label="المصدر/المنصة"><input value={form.sourcePlatform} onChange={(e) => update('sourcePlatform', e.target.value)} placeholder="TikTok / Instagram / Pinterest..." className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="رابط الإشارة"><input value={form.sourceUrl} onChange={(e) => update('sourceUrl', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="النسب"><input value={form.aspectRatiosText} onChange={(e) => update('aspectRatiosText', e.target.value)} placeholder="4:5,9:16" className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="Model hint"><input value={form.modelHint} onChange={(e) => update('modelHint', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="CTA"><input value={form.ctaAr} onChange={(e) => update('ctaAr', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
            <Field label="Preview URL"><input value={form.previewUrl} onChange={(e) => update('previewUrl', e.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs" /></Field>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="العنوان الفرعي"><textarea value={form.subtitleAr} onChange={(e) => update('subtitleAr', e.target.value)} rows={2} className="bb-input w-full rounded-xl border p-3 text-xs" /></Field><Field label="لماذا هو رائج / Source signal"><textarea value={form.sourceSignal} onChange={(e) => update('sourceSignal', e.target.value)} rows={2} className="bb-input w-full rounded-xl border p-3 text-xs" /></Field><Field label="الوصف"><textarea value={form.descriptionAr} onChange={(e) => update('descriptionAr', e.target.value)} rows={4} className="bb-input w-full rounded-xl border p-3 text-xs" /></Field><Field label="Caption التسويقي"><textarea value={form.socialCaptionAr} onChange={(e) => update('socialCaptionAr', e.target.value)} rows={4} className="bb-input w-full rounded-xl border p-3 text-xs" /></Field></div>
          <Field label="Prompt Template"><textarea value={form.promptTemplate} onChange={(e) => update('promptTemplate', e.target.value)} rows={6} className="bb-input mt-2 w-full rounded-xl border p-3 font-mono text-xs leading-6" /></Field>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Negative Prompt"><textarea value={form.negativePrompt} onChange={(e) => update('negativePrompt', e.target.value)} rows={4} className="bb-input w-full rounded-xl border p-3 text-xs" /></Field><Field label="Variables JSON"><textarea value={form.variablesText} onChange={(e) => update('variablesText', e.target.value)} rows={4} className="bb-input w-full rounded-xl border p-3 font-mono text-xs" /></Field></div>
          <label className="bb-text-secondary mt-4 inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.requiresReference} onChange={(e) => update('requiresReference', e.target.checked)} /> يتطلب صورة مرجعية فعلية</label>
          <button type="button" onClick={() => void save()} disabled={!canManage || saving} className="bb-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} {form.id ? 'حفظ التعديلات' : 'إضافة إلى خط المعالجة'}</button>
        </section>

        <section className="mt-6"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto">{STATUSES.map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black ${filter === id ? 'bb-button-primary' : 'bb-button-secondary'}`}>{label}</button>)}</div><label className="bb-input flex items-center gap-2 rounded-xl border px-4 py-2.5 lg:w-80"><Search size={14} className="bb-text-tertiary" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..." className="bb-text-primary w-full bg-transparent text-xs outline-none" /></label></div>
          {loading ? <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border"><Loader2 className="bb-text-accent animate-spin" /></div> : <div className="grid gap-4 lg:grid-cols-2">{visible.map((item) => <article key={item.id} className="bb-card rounded-2xl border p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border px-2.5 py-1 text-[10px] font-black" style={statusStyle(item.status)}>{STATUSES.find(([id]) => id === item.status)?.[1] || item.status}</span><span className="bb-button-secondary rounded-full border px-2.5 py-1 text-[10px] font-black">{item.trend_score}/100</span></div><h3 className="bb-text-primary mt-3 text-base font-black">{item.title_ar}</h3><p className="bb-text-tertiary mt-1 text-[10px]">{item.slug} · {item.source_platform || 'Brand Box'}</p></div><button type="button" onClick={() => { setForm(toForm(item)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bb-button-secondary rounded-xl border px-3 py-2 text-[10px] font-black">تحرير</button></div><p className="bb-text-secondary mt-3 line-clamp-3 text-xs leading-6">{item.description_ar}</p><div className="bb-divider mt-4 flex flex-wrap gap-2 border-t pt-4">{item.status === 'discovered' && <button onClick={() => void quickStatus(item,'review')} className="bb-button-secondary rounded-lg border px-2.5 py-2 text-[10px] font-black">إلى المراجعة</button>}{item.status === 'review' && <button onClick={() => void quickStatus(item,'designing')} className="bb-button-secondary rounded-lg border px-2.5 py-2 text-[10px] font-black">إلى التصميم</button>}{item.status === 'designing' && <button onClick={() => void quickStatus(item,'approved')} className="bb-button-secondary rounded-lg border px-2.5 py-2 text-[10px] font-black">اعتماد</button>}{item.status === 'approved' && <button onClick={() => void quickStatus(item,'published')} className="bb-button-primary rounded-lg px-2.5 py-2 text-[10px] font-black">تجهيز للنشر</button>}{item.status === 'published' && <button onClick={() => void quickStatus(item,'evergreen')} className="bb-button-secondary rounded-lg border px-2.5 py-2 text-[10px] font-black">تحويل إلى دائم</button>}{item.status !== 'archived' && <button onClick={() => void quickStatus(item,'archived')} className="bb-button-secondary rounded-lg border px-2.5 py-2 text-[10px] font-black">أرشفة</button>}</div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon: Icon }) { return <div className="bb-card rounded-2xl border p-5"><Icon size={17} className="bb-text-accent" /><div className="bb-text-tertiary mt-3 text-xs">{label}</div><div className="bb-text-primary mt-1 text-3xl font-black">{value}</div></div>; }
function Field({ label, children }) { return <label className="bb-text-secondary block text-[10px] font-black">{label}<div className="mt-2">{children}</div></label>; }
