'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Film,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Video,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';
import ProjectToolNav from './ProjectToolNav';

const RATIOS = [
  { value: '1280:720', label: '16:9 أفقي' },
  { value: '720:1280', label: '9:16 عمودي' },
];
const DURATIONS = Array.from({ length: 9 }, (_, index) => index + 2);

function initialRatio(value) {
  if (value === '9:16' || value === '720:1280') return '720:1280';
  return '1280:720';
}

function initialDuration(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return Number.isInteger(parsed) && parsed >= 2 && parsed <= 10 ? parsed : 5;
}

function statusMeta(status) {
  if (status === 'completed') return { label: 'مكتمل', className: 'border-[color-mix(in_srgb,var(--bb-success)_28%,transparent)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' };
  if (status === 'failed') return { label: 'فشل', className: 'border-[color-mix(in_srgb,var(--bb-danger)_28%,transparent)] bg-[var(--bb-danger-soft)] text-[var(--bb-danger)]' };
  if (status === 'cancelled') return { label: 'ملغي', className: 'bb-button-secondary' };
  if (status === 'queued') return { label: 'في قائمة الانتظار', className: 'border-[color-mix(in_srgb,var(--bb-warning)_28%,transparent)] bg-[var(--bb-warning-soft)] text-[var(--bb-warning)]' };
  return { label: 'جاري التوليد', className: 'border-[color-mix(in_srgb,var(--bb-info)_28%,transparent)] bg-[var(--bb-info-soft)] text-[var(--bb-info)]' };
}

