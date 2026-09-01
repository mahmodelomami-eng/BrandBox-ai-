'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronDown, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { listUserProjects } from '../lib/projects/projects-service';
import ProjectToolNav from './ProjectToolNav';

function apiErrorMessage(code) {
  if (code === 'CHAT_MODEL_NOT_AVAILABLE') return 'هذا النموذج غير متاح حاليًا. تم تحديث قائمة النماذج المفعّلة.';
  if (code === 'CHAT_MODEL_CATALOG_UNAVAILABLE') return 'تعذر التحقق من نماذج الشات المتاحة حاليًا.';
  if (code === 'CHAT_MODEL_PRICING_UNAVAILABLE') return 'تسعير هذا النموذج غير مكتمل، لذلك لم يتم تنفيذ الطلب.';
  if (code === 'PROJECT_NOT_FOUND') return 'المشروع غير موجود أو لا تملك صلاحية الوصول إليه.';
  if (code === 'PROJECT_TOOL_MISMATCH') return 'هذا المشروع غير مخصص لأداة الشات.';
  return code || 'تعذر تنفيذ المحادثة.';
}

export default function ChatProjectWorkspace({ projectId, initialPrompt = '' }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [models, setModels] = useState([]);
  const [modelCatalogAvailable, setModelCatalogAvailable] = useState(true);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [modelId, setModelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadHistory() {
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams({ projectId, generationType: 'chat' });
    const response = await fetch(`/api/v1/generations?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const rows = (Array.isArray(payload.generations) ? payload.generations : []).reverse();
    const availableModels = (Array.isArray(payload.chatModels) ? payload.chatModels : [])
      .filter((item) => typeof item?.model_id === 'string' && item.model_id)
      .map((item) => ({
        id: item.model_id,
        name: item.display_name_ar || item.display_name_en || item.model_id,
        cost: Number.isFinite(Number(item.minimum_credits)) ? Math.max(1, Math.trunc(Number(item.minimum_credits))) : null,
      }));

    setHistory(rows);
    setModels(availableModels);
    setModelCatalogAvailable(payload.chatModelsAvailable !== false);
    setModelId((current) => availableModels.some((model) => model.id === current) ? current : (availableModels[0]?.id || ''));
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

  async function sendMessage() {
    if (!prompt.trim() || !modelId || sending) return;
    setSending(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'chat',
          modelId,
          prompt: prompt.trim(),
          projectId,
          settings: { temperature: 0.7, maxTokens: 1400 },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.errorMessage || apiErrorMessage(result.error));
      setPrompt('');
      setBalance(result.remainingBalance ?? balance);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرسالة.');
      await loadHistory();
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
            {!modelCatalogAvailable && <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">قائمة نماذج الشات غير متاحة مؤقتًا، لذلك تم إيقاف الإرسال لحماية الرصيد.</div>}
            <div className="flex gap-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="اكتب رسالتك أو المهمة التي تريد تنفيذها داخل هذا المشروع..." className="min-h-24 flex-1 resize-none rounded-2xl border border-white/10 bg-[#171a21] p-4 text-sm leading-7 outline-none focus:border-[#f31325]/60" />
              <button type="button" onClick={sendMessage} disabled={sending || !prompt.trim() || !modelId || !modelCatalogAvailable} className="flex w-28 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#f31325] text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} إرسال
              </button>
            </div>
          </div>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-white/10 bg-[#0d1016] p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f31325]/12 text-[#ff3344]"><MessageSquare size={22} /></span><div><div className="text-sm font-black">إعدادات الشات</div><div className="text-[11px] text-gray-500">النماذج المفعّلة من لوحة الإدارة</div></div></div>
          {project?.description && <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><div className="mb-2 font-black text-gray-300">سياق المشروع</div>{project.description}</div>}
          <label className="mt-6 block text-xs font-black text-gray-400">النموذج</label>
          <div className="relative mt-2">
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!models.length || !modelCatalogAvailable} className="w-full appearance-none rounded-xl border border-white/10 bg-[#171a21] px-4 py-3 text-sm font-black outline-none focus:border-[#f31325]/55 disabled:opacity-60">
              {!models.length && <option value="">لا توجد نماذج شات مفعّلة</option>}
              {models.map((model) => <option key={model.id} value={model.id}>{model.name}{model.cost !== null ? ` — ${model.cost} نقطة` : ''}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#11141a] p-4 text-xs leading-6 text-gray-500"><Sparkles size={17} className="mb-2 text-[#ff3344]" /> النموذج والتكلفة يتحقق منهما الخادم قبل خصم أي نقطة، وسياق المشروع يُضاف بعد التحقق من الملكية.</div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-4 py-3 text-xs"><span className="text-gray-400">الرصيد</span><span className="font-black text-[#ff3344]">{balance ?? '—'} نقطة</span></div>
        </aside>
      </div>
    </main>
  );
}
