'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronDown, Loader2, MessageSquare, RefreshCw, Send, Sparkles } from 'lucide-react';
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
  const [workspaceLoadFailed, setWorkspaceLoadFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);

  const selectedModel = models.find((model) => model.id === modelId) || models[0] || null;
  const insufficientCredits = Boolean(selectedModel?.cost && balance !== null && selectedModel.cost > balance);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadHistory = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
    const params = new URLSearchParams({ projectId, generationType: 'chat' });
    const response = await fetch(`/api/v1/generations?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiErrorMessage(payload.error) || 'تعذر تحميل سجل المحادثة.');
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
  }, [getToken, projectId]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setWorkspaceLoadFailed(false);
    setError('');
    try {
      const projects = await listUserProjects();
      const found = projects.find((item) => item.id === projectId) || null;
      if (!found) throw new Error('المشروع غير موجود أو لا تملك صلاحية الوصول إليه.');
      if (!/محادثة|chat|نص/i.test(found.type || '')) throw new Error('هذا المشروع غير مخصص لأداة الشات.');
      setProject(found);
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', authData.user.id).maybeSingle();
        setBalance(profile?.credit_balance ?? null);
      }
      await loadHistory();
    } catch (err) {
      setWorkspaceLoadFailed(true);
      setError(err instanceof Error ? err.message : 'تعذر تحميل مشروع الشات.');
    } finally {
      setLoading(false);
    }
  }, [loadHistory, projectId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  async function sendMessage() {
    if (!prompt.trim() || !modelId || sending || insufficientCredits) return;
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
          requestId: crypto.randomUUID(),
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
      try { await loadHistory(); } catch {}
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <main className="bb-app-canvas min-h-screen pt-24" dir="rtl"><div className="flex min-h-[60vh] items-center justify-center"><div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold"><Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تجهيز مشروع الشات...</div></div></main>;
  }

  if (workspaceLoadFailed) {
    return (
      <main dir="rtl" className="bb-app-canvas min-h-screen">
        <ProjectToolNav activeTool="chat" />
        <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
          <section className="bb-panel rounded-3xl border p-8 text-center">
            <span className="bb-danger-surface mx-auto grid h-16 w-16 place-items-center rounded-2xl border"><MessageSquare size={28} /></span>
            <h1 className="bb-text-primary mt-5 text-2xl font-black">تعذر تحميل مشروع الشات</h1>
            <p className="bb-text-secondary mx-auto mt-3 max-w-xl text-sm leading-7">{error} لم يتم اعتبار المحادثة فارغة، ويمكنك إعادة المحاولة دون مغادرة المشروع.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => void loadWorkspace()} className="bb-button-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"><RefreshCw size={16} /> إعادة المحاولة</button>
              <Link href="/projects/chat" className="bb-button-secondary inline-flex min-h-11 items-center rounded-xl border px-5 py-3 text-sm font-black">كل مشاريع الشات</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-screen">
      <ProjectToolNav activeTool="chat" />
      <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-6 lg:px-6 xl:grid-cols-[1fr_360px]">
        <section className="bb-panel order-2 overflow-hidden rounded-3xl border xl:order-1">
          <div className="bb-divider flex items-center justify-between border-b px-5 py-4">
            <div>
              <div className="bb-text-accent text-xs font-black">مشروع شات</div>
              <h1 className="bb-text-primary mt-1 text-xl font-black">{project?.name || 'مشروع الشات'}</h1>
            </div>
            <Link href="/projects/chat" className="bb-button-secondary rounded-xl border px-3 py-2 text-xs font-black">كل مشاريع الشات</Link>
          </div>

          <div className="bb-surface-1 min-h-[560px] space-y-5 overflow-y-auto p-5">
            {history.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <span className="bb-accent-soft flex h-16 w-16 items-center justify-center rounded-2xl border"><Bot size={30} /></span>
                <h2 className="bb-text-primary mt-5 text-lg font-black">ابدأ أول محادثة في هذا المشروع</h2>
                <p className="bb-text-secondary mt-2 max-w-md text-sm leading-7">كل رسالة ورد يتم حفظهما تلقائيًا داخل المشروع ويمكن الرجوع إليهما لاحقًا.</p>
              </div>
            ) : history.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="mr-auto max-w-[82%] rounded-2xl rounded-br-md bg-[var(--bb-accent)] px-4 py-3 text-sm leading-7 text-white shadow-[var(--bb-shadow-sm)]">{item.prompt}</div>
                <div className="bb-card ml-auto max-w-[88%] rounded-2xl rounded-bl-md border px-4 py-4 text-sm leading-7">
                  <div className="bb-text-accent mb-2 flex items-center gap-2 text-[11px] font-black"><Bot size={15} /> Brand Box AI</div>
                  <div className="bb-text-primary">{item.result_content || (item.status === 'failed' ? 'تعذر إكمال هذه الرسالة.' : 'تم حفظ الطلب ولم يصل رد بعد.')}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bb-surface-2 bb-divider border-t p-4">
            {error && <div className="bb-danger-surface mb-3 rounded-xl border px-3 py-2 text-xs font-bold" role="alert">{error}</div>}
            {!modelCatalogAvailable && <div className="bb-warning-surface mb-3 rounded-xl border px-3 py-2 text-xs font-bold" role="alert">قائمة نماذج الشات غير متاحة مؤقتًا، لذلك تم إيقاف الإرسال لحماية الرصيد.</div>}
            {insufficientCredits && <div className="bb-warning-surface mb-3 rounded-xl border px-3 py-2 text-xs font-bold" role="alert">رصيدك الحالي أقل من الحد الأدنى المتوقع لهذا النموذج. <Link href="/pricing" className="bb-text-accent font-black underline underline-offset-4">شحن الرصيد</Link></div>}
            <div className="flex gap-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="اكتب رسالتك أو المهمة التي تريد تنفيذها داخل هذا المشروع..." className="bb-input min-h-24 flex-1 resize-none rounded-2xl border p-4 text-sm leading-7 outline-none" />
              <button type="button" onClick={sendMessage} disabled={sending || !prompt.trim() || !modelId || !modelCatalogAvailable || insufficientCredits} className="bb-button-primary flex w-28 shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-black transition disabled:opacity-50">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} إرسال
              </button>
            </div>
          </div>
        </section>

        <aside className="bb-panel order-1 h-fit rounded-3xl border p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="bb-accent-soft flex h-11 w-11 items-center justify-center rounded-xl border"><MessageSquare size={22} /></span><div><div className="bb-text-primary text-sm font-black">إعدادات الشات</div><div className="bb-text-tertiary text-[11px]">النماذج المفعّلة من لوحة الإدارة</div></div></div>
          {project?.description && <div className="bb-surface-1 bb-border bb-text-secondary mt-5 rounded-2xl border p-4 text-xs leading-6"><div className="bb-text-primary mb-2 font-black">سياق المشروع</div>{project.description}</div>}
          <label className="bb-text-secondary mt-6 block text-xs font-black">النموذج</label>
          <div className="relative mt-2">
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!models.length || !modelCatalogAvailable} className="bb-input w-full appearance-none rounded-xl border px-4 py-3 text-sm font-black outline-none disabled:opacity-60">
              {!models.length && <option value="">لا توجد نماذج شات مفعّلة</option>}
              {models.map((model) => <option key={model.id} value={model.id}>{model.name}{model.cost !== null ? ` — ${model.cost} نقطة` : ''}</option>)}
            </select>
            <ChevronDown size={16} className="bb-text-tertiary pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="bb-surface-1 bb-border bb-text-secondary mt-5 rounded-2xl border p-4 text-xs leading-6"><Sparkles size={17} className="bb-text-accent mb-2" /> النموذج والتكلفة يتحقق منهما الخادم قبل خصم أي نقطة، وسياق المشروع يُضاف بعد التحقق من الملكية.</div>
          <div className="bb-accent-soft mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-xs"><span className="bb-text-secondary">الرصيد</span><span className="font-black">{balance ?? '—'} نقطة</span></div>
          {selectedModel?.cost !== null && selectedModel?.cost !== undefined && <div className="bb-text-tertiary mt-2 text-[10px]">الحد الأدنى الحالي للنموذج: <strong className="bb-text-primary">{selectedModel.cost} نقطة</strong></div>}
        </aside>
      </div>
    </main>
  );
}
