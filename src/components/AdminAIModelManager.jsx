'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, CircleOff, Eye, EyeOff, Loader2, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const TYPE_LABELS = { chat: 'محادثة', image: 'صور', video: 'فيديو', audio: 'صوت', vision: 'رؤية', agent: 'وكيل', general: 'عام' };
const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

function statusClass(enabled) {
  return enabled
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-gray-600/30 bg-white/[.03] text-gray-500';
}

export default function AdminAIModelManager() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    modelId: '', displayName: '', vendorName: '', generationType: 'chat', toolCategory: 'chat', pricingMode: 'token',
    inputCostPerMillionUsd: '', outputCostPerMillionUsd: '', fixedProviderCostUsd: '', providerCostPerSecondUsd: '',
    minimumPlanId: 'free', minimumCredits: '1', reservationMultiplier: '1.25', descriptionAr: '', isEnabled: false, isVisibleToUsers: false,
  });

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function load() {
    setLoading(true); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/ai-models', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل أدوات AI.');
      setModels(Array.isArray(result.models) ? result.models : []);
      setCanManage(Boolean(result.canManage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل أدوات AI.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function patchModel(modelId, patch) {
    if (!canManage) return;
    setBusy(modelId); setError(''); setMessage('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/ai-models', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, ...patch }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحديث الأداة.');
      setModels((items) => items.map((item) => item.model_id === modelId ? result.model : item));
      setMessage('تم تحديث الأداة بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الأداة.'); }
    finally { setBusy(''); }
  }

  async function createModel(event) {
    event.preventDefault();
    setBusy('create'); setError(''); setMessage('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/ai-models', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر إضافة الأداة.');
      setModels((items) => [...items, result.model].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)));
      setCreateOpen(false);
      setForm({ modelId: '', displayName: '', vendorName: '', generationType: 'chat', toolCategory: 'chat', pricingMode: 'token', inputCostPerMillionUsd: '', outputCostPerMillionUsd: '', fixedProviderCostUsd: '', providerCostPerSecondUsd: '', minimumPlanId: 'free', minimumCredits: '1', reservationMultiplier: '1.25', descriptionAr: '', isEnabled: false, isVisibleToUsers: false });
      setMessage('تمت إضافة الأداة. اتركها متوقفة حتى تراجع السعر ثم فعّلها.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إضافة الأداة.'); }
    finally { setBusy(''); }
  }

  const enabledCount = models.filter((m) => m.is_enabled).length;
  const visibleCount = models.filter((m) => m.is_enabled && m.is_visible_to_users).length;

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] px-4 py-7 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin?section=ai" className="inline-flex items-center gap-2 text-xs font-black text-gray-500 hover:text-white"><ArrowRight size={15}/> العودة لمركز الإدارة</Link>
            <div className="mt-4 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f31325] shadow-[0_12px_32px_rgba(243,19,37,.22)]"><Sparkles size={23}/></span><div><h1 className="text-2xl font-black sm:text-3xl">AI Tools & Models</h1><p className="mt-1 text-sm text-gray-500">تحكم في الأدوات المشهورة التي تظهر للمستخدمين، والموديلات الخلفية وتسعيرها.</p></div></div>
          </div>
          <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>{canManage && <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-xs font-black"><Plus size={16}/> إضافة أداة / موديل</button>}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5"><div className="text-xs text-gray-500">إجمالي الموديلات</div><div className="mt-2 text-2xl font-black">{models.length}</div></div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.04] p-5"><div className="text-xs text-gray-500">مفعّلة</div><div className="mt-2 text-2xl font-black text-emerald-300">{enabledCount}</div></div>
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[.04] p-5"><div className="text-xs text-gray-500">ظاهرة للمستخدم</div><div className="mt-2 text-2xl font-black text-amber-300">{visibleCount}</div></div>
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[.04] p-4 text-xs leading-6 text-amber-100/80">
          اسم الأداة الحقيقي هو الذي سيظهر للمستخدم مثل <b>Gemini 3.7 Flash</b> أو <b>GPT Image</b> أو <b>Seedream</b>. اسم OpenRouter يبقى كمزود تجميعي في الخلفية، ويمكن إيقاف أي أداة دون حذف تاريخ استخدامها.
        </div>
        {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">{message}</div>}
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-200">{error}</div>}

        {loading && !models.length ? <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><Loader2 className="animate-spin text-[#f31325]"/></div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {models.map((model) => (
              <section key={model.model_id} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Bot size={22}/></span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{model.display_name_ar || model.display_name_en || model.model_id}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(model.is_enabled)}`}>{model.is_enabled ? 'فعال' : 'متوقف'}</span>{model.is_featured && <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-300">مميز</span>}</div><div className="mt-1 text-xs text-gray-500">{model.vendor_name || 'مزود غير محدد'} · {TYPE_LABELS[model.tool_category] || model.tool_category} · عبر {model.provider}</div><div className="mt-2 break-all font-mono text-[10px] text-gray-600">{model.model_id}</div></div>
                </div>
                {model.public_description_ar && <p className="mt-4 text-xs leading-6 text-gray-400">{model.public_description_ar}</p>}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="text-gray-600">التسعير</span><div className="mt-1 font-black">{model.pricing_mode}</div></div>
                  <div className="rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="text-gray-600">أقل Credit</span><div className="mt-1 font-black">{model.minimum_credits}</div></div>
                  <div className="rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="text-gray-600">أقل باقة</span><div className="mt-1 font-black">{PLAN_LABELS[model.minimum_plan_id] || model.minimum_plan_id || 'Free'}</div></div>
                  <div className="rounded-xl border border-white/[.07] bg-[#10131a] p-3"><span className="text-gray-600">Fallback</span><div className="mt-1 truncate font-black" title={model.fallback_model_id || ''}>{model.fallback_model_id || '—'}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={!canManage || busy === model.model_id} onClick={() => void patchModel(model.model_id, { isEnabled: !model.is_enabled })} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${model.is_enabled ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'} disabled:opacity-40`}>{busy === model.model_id ? <Loader2 size={14} className="animate-spin"/> : model.is_enabled ? <CircleOff size={14}/> : <CheckCircle2 size={14}/>} {model.is_enabled ? 'إيقاف الأداة' : 'تفعيل الأداة'}</button>
                  <button disabled={!canManage || !model.is_enabled || busy === model.model_id} onClick={() => void patchModel(model.model_id, { isVisibleToUsers: !model.is_visible_to_users })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-3 py-2 text-xs font-black text-gray-300 disabled:opacity-40">{model.is_visible_to_users ? <EyeOff size={14}/> : <Eye size={14}/>} {model.is_visible_to_users ? 'إخفاء عن المستخدم' : 'إظهار للمستخدم'}</button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <form onSubmit={createModel} className="relative my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1016] p-6 shadow-2xl">
            <button type="button" onClick={() => setCreateOpen(false)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={18}/></button>
            <h2 className="text-xl font-black">إضافة أداة / موديل</h2><p className="mt-2 text-xs leading-6 text-gray-500">أضف الاسم الحقيقي الذي سيشاهده المستخدم. اترك الأداة متوقفة حتى تتأكد من السعر والإمكانات.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="الاسم الظاهر: Gemini 3.7 Flash" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm outline-none focus:border-[#f31325]"/>
              <input required value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="الشركة: Google" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm outline-none focus:border-[#f31325]"/>
              <input required dir="ltr" value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} placeholder="google/gemini-3.7-flash" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm outline-none focus:border-[#f31325] sm:col-span-2"/>
              <select value={form.generationType} onChange={(e) => setForm({ ...form, generationType: e.target.value, toolCategory: e.target.value })} className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"><option value="chat">Chat</option><option value="image">Image</option><option value="video">Video</option><option value="audio">Audio</option></select>
              <select value={form.pricingMode} onChange={(e) => setForm({ ...form, pricingMode: e.target.value })} className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"><option value="token">Token</option><option value="image">Per image</option><option value="second">Per second</option><option value="dynamic">Dynamic</option></select>
              <select value={form.minimumPlanId} onChange={(e) => setForm({ ...form, minimumPlanId: e.target.value })} className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="business">Business</option></select>
              <input type="number" min="1" value={form.minimumCredits} onChange={(e) => setForm({ ...form, minimumCredits: e.target.value })} placeholder="Minimum Credit" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"/>
              {form.pricingMode === 'token' && <><input type="number" step="0.000001" min="0" value={form.inputCostPerMillionUsd} onChange={(e) => setForm({ ...form, inputCostPerMillionUsd: e.target.value })} placeholder="$ / 1M input" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"/><input type="number" step="0.000001" min="0" value={form.outputCostPerMillionUsd} onChange={(e) => setForm({ ...form, outputCostPerMillionUsd: e.target.value })} placeholder="$ / 1M output" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm"/></>}
              {form.pricingMode === 'image' && <input type="number" step="0.000001" min="0" value={form.fixedProviderCostUsd} onChange={(e) => setForm({ ...form, fixedProviderCostUsd: e.target.value })} placeholder="$ / image" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm sm:col-span-2"/>}
              {form.pricingMode === 'second' && <input type="number" step="0.000001" min="0" value={form.providerCostPerSecondUsd} onChange={(e) => setForm({ ...form, providerCostPerSecondUsd: e.target.value })} placeholder="$ / second" className="rounded-xl border border-white/10 bg-[#151923] p-3 text-sm sm:col-span-2"/>}
              <textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} placeholder="وصف مختصر للمستخدم" className="min-h-24 rounded-xl border border-white/10 bg-[#151923] p-3 text-sm sm:col-span-2"/>
            </div>
            <button disabled={busy === 'create'} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] py-3.5 text-sm font-black disabled:opacity-50">{busy === 'create' && <Loader2 size={16} className="animate-spin"/>} حفظ كأداة متوقفة</button>
          </form>
        </div>
      )}
    </main>
  );
}