export default function VideoProjectWorkspace({ projectId, initialPrompt = '', templateSettings = {} }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { creditBalance, refreshProfile } = useAuth();
  const [project, setProject] = useState(null);
  const [models, setModels] = useState([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt.slice(0, 1000));
  const [modelId, setModelId] = useState('');
  const [ratio, setRatio] = useState(() => initialRatio(templateSettings?.ratio));
  const [duration, setDuration] = useState(() => initialDuration(templateSettings?.duration));
  const [loading, setLoading] = useState(true);
  const [workspaceLoadFailed, setWorkspaceLoadFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingId, setRefreshingId] = useState('');
  const [message, setMessage] = useState(initialPrompt ? { type: 'success', text: 'تم تحميل برومبت القالب وإعداداته. يمكنك تعديله قبل التوليد.' } : null);

  const selectedModel = models.find((model) => model.modelId === modelId) || models[0] || null;
  const priceEstimate = selectedModel?.creditsPerSecond ? selectedModel.creditsPerSecond * duration : null;
  const generationReady = Boolean(providerConfigured && selectedModel?.pricingReady && selectedModel?.creditsPerSecond);
  const insufficientCredits = Boolean(priceEstimate && creditBalance !== null && creditBalance !== undefined && priceEstimate > creditBalance);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadDrafts = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const response = await fetch(`/api/v1/project-tool-items?projectId=${encodeURIComponent(projectId)}&tool=video`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return;
    const payload = await response.json();
    setDrafts(Array.isArray(payload.items) ? payload.items : []);
  }, [getToken, projectId]);

  const loadWorkspace = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
    const response = await fetch(`/api/v1/video-generations?projectId=${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذر تحميل مساحة توليد الفيديو.');
    setProject(payload.project || null);
    setProviderConfigured(Boolean(payload.providerConfigured));
    const nextModels = Array.isArray(payload.models) ? payload.models : [];
    setModels(nextModels);
    setModelId((current) => nextModels.some((model) => model.modelId === current) ? current : (nextModels[0]?.modelId || ''));
    setGenerations(Array.isArray(payload.generations) ? payload.generations : []);
  }, [getToken, projectId]);

  const reloadWorkspace = useCallback(async () => {
    setLoading(true);
    setWorkspaceLoadFailed(false);
    setMessage(null);
    try {
      await Promise.all([loadWorkspace(), loadDrafts()]);
    } catch (error) {
      setWorkspaceLoadFailed(true);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل مساحة الفيديو.' });
    } finally {
      setLoading(false);
    }
  }, [loadDrafts, loadWorkspace]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([loadWorkspace(), loadDrafts()]);
      } catch (error) {
        if (mounted) {
          setWorkspaceLoadFailed(true);
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل مساحة الفيديو.' });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loadDrafts, loadWorkspace]);

  const refreshGeneration = useCallback(async (generationId, silent = false) => {
    const token = await getToken();
    if (!token) return;
    if (!silent) setRefreshingId(generationId);
    try {
      const response = await fetch('/api/v1/video-generations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', generationId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!silent) setMessage({ type: 'error', text: result.error || 'تعذر تحديث حالة الفيديو.' });
        return;
      }
      setGenerations((current) => current.map((item) => item.id === generationId
        ? {
            ...item,
            status: result.status || item.status,
            credits_reserved: result.creditsReserved ?? item.credits_reserved,
            credits_consumed: result.creditsConsumed ?? item.credits_consumed,
            resultUrl: result.resultUrl || item.resultUrl,
            error_message: result.errorCode || item.error_message,
          }
        : item));
      if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
        if (refreshProfile) void refreshProfile();
      }
      if (!silent && result.errorMessage) setMessage({ type: result.success ? 'info' : 'error', text: result.errorMessage });
    } finally {
      if (!silent) setRefreshingId('');
    }
  }, [getToken, refreshProfile]);

  useEffect(() => {
    const active = generations.filter((item) => item.status === 'queued' || item.status === 'processing');
    if (active.length === 0) return undefined;
    const delay = 6000 + Math.floor(Math.random() * 1200);
    const timer = window.setTimeout(() => {
      void Promise.all(active.map((item) => refreshGeneration(item.id, true)));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [generations, refreshGeneration]);

  async function generateVideo() {
    if (!generationReady || !prompt.trim() || generating || insufficientCredits) return;
    setGenerating(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const response = await fetch('/api/v1/video-generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          modelId: selectedModel.modelId,
          prompt: prompt.trim(),
          requestId,
          settings: { ratio, duration, quality: 'standard' },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.generationId) throw new Error(result.errorMessage || result.error || 'تعذر بدء توليد الفيديو.');
      setGenerations((current) => [{
        id: result.generationId,
        project_id: projectId,
        model: selectedModel.modelId,
        prompt: prompt.trim(),
        settings: { ratio, duration, quality: 'standard' },
        status: result.status,
        credits_reserved: result.creditsReserved,
        credits_consumed: result.creditsConsumed,
        created_at: new Date().toISOString(),
        resultUrl: null,
      }, ...current.filter((item) => item.id !== result.generationId)]);
      setMessage({ type: 'success', text: 'تم إرسال الفيديو للتوليد. ستتحدث حالته تلقائيًا كل عدة ثوانٍ.' });
      if (refreshProfile) void refreshProfile();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر بدء توليد الفيديو.' });
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!prompt.trim() || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/project-tool-items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tool: 'video',
          prompt: prompt.trim(),
          settings: { ratio: ratio === '1280:720' ? '16:9' : '9:16', duration: `${duration} ثوانٍ`, quality: '720p' },
          status: 'draft',
          itemType: 'draft',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.item) throw new Error(payload.error || 'تعذر حفظ المسودة.');
      setDrafts((current) => [payload.item, ...current]);
      setMessage({ type: 'success', text: 'تم حفظ المسودة داخل المشروع.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ المسودة.' });
    } finally {
      setSaving(false);
    }
  }

  function retryGeneration(item) {
    setPrompt(String(item.prompt || '').slice(0, 1000));
    const itemRatio = item.settings?.ratio;
    setRatio(itemRatio === '720:1280' ? '720:1280' : '1280:720');
    setDuration(initialDuration(item.settings?.duration));
    setMessage({ type: 'info', text: 'تم تحميل إعدادات المحاولة السابقة. راجعها ثم اضغط توليد الفيديو لبدء مهمة جديدة.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <main className="bb-app-canvas min-h-screen pt-24" dir="rtl">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold">
            <Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تجهيز استوديو الفيديو...
          </div>
        </div>
      </main>
    );
  }

  if (workspaceLoadFailed) {
    return (
      <main dir="rtl" className="bb-app-canvas min-h-screen">
        <ProjectToolNav activeTool="video" />
        <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
          <section className="bb-panel rounded-3xl border p-8 text-center">
            <span className="bb-danger-surface mx-auto grid h-16 w-16 place-items-center rounded-2xl border"><AlertTriangle size={28} /></span>
            <h1 className="bb-text-primary mt-5 text-2xl font-black">تعذر تحميل مساحة الفيديو</h1>
            <p className="bb-text-secondary mx-auto mt-3 max-w-xl text-sm leading-7">{message?.text || 'تعذر الاتصال ببيانات المشروع. لم يتم اعتبار المساحة فارغة ولم نفقد البرومبت أو إعدادات القالب.'}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => void reloadWorkspace()} className="bb-button-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"><RefreshCw size={16} /> إعادة المحاولة</button>
              <Link href="/projects/video" className="bb-button-secondary inline-flex min-h-11 items-center rounded-xl border px-5 py-3 text-sm font-black">كل مشاريع الفيديو</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-screen">
      <ProjectToolNav activeTool="video" />
      <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="bb-panel order-2 overflow-hidden rounded-3xl border xl:order-1">
          <div className="bb-divider flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div><div className="bb-text-accent text-xs font-black">مشروع فيديو</div><h1 className="bb-text-primary mt-1 text-xl font-black">{project?.name || 'استوديو الفيديو'}</h1></div>
            <Link href="/projects/video" className="bb-button-secondary rounded-xl border px-3 py-2 text-xs font-black">كل مشاريع الفيديو</Link>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {!generationReady && (
              <div className="bb-warning-surface rounded-2xl border p-4 text-xs leading-6">
                <div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><div className="bb-text-primary font-black">التوليد المباشر غير متاح بعد</div><p className="bb-text-secondary mt-1">{!providerConfigured ? 'مفتاح مزود Runway غير مهيأ على الخادم.' : models.length === 0 ? 'لا يوجد نموذج فيديو مفعّل ومرئي من لوحة الإدارة.' : 'النموذج موجود لكن سعر Brand Box لكل ثانية لم يُضبط بعد.'} يمكنك الاستمرار في حفظ المسودات دون أي تكلفة.</p></div></div>
              </div>
            )}

            <div className="bb-surface-1 bb-border rounded-3xl border p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="bb-text-primary text-sm font-black">عمليات التوليد</h2><p className="bb-text-tertiary mt-1 text-[11px]">الحالة محفوظة على الخادم والناتج النهائي يُنسخ إلى تخزين Brand Box.</p></div><span className="bb-text-tertiary text-[11px]">{generations.length} عملية</span></div>
              {generations.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><span className="bb-accent-soft flex h-16 w-16 items-center justify-center rounded-2xl border"><Film size={30} /></span><h3 className="bb-text-primary mt-5 text-lg font-black">لا توجد فيديوهات مولدة بعد</h3><p className="bb-text-secondary mt-2 max-w-md text-sm leading-7">عند تفعيل المزود وتسعيره ستظهر المهام هنا من لحظة الانتظار حتى اكتمال الفيديو.</p></div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {generations.map((item) => {
                    const status = statusMeta(item.status);
                    const active = item.status === 'queued' || item.status === 'processing';
                    return (
                      <article key={item.id} className="bb-card overflow-hidden rounded-2xl border">
                        {item.resultUrl && <video controls preload="metadata" src={item.resultUrl} className="aspect-video w-full bg-black object-contain" />}
                        <div className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span><span className="bb-text-tertiary flex items-center gap-1 text-[10px]"><Clock3 size={12}/>{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</span></div>
                          <p className="bb-text-secondary mt-3 line-clamp-3 text-sm leading-7">{item.prompt}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5"><span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{item.settings?.ratio || '—'}</span><span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{item.settings?.duration || '—'} ث</span><span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">حجز {item.credits_reserved || 0} نقطة</span></div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {active && <button onClick={() => void refreshGeneration(item.id)} disabled={refreshingId === item.id} className="bb-button-secondary flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black text-[var(--bb-info)] disabled:opacity-50">{refreshingId === item.id ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} تحديث الحالة</button>}
                            {(item.status === 'failed' || item.status === 'cancelled') && <button onClick={() => retryGeneration(item)} className="bb-warning-surface flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black"><RotateCcw size={14}/> إعادة المحاولة</button>}
                            {item.status === 'completed' && <span className="flex min-h-10 items-center gap-1.5 text-[11px] font-black text-[var(--bb-success)]"><CheckCircle2 size={14}/> محفوظ داخل Brand Box</span>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bb-surface-1 bb-border rounded-3xl border p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="bb-text-primary text-sm font-black">المسودات</h2><span className="bb-text-tertiary text-[11px]">{drafts.length} مسودة</span></div>
              {drafts.length === 0 ? <p className="bb-text-tertiary py-10 text-center text-sm">لا توجد مسودات محفوظة.</p> : <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{drafts.map((item) => <article key={item.id} className="bb-card rounded-2xl border p-4"><span className="bb-accent-soft rounded-lg px-2 py-1 text-[10px] font-black">مسودة</span><p className="bb-text-secondary mt-3 line-clamp-4 text-sm leading-7">{item.prompt}</p></article>)}</div>}
            </div>
          </div>
        </section>

        <aside className="bb-panel order-1 h-fit rounded-3xl border p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="bb-accent-soft flex h-11 w-11 items-center justify-center rounded-xl border"><Video size={22}/></span><div><div className="bb-text-primary text-sm font-black">توليد فيديو AI</div><div className="bb-text-tertiary text-[11px]">{selectedModel?.name || 'Runway Gen-4.5'}</div></div></div>

          <label htmlFor="video-prompt" className="bb-text-secondary mt-6 block text-xs font-black">وصف الفيديو</label>
          <textarea id="video-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1000))} maxLength={1000} placeholder="صف المشهد، الحركة، زاوية الكاميرا والإضاءة..." className="bb-input mt-2 min-h-40 w-full resize-none rounded-2xl border p-4 text-sm leading-7 outline-none" />
          <div className="bb-text-tertiary mt-1 text-left text-[10px]">{prompt.length}/1000</div>

          <div className="mt-5 space-y-4">
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">النموذج</span><select value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={models.length === 0} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none disabled:opacity-55">{models.length === 0 ? <option value="">لا يوجد نموذج مفعّل</option> : models.map((model) => <option key={model.modelId} value={model.modelId}>{model.name}</option>)}</select></label>
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">النسبة</span><select value={ratio} onChange={(event) => setRatio(event.target.value)} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none">{RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">المدة</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none">{DURATIONS.map((value) => <option key={value} value={value}>{value} ثوانٍ</option>)}</select></label>
            <div className="bb-input rounded-xl border px-4 py-3"><div className="bb-text-tertiary text-[10px] font-bold">الجودة</div><div className="bb-text-primary mt-1 text-sm font-black">720p · Standard</div></div>
          </div>

          <div className="bb-surface-1 bb-border bb-text-secondary mt-5 rounded-2xl border p-3 text-xs leading-6">
            {selectedModel?.creditsPerSecond ? <><span>التكلفة المؤكدة من الخادم:</span> <strong className="bb-text-primary">{selectedModel.creditsPerSecond} نقطة/ث</strong><br/><span>إجمالي هذه المهمة:</span> <strong className="bb-text-accent">{priceEstimate} نقطة</strong></> : 'لن يتم حجز أي نقاط حتى يضبط المسؤول سعر Brand Box لكل ثانية.'}
            {creditBalance !== null && creditBalance !== undefined && <><br/><span>رصيدك الحالي:</span> <strong className="bb-text-primary">{creditBalance}</strong></>}
          </div>

          {insufficientCredits && (
            <div className="bb-warning-surface mt-4 rounded-xl border px-3 py-2.5 text-xs leading-5" role="alert">
              رصيدك الحالي لا يغطي التكلفة المتوقعة لهذه المدة. <Link href="/pricing" className="bb-text-accent font-black underline underline-offset-4">شحن الرصيد</Link>
            </div>
          )}

          {message && <div className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${message.type === 'error' ? 'bb-danger-surface' : message.type === 'success' ? 'border-[color-mix(in_srgb,var(--bb-success)_25%,transparent)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' : 'bb-accent-soft'}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}

          <button onClick={generateVideo} disabled={!generationReady || generating || !prompt.trim() || insufficientCredits} className="bb-button-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40">{generating ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>} {generating ? 'جاري إرسال المهمة...' : 'توليد الفيديو'}</button>
          <button onClick={saveDraft} disabled={saving || !prompt.trim()} className="bb-button-secondary mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-xs font-black disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} حفظ كمسودة</button>
        </aside>
      </div>
    </main>
  );
}
