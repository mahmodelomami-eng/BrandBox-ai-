'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronDown, ImagePlus, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { listUserProjects } from '../lib/projects/projects-service';
import CreditCoin from './CreditCoin';
import ProjectToolNav from './ProjectToolNav';

const FALLBACK_MODEL = {
  id: 'openrouter/free',
  name: 'Free Models Router',
  vendor: 'OpenRouter',
  description: 'موجّه مجاني يختار نموذجًا مجانيًا متوافقًا تلقائيًا.',
  minimumPlan: 'free',
  free: true,
  dailyFreeLimit: 5,
  supportsVision: true,
};

const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

export default function ChatProjectWorkspace({ projectId, initialPrompt = '' }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [models, setModels] = useState([FALLBACK_MODEL]);
  const [modelId, setModelId] = useState(FALLBACK_MODEL.id);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);
  const [quoteCredits, setQuoteCredits] = useState(0);
  const [quoteIsFree, setQuoteIsFree] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [freeUsage, setFreeUsage] = useState(null);

  const selectedModel = models.find((model) => model.id === modelId) || models[0] || null;

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadModels() {
    const response = await fetch('/api/v1/ai/models?generationType=chat', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const rows = Array.isArray(payload.models) ? payload.models : [];
    setModels(rows);
    if (!rows.some((model) => model.id === modelId)) setModelId(rows[0]?.id || '');
  }

  async function loadHistory() {
    const token = await getToken();
    if (!token) return;
    const response = await fetch('/api/v1/generations', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const payload = await response.json();
    const rows = (Array.isArray(payload.generations) ? payload.generations : [])
      .filter((item) => item.project_id === projectId && item.generation_type === 'chat')
      .reverse();
    setHistory(rows);
  }

  async function fetchQuote(text, token, selectedModelId = modelId) {
    const cleanPrompt = String(text || '').trim();
    if (!cleanPrompt || !token || !selectedModelId) return { credits: 0, free: Boolean(selectedModel?.free) };
    const response = await fetch('/api/v1/pricing/quote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationType: 'chat',
        modelId: selectedModelId,
        prompt: cleanPrompt,
        settings: { maxTokens: 1400 },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر حساب تكلفة Credit.');
    return {
      credits: Math.max(0, Number(result.quote?.credits) || 0),
      free: Boolean(result.quote?.free),
    };
  }

  function clearImage() {
    setImageDataUrl('');
    setImageName('');
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!selectedModel?.supportsVision) {
      setError('الموديل المحدد لا يدعم تحليل الصور. اختر أداة تدعم Vision أولًا.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('الصور المدعومة: PNG وJPG وWEBP فقط.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('حجم الصورة يجب ألا يتجاوز 4 MB في النسخة التجريبية.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : '');
      setImageName(file.name);
      setError('');
    };
    reader.onerror = () => setError('تعذر قراءة الصورة.');
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [projects] = await Promise.all([listUserProjects(), loadModels()]);
        if (!mounted) return;
        const found = projects.find((item) => item.id === projectId) || null;
        if (!found) throw new Error('المشروع غير موجود أو لا تملك صلاحية الوصول إليه.');
        setProject(found);
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', authData.user.id).maybeSingle();
          if (mounted) setBalance(profile?.credit_balance ?? null);
        }
        await loadHistory();
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'تعذر تحميل مشروع الشات.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId, supabase]);

  useEffect(() => {
    if (imageDataUrl && !selectedModel?.supportsVision) clearImage();
    setQuoteCredits(selectedModel?.free ? 0 : 1);
    setQuoteIsFree(Boolean(selectedModel?.free));
  }, [modelId]);

  useEffect(() => {
    let cancelled = false;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !modelId) {
      setQuoteCredits(selectedModel?.free ? 0 : 1);
      setQuoteIsFree(Boolean(selectedModel?.free));
      setQuoteLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const token = await getToken();
        const quote = await fetchQuote(cleanPrompt, token, modelId);
        if (!cancelled) {
          setQuoteCredits(quote.credits);
          setQuoteIsFree(quote.free);
        }
      } catch {
        if (!cancelled) {
          setQuoteCredits(selectedModel?.free ? 0 : 1);
          setQuoteIsFree(Boolean(selectedModel?.free));
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [prompt, modelId]);

  async function sendMessage() {
    if (!prompt.trim() || sending || !modelId) return;
    setSending(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');

      const authoritativeQuote = await fetchQuote(prompt, token, modelId);
      setQuoteCredits(authoritativeQuote.credits);
      setQuoteIsFree(authoritativeQuote.free);
      if (!authoritativeQuote.free && balance != null && balance < authoritativeQuote.credits) {
        throw new Error(`الرصيد غير كافٍ. تحتاج ${authoritativeQuote.credits} Credit لهذه العملية.`);
      }

      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'chat',
          modelId,
          prompt: prompt.trim(),
          projectId,
          settings: {
            temperature: 0.7,
            maxTokens: 1400,
            ...(imageDataUrl && selectedModel?.supportsVision ? { imageDataUrl } : {}),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.error === 'MODEL_PLAN_REQUIRED') throw new Error(`هذه الأداة تتطلب باقة ${PLAN_LABELS[result.requiredPlan] || result.requiredPlan}.`);
        if (String(result.errorMessage || '').includes('FREE_USER_DAILY_LIMIT_REACHED')) throw new Error('وصلت إلى الحد المجاني اليومي لهذه الأداة. يمكنك استخدام Credit أو المحاولة غدًا.');
        if (String(result.errorMessage || '').includes('FREE_GLOBAL_DAILY_LIMIT_REACHED')) throw new Error('تم استهلاك حصة الاختبار المجانية للمنصة اليوم. الموديلات المدفوعة ما زالت متاحة بالـCredit.');
        throw new Error(result.errorMessage || result.error || 'تعذر تنفيذ المحادثة.');
      }
      setPrompt('');
      clearImage();
      setQuoteCredits(selectedModel?.free ? 0 : 1);
      setQuoteIsFree(Boolean(selectedModel?.free));
      setBalance(result.remainingBalance ?? balance);
      setFreeUsage(result.freeUsage || null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرسالة.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#050506] pt-24 text-white"><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#f31325]" /></div></main>;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#050506] text-white">
      <ProjectToolNav activeTool="chat" />
      <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-6 lg:px-6 xl:grid-cols-[1fr_360px]">
        <section className="order-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] xl:order-1">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-xs font-black text-[#ff3344]">مشروع شات</div>
              <h1 className="mt-1 text-xl font-black">{project?.name || 'مشروع الشات'}</h1>
            </div>
            <Link href="/projects/chat" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 hover:text-white">كل مشاريع الشات</Link>
          </div>

          <div className="min-h-[560px] space-y-5 overflow-y-auto p-5">
            {history.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171a21] text-[#ff3344]"><Bot size={30} /></span>
                <h2 className="mt-5 text-lg font-black">ابدأ أول محادثة في هذا المشروع</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-gray-500">اختر الأداة باسمها الحقيقي. النماذج المميزة بـ «مجاني» لا تخصم أي Credit ضمن حدود الاستخدام اليومية.</p>
              </div>
            ) : history.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="mr-auto max-w-[82%] rounded-2xl rounded-br-md bg-[#f31325] px-4 py-3 text-sm leading-7 text-white">{item.prompt}</div>
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#14171e] px-4 py-4 text-sm leading-7 text-gray-200">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-[#ff3344]"><Bot size={15} /> {models.find((model) => model.id === item.model)?.name || 'Brand Box AI'}</div>
                  {item.result_content || (item.status === 'failed' ? 'تعذر إكمال هذه الرسالة.' : 'تم حفظ الطلب ولم يصل رد بعد.')}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 bg-[#0d1016] p-4">
            {error && <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</div>}
            {!models.length && <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">لا توجد أدوات Chat مفعلة حاليًا. يمكن للمدير تفعيلها من AI Tools & Models.</div>}
            {freeUsage && quoteIsFree && <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-bold text-emerald-200">استخدامك المجاني اليوم: {freeUsage.userUsed} / {freeUsage.userLimit}</div>}
            {imageDataUrl && <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100"><span className="truncate">صورة مرفقة: {imageName}</span><button type="button" onClick={clearImage} className="rounded-lg p-1 hover:bg-white/10" aria-label="إزالة الصورة"><X size={15}/></button></div>}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-gray-500">تكلفة الرسالة</span>
              <span className={`flex items-center gap-2 font-black ${quoteIsFree ? 'text-emerald-300' : 'text-amber-200'}`}>
                {quoteLoading && <Loader2 size={13} className="animate-spin" />}
                {quoteIsFree ? 'مجاني · 0 Credit' : `حتى ${quoteCredits} Credit`}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={imageDataUrl ? 'اسأل عن الصورة المرفقة...' : 'اكتب رسالتك أو المهمة التي تريد تنفيذها داخل هذا المشروع...'} className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#171a21] p-4 text-sm leading-7 outline-none focus:border-[#f31325]/60" />
                {selectedModel?.supportsVision && <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[11px] font-black text-sky-200 transition hover:bg-sky-500/10"><ImagePlus size={15}/> إرفاق صورة للتحليل<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="hidden" /></label>}
              </div>
              <button type="button" onClick={sendMessage} disabled={sending || !prompt.trim() || !modelId} className="flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-[#f31325] px-2 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
                <span className="flex items-center gap-2">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} إرسال</span>
                <span className="text-[10px] font-bold text-white/70">{quoteIsFree ? '0 Credit' : `حتى ${quoteCredits}`}</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-white/10 bg-[#0d1016] p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f31325]/12 text-[#ff3344]"><MessageSquare size={22} /></span><div><div className="text-sm font-black">إعدادات الشات</div><div className="text-[11px] text-gray-500">اختر الأداة المشهورة التي تريدها</div></div></div>
          {project?.description && <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><div className="mb-2 font-black text-gray-300">سياق المشروع</div>{project.description}</div>}

          <label className="mt-6 block text-xs font-black text-gray-400">الأداة / الموديل</label>
          <div className="relative mt-2">
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!models.length} className="w-full appearance-none rounded-xl border border-white/10 bg-[#171a21] px-4 py-3 text-sm font-black outline-none focus:border-[#f31325]/55 disabled:opacity-40">
              {models.map((model) => <option key={model.id} value={model.id}>{model.free ? '★ مجاني — ' : ''}{model.name}{model.vendor ? ` — ${model.vendor}` : ''}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>

          {selectedModel && <div className={`mt-4 rounded-2xl border p-4 ${selectedModel.free ? 'border-emerald-500/20 bg-emerald-500/[.04]' : 'border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.10),transparent_42%),#11141a]'}`}>
            <div className={`text-[10px] font-black tracking-widest ${selectedModel.free ? 'text-emerald-300' : 'text-amber-300'}`}>{selectedModel.vendor || 'AI MODEL'}</div>
            <div className="mt-2 flex items-center gap-2 text-base font-black"><span>{selectedModel.name}</span>{selectedModel.free && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] text-emerald-300">مجاني</span>}</div>
            {selectedModel.description && <p className="mt-2 text-xs leading-6 text-gray-500">{selectedModel.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-gray-600"><span>متاح من {PLAN_LABELS[selectedModel.minimumPlan] || selectedModel.minimumPlan || 'Free'}</span>{selectedModel.supportsVision && <span>· يدعم تحليل الصور</span>}{selectedModel.free && selectedModel.dailyFreeLimit && <span>· حتى {selectedModel.dailyFreeLimit} طلبات/يوم في Pilot</span>}</div>
            {selectedModel.freeTierNote && <p className="mt-3 text-[10px] leading-5 text-gray-600">{selectedModel.freeTierNote}</p>}
          </div>}

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><Sparkles size={17} className="mb-2 text-[#ff3344]" /> الأدوات تأتي من كتالوج Brand Box، بينما OpenRouter يعمل كبوابة خلفية موحدة.</div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[.04] px-4 py-3 text-xs"><span className="text-gray-400">الرصيد المتاح</span><CreditCoin value={balance ?? 0} /></div>
          <Link href="/help" className="mt-3 block text-center text-xs font-black text-gray-500 transition hover:text-amber-200">كيف يعمل Credit والترحيل؟</Link>
        </aside>
      </div>
    </main>
  );
}
