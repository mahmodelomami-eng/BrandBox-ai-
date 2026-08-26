'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { listUserProjects } from '../lib/projects/projects-service';
import CreditCoin from './CreditCoin';
import ProjectToolNav from './ProjectToolNav';

const PILOT_MODEL = {
  id: 'google/gemini-3.7-flash',
  name: 'Brand Box Smart',
};

export default function ChatProjectWorkspace({ projectId, initialPrompt = '' }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);
  const [quoteCredits, setQuoteCredits] = useState(1);
  const [quoteLoading, setQuoteLoading] = useState(false);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
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

  async function fetchQuote(text, token) {
    const cleanPrompt = String(text || '').trim();
    if (!cleanPrompt || !token) return 1;
    const response = await fetch('/api/v1/pricing/quote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationType: 'chat',
        modelId: PILOT_MODEL.id,
        prompt: cleanPrompt,
        settings: { maxTokens: 1400 },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر حساب تكلفة Credit.');
    return Math.max(1, Number(result.quote?.credits) || 1);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const projects = await listUserProjects();
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
    let cancelled = false;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setQuoteCredits(1);
      setQuoteLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const token = await getToken();
        const credits = await fetchQuote(cleanPrompt, token);
        if (!cancelled) setQuoteCredits(credits);
      } catch {
        if (!cancelled) setQuoteCredits(1);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [prompt]);

  async function sendMessage() {
    if (!prompt.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');

      const authoritativeQuote = await fetchQuote(prompt, token);
      setQuoteCredits(authoritativeQuote);
      if (balance != null && balance < authoritativeQuote) {
        throw new Error(`الرصيد غير كافٍ. تحتاج ${authoritativeQuote} Credit لهذه العملية.`);
      }

      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'chat',
          modelId: PILOT_MODEL.id,
          prompt: prompt.trim(),
          projectId,
          settings: { temperature: 0.7, maxTokens: 1400 },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.errorMessage || result.error || 'تعذر تنفيذ المحادثة.');
      setPrompt('');
      setQuoteCredits(1);
      setBalance(result.remainingBalance ?? balance);
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
                <p className="mt-2 max-w-md text-sm leading-7 text-gray-500">كل رسالة ورد يتم حفظهما تلقائيًا داخل المشروع ويمكن الرجوع إليهما لاحقًا.</p>
              </div>
            ) : history.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="mr-auto max-w-[82%] rounded-2xl rounded-br-md bg-[#f31325] px-4 py-3 text-sm leading-7 text-white">{item.prompt}</div>
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#14171e] px-4 py-4 text-sm leading-7 text-gray-200">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-[#ff3344]"><Bot size={15} /> Brand Box AI</div>
                  {item.result_content || (item.status === 'failed' ? 'تعذر إكمال هذه الرسالة.' : 'تم حفظ الطلب ولم يصل رد بعد.')}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 bg-[#0d1016] p-4">
            {error && <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</div>}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-gray-500">التكلفة المحجوزة لهذه الرسالة</span>
              <span className="flex items-center gap-2 font-black text-amber-200">
                {quoteLoading && <Loader2 size={13} className="animate-spin" />}
                حتى {quoteCredits} Credit
              </span>
            </div>
            <div className="flex gap-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="اكتب رسالتك أو المهمة التي تريد تنفيذها داخل هذا المشروع..." className="min-h-24 flex-1 resize-none rounded-2xl border border-white/10 bg-[#171a21] p-4 text-sm leading-7 outline-none focus:border-[#f31325]/60" />
              <button type="button" onClick={sendMessage} disabled={sending || !prompt.trim()} className="flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-[#f31325] px-2 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
                <span className="flex items-center gap-2">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} إرسال</span>
                <span className="text-[10px] font-bold text-white/70">حتى {quoteCredits} Credit</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-white/10 bg-[#0d1016] p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f31325]/12 text-[#ff3344]"><MessageSquare size={22} /></span><div><div className="text-sm font-black">إعدادات الشات</div><div className="text-[11px] text-gray-500">محفوظ داخل المشروع</div></div></div>
          {project?.description && <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><div className="mb-2 font-black text-gray-300">سياق المشروع</div>{project.description}</div>}

          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.10),transparent_42%),#11141a] p-4">
            <div className="text-[10px] font-black tracking-widest text-amber-300">PILOT MODEL</div>
            <div className="mt-2 text-base font-black">{PILOT_MODEL.name}</div>
            <p className="mt-2 text-xs leading-6 text-gray-500">نموذج Brand Box الافتراضي للتجربة. الاسم التقني للمزود مخفي عن المستخدم في التشغيل العادي.</p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><Sparkles size={17} className="mb-2 text-[#ff3344]" /> يتم ربط كل توليد تلقائيًا بالمشروع الحالي، وتظهر تكلفة Credit قبل التنفيذ.</div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[.04] px-4 py-3 text-xs"><span className="text-gray-400">الرصيد المتاح</span><CreditCoin value={balance ?? 0} /></div>
          <Link href="/help" className="mt-3 block text-center text-xs font-black text-gray-500 transition hover:text-amber-200">كيف يعمل Credit والترحيل؟</Link>
        </aside>
      </div>
    </main>
  );
}
