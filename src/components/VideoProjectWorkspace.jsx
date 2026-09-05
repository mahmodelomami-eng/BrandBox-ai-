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

function ratioLabel(value) {
  if (value === '16:9' || value === '1280:720') return '16:9 أفقي';
  if (value === '9:16' || value === '720:1280') return '9:16 عمودي';
  if (value === '1:1') return '1:1 مربع';
  return value;
}

function ratioAlias(value, allowed = []) {
  if (allowed.includes(value)) return value;
  if ((value === '16:9' || value === '1280:720')) {
    if (allowed.includes('16:9')) return '16:9';
    if (allowed.includes('1280:720')) return '1280:720';
  }
  if ((value === '9:16' || value === '720:1280')) {
    if (allowed.includes('9:16')) return '9:16';
    if (allowed.includes('720:1280')) return '720:1280';
  }
  return allowed[0] || '';
}

function parseDuration(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return Number.isInteger(parsed) ? parsed : 0;
}

function statusMeta(status) {
  if (status === 'completed') return { label: 'مكتمل', className: 'border-[color-mix(in_srgb,var(--bb-success)_28%,transparent)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' };
  if (status === 'failed') return { label: 'فشل', className: 'border-[color-mix(in_srgb,var(--bb-danger)_28%,transparent)] bg-[var(--bb-danger-soft)] text-[var(--bb-danger)]' };
  if (status === 'cancelled') return { label: 'ملغي', className: 'bb-button-secondary' };
  if (status === 'queued') return { label: 'في قائمة الانتظار', className: 'border-[color-mix(in_srgb,var(--bb-warning)_28%,transparent)] bg-[var(--bb-warning-soft)] text-[var(--bb-warning)]' };
  return { label: 'جاري التوليد', className: 'border-[color-mix(in_srgb,var(--bb-info)_28%,transparent)] bg-[var(--bb-info-soft)] text-[var(--bb-info)]' };
}

function safePricingOptions(model) {
  if (!Array.isArray(model?.pricingOptions)) return [];
  return model.pricingOptions.filter((option) => (
    option
    && typeof option.resolution === 'string'
    && (option.audioMode === 'off' || option.audioMode === 'on')
    && Number.isInteger(Number(option.creditsPerSecond))
    && Number(option.creditsPerSecond) > 0
  ));
}

function videoModelOptionLabel(model) {
  const badge = model?.pricingReady ? (model.badge || 'متاح') : 'غير مسعّر';
  return `${model?.name || model?.modelId || 'نموذج فيديو'} — ${badge}`;
}

export default function VideoProjectWorkspace({ projectId, initialPrompt = '', templateSettings = {} }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { creditBalance, refreshProfile } = useAuth();
  const [project, setProject] = useState(null);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt.slice(0, 1000));
  const [modelId, setModelId] = useState('');
  const [ratio, setRatio] = useState(String(templateSettings?.ratio || ''));
  const [duration, setDuration] = useState(() => parseDuration(templateSettings?.duration));
  const [resolution, setResolution] = useState(String(templateSettings?.quality || ''));
  const [generateAudio, setGenerateAudio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspaceLoadFailed, setWorkspaceLoadFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingId, setRefreshingId] = useState('');
  const [message, setMessage] = useState(initialPrompt ? { type: 'success', text: 'تم تحميل برومبت القالب وإعداداته. سيتم ضبط القيم تلقائيًا حسب النموذج الذي تختاره.' } : null);

  const selectedModel = models.find((model) => model.modelId === modelId) || models[0] || null;
  const recommendedVideoModels = useMemo(
    () => models.filter((model) => model.featured === true && model.pricingReady === true),
    [models]
  );
  const otherVideoModels = useMemo(
    () => models.filter((model) => !(model.featured === true && model.pricingReady === true)),
    [models]
  );
  const selectedModelBadge = selectedModel?.pricingReady ? (selectedModel.badge || 'متاح') : 'غير مسعّر';
  const availableDurations = useMemo(
    () => Array.isArray(selectedModel?.supportedDurations) ? selectedModel.supportedDurations.map(Number).filter(Number.isFinite) : [],
    [selectedModel]
  );
  const availableRatios = useMemo(
    () => Array.isArray(selectedModel?.supportedRatios) ? selectedModel.supportedRatios.filter(Boolean) : [],
    [selectedModel]
  );
  const availableResolutions = useMemo(
    () => Array.isArray(selectedModel?.supportedResolutions) ? selectedModel.supportedResolutions.filter(Boolean) : [],
    [selectedModel]
  );
  const pricingOptions = useMemo(() => safePricingOptions(selectedModel), [selectedModel]);
  const effectiveRatio = ratioAlias(ratio, availableRatios);
  const effectiveDuration = availableDurations.includes(duration) ? duration : (availableDurations[0] || 0);
  const effectiveResolution = availableResolutions.includes(resolution) ? resolution : (availableResolutions[0] || '');
  const audioPriceAvailable = pricingOptions.length === 0
    || pricingOptions.some((option) => option.resolution === effectiveResolution && option.audioMode === 'on');
  const effectiveGenerateAudio = Boolean(selectedModel?.supportsAudio && generateAudio && audioPriceAvailable);
  const selectedPricing = pricingOptions.find((option) => (
    option.resolution === effectiveResolution
    && option.audioMode === (effectiveGenerateAudio ? 'on' : 'off')
  )) || null;
  const selectedCreditsPerSecond = selectedPricing
    ? Number(selectedPricing.creditsPerSecond)
    : pricingOptions.length === 0 && Number(selectedModel?.creditsPerSecond) > 0
      ? Number(selectedModel.creditsPerSecond)
      : null;
  const selectedProviderConfigured = Boolean(selectedModel?.configured);
  const capabilitiesAvailable = Boolean(selectedModel?.capabilitiesAvailable);
  const priceEstimate = selectedCreditsPerSecond && effectiveDuration
    ? Math.max(Number(selectedModel.minimumCredits || 0), selectedCreditsPerSecond * effectiveDuration)
    : null;
  const generationReady = Boolean(
    selectedProviderConfigured
    && capabilitiesAvailable
    && selectedModel?.pricingReady
    && selectedCreditsPerSecond
    && effectiveDuration
    && effectiveRatio
    && effectiveResolution
  );
  const insufficientCredits = Boolean(priceEstimate && creditBalance !== null && creditBalance !== undefined && priceEstimate > creditBalance);

  function handleModelChange(event) {
    const nextModelId = event.target.value;
    const nextModel = models.find((model) => model.modelId === nextModelId) || null;
    setModelId(nextModelId);
    if (!nextModel) return;
    const nextDurations = Array.isArray(nextModel.supportedDurations) ? nextModel.supportedDurations.map(Number).filter(Number.isFinite) : [];
    const nextRatios = Array.isArray(nextModel.supportedRatios) ? nextModel.supportedRatios.filter(Boolean) : [];
    const nextResolutions = Array.isArray(nextModel.supportedResolutions) ? nextModel.supportedResolutions.filter(Boolean) : [];
    setDuration((current) => nextDurations.includes(current) ? current : (nextDurations[0] || 0));
    setRatio((current) => ratioAlias(current, nextRatios));
    setResolution((current) => nextResolutions.includes(current) ? current : (nextResolutions[0] || ''));
    if (!nextModel.supportsAudio) setGenerateAudio(false);
  }

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
          settings: {
            ratio: effectiveRatio,
            duration: effectiveDuration,
            resolution: effectiveResolution,
            generateAudio: effectiveGenerateAudio,
            quality: 'standard',
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.generationId) throw new Error(result.errorMessage || result.error || 'تعذر بدء توليد الفيديو.');
      const finalSettings = result.normalizedSettings || {
        ratio: effectiveRatio,
        duration: effectiveDuration,
        resolution: effectiveResolution,
        generateAudio: effectiveGenerateAudio,
        quality: 'standard',
      };
      setRatio(finalSettings.ratio || effectiveRatio);
      setDuration(Number(finalSettings.duration || effectiveDuration));
      setResolution(finalSettings.resolution || effectiveResolution);
      setGenerateAudio(finalSettings.generateAudio === true);
      setGenerations((current) => [{
        id: result.generationId,
        project_id: projectId,
        provider: selectedModel.provider,
        model: selectedModel.modelId,
        prompt: prompt.trim(),
        settings: finalSettings,
        status: result.status,
        credits_reserved: result.creditsReserved,
        credits_consumed: result.creditsConsumed,
        created_at: new Date().toISOString(),
        resultUrl: null,
      }, ...current.filter((item) => item.id !== result.generationId)]);
      setMessage({ type: 'success', text: 'تم إرسال الفيديو بالإعدادات المدعومة فعليًا من النموذج. ستتحدث حالته تلقائيًا.' });
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
          settings: {
            ratio: effectiveRatio,
            duration: `${effectiveDuration} ثوانٍ`,
            quality: effectiveResolution,
            generateAudio: effectiveGenerateAudio,
            modelId,
          },
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
    if (models.some((model) => model.modelId === item.model)) setModelId(item.model);
    setRatio(String(item.settings?.ratio || item.settings?.aspectRatio || ratio));
    setDuration(parseDuration(item.settings?.duration));
    setResolution(String(item.settings?.resolution || item.settings?.quality || resolution));
    setGenerateAudio(item.settings?.generateAudio === true);
    setMessage({ type: 'info', text: 'تم تحميل إعدادات المحاولة السابقة وسيتم تصحيح أي قيمة لم تعد مدعومة بواسطة النموذج المحدد.' });
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
                <div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><div className="bb-text-primary font-black">التوليد المباشر غير متاح بهذه الإعدادات</div><p className="bb-text-secondary mt-1">{models.length === 0 ? 'لا يوجد نموذج فيديو مفعّل ومرئي من لوحة الإدارة.' : !selectedProviderConfigured ? 'مفتاح مزود الفيديو المحدد غير مهيأ على الخادم.' : !selectedModel?.pricingReady ? 'النموذج موجود لكن مصفوفة تسعير Brand Box لم تُضبط بعد.' : !capabilitiesAvailable ? 'تعذر التحقق من قدرات النموذج، لذلك لن نعرض أو نرسل إعدادات بالتخمين.' : !selectedCreditsPerSecond ? 'تركيبة الدقة والصوت الحالية غير مسعّرة، لذلك لن يتم حجز أي نقاط.' : 'اختر قيمة مدعومة من القوائم المتاحة.'} يمكنك الاستمرار في حفظ المسودات دون أي تكلفة.</p></div></div>
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
                          <div className="mt-3 flex flex-wrap gap-1.5"><span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{item.settings?.ratio || '—'}</span><span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{item.settings?.duration || '—'} ث</span>{item.settings?.resolution && <span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{item.settings.resolution}</span>}<span className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">حجز {item.credits_reserved || 0} نقطة</span></div>
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
          <div className="flex items-center gap-3"><span className="bb-accent-soft flex h-11 w-11 items-center justify-center rounded-xl border"><Video size={22}/></span><div className="min-w-0"><div className="flex items-center gap-2"><div className="bb-text-primary truncate text-sm font-black">توليد فيديو AI</div>{selectedModel && <span className="bb-accent-soft shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black">{selectedModelBadge}</span>}</div><div className="bb-text-tertiary mt-0.5 truncate text-[11px]">{selectedModel?.name || 'اختر نموذج فيديو'}</div></div></div>

          <label htmlFor="video-prompt" className="bb-text-secondary mt-6 block text-xs font-black">وصف الفيديو</label>
          <textarea id="video-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1000))} maxLength={1000} placeholder="صف المشهد، الحركة، زاوية الكاميرا والإضاءة..." className="bb-input mt-2 min-h-40 w-full resize-none rounded-2xl border p-4 text-sm leading-7 outline-none" />
          <div className="bb-text-tertiary mt-1 text-left text-[10px]">{prompt.length}/1000</div>

          <div className="mt-5 space-y-4">
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">النموذج</span><select aria-label="نماذج الفيديو" value={modelId} onChange={handleModelChange} disabled={models.length === 0} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none disabled:opacity-55">{models.length === 0 ? <option value="">لا يوجد نموذج مفعّل</option> : <>{recommendedVideoModels.length > 0 && <optgroup label="موصى به">{recommendedVideoModels.map((model) => <option key={model.modelId} value={model.modelId}>{videoModelOptionLabel(model)}</option>)}</optgroup>}{otherVideoModels.length > 0 && <optgroup label="كل النماذج">{otherVideoModels.map((model) => <option key={model.modelId} value={model.modelId}>{videoModelOptionLabel(model)}</option>)}</optgroup>}</>}</select></label>
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">النسبة</span><select value={effectiveRatio} onChange={(event) => setRatio(event.target.value)} disabled={!capabilitiesAvailable || availableRatios.length === 0} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none disabled:opacity-55">{availableRatios.map((value) => <option key={value} value={value}>{ratioLabel(value)}</option>)}</select></label>
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">المدة</span><select value={effectiveDuration} onChange={(event) => setDuration(Number(event.target.value))} disabled={!capabilitiesAvailable || availableDurations.length === 0} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none disabled:opacity-55">{availableDurations.map((value) => <option key={value} value={value}>{value} ثوانٍ</option>)}</select></label>
            <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">الدقة</span><select value={effectiveResolution} onChange={(event) => setResolution(event.target.value)} disabled={!capabilitiesAvailable || availableResolutions.length === 0} className="bb-input w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none disabled:opacity-55">{availableResolutions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            {selectedModel?.supportsAudio && <label className="bb-input flex items-center justify-between rounded-xl border px-4 py-3"><span><span className="bb-text-primary block text-xs font-black">توليد الصوت مع الفيديو</span><span className="bb-text-tertiary mt-1 block text-[10px]">السعر يتغير تلقائيًا حسب الدقة وتشغيل الصوت، والخادم يعيد التحقق قبل الخصم.</span></span><input type="checkbox" checked={effectiveGenerateAudio} disabled={!audioPriceAvailable} onChange={(event) => setGenerateAudio(event.target.checked)} className="h-4 w-4" /></label>}
          </div>

          <div className="bb-surface-1 bb-border bb-text-secondary mt-5 rounded-2xl border p-3 text-xs leading-6">
            {capabilitiesAvailable ? <><span>قدرات النموذج:</span> <strong className="bb-text-primary">{availableResolutions.join(' / ')} · {availableDurations.join(', ')} ث</strong><br/></> : <><span className="bb-text-danger font-black">تعذر تأكيد قدرات النموذج، لذلك تم تعطيل التوليد.</span><br/></>}
            {selectedCreditsPerSecond ? <><span>سعر الإعداد الحالي:</span> <strong className="bb-text-primary">{selectedCreditsPerSecond} نقطة/ث</strong><br/><span>إجمالي هذه المهمة:</span> <strong className="bb-text-accent">{priceEstimate} نقطة</strong></> : 'تركيبة الدقة والصوت الحالية غير مسعّرة ولن يتم حجز نقاط لها.'}
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
