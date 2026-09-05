'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Film, Loader2, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';
import ProjectToolNav from './ProjectToolNav';

const RATIOS = [
  { value: '16:9', label: '16:9 أفقي' },
  { value: '9:16', label: '9:16 عمودي' },
];
const DURATIONS = Array.from({ length: 12 }, (_, index) => index + 4);
const RESOLUTIONS = ['480p', '720p'];

function normalizeRatio(value) {
  if (value === '9:16' || value === '720:1280') return '9:16';
  return '16:9';
}

function normalizeDuration(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return Number.isInteger(parsed) && parsed >= 4 && parsed <= 15 ? parsed : 4;
}

function statusLabel(status) {
  if (status === 'completed') return 'مكتمل';
  if (status === 'failed') return 'فشل';
  if (status === 'cancelled') return 'ملغي';
  if (status === 'queued') return 'في قائمة الانتظار';
  return 'جاري التوليد';
}

export default function OpenRouterVideoProjectWorkspace({ projectId, initialPrompt = '', templateSettings = {} }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { creditBalance, refreshProfile } = useAuth();
  const [project, setProject] = useState(null);
  const [models, setModels] = useState([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt.slice(0, 1000));
  const [modelId, setModelId] = useState('');
  const [ratio, setRatio] = useState(() => normalizeRatio(templateSettings?.ratio));
  const [duration, setDuration] = useState(() => normalizeDuration(templateSettings?.duration));
  const [resolution, setResolution] = useState(templateSettings?.quality === '720p' ? '720p' : '480p');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshingId, setRefreshingId] = useState('');
  const [message, setMessage] = useState(null);

  const selectedModel = models.find((model) => model.modelId === modelId) || models[0] || null;
  const priceEstimate = selectedModel?.creditsPerSecond
    ? Math.max(Number(selectedModel.minimumCredits || 0), selectedModel.creditsPerSecond * duration)
    : null;
  const generationReady = Boolean(providerConfigured && selectedModel?.pricingReady && selectedModel?.runtimeVerified);
  const insufficientCredits = Boolean(priceEstimate && creditBalance !== null && creditBalance !== undefined && priceEstimate > creditBalance);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadWorkspace = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
    const response = await fetch(`/api/v1/openrouter-video-generations?projectId=${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذر تحميل استوديو الفيديو.');
    setProject(payload.project || null);
    setProviderConfigured(Boolean(payload.providerConfigured));
    const nextModels = Array.isArray(payload.models) ? payload.models : [];
    setModels(nextModels);
    setModelId((current) => nextModels.some((model) => model.modelId === current) ? current : (nextModels[0]?.modelId || ''));
    setGenerations(Array.isArray(payload.generations) ? payload.generations : []);
  }, [getToken, projectId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      await loadWorkspace();
    } catch (error) {
      setLoadFailed(true);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل استوديو الفيديو.' });
    } finally {
      setLoading(false);
    }
  }, [loadWorkspace]);

  useEffect(() => { void reload(); }, [reload]);

  const refreshGeneration = useCallback(async (generationId, silent = false) => {
    const token = await getToken();
    if (!token) return;
    if (!silent) setRefreshingId(generationId);
    try {
      const response = await fetch('/api/v1/openrouter-video-generations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', generationId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!silent) setMessage({ type: 'error', text: result.error || 'تعذر تحديث حالة الفيديو.' });
        return;
      }
      setGenerations((current) => current.map((item) => item.id === generationId ? {
        ...item,
        status: result.status || item.status,
        credits_reserved: result.creditsReserved ?? item.credits_reserved,
        credits_consumed: result.creditsConsumed ?? item.credits_consumed,
        resultUrl: result.resultUrl || item.resultUrl,
        error_message: result.errorCode || item.error_message,
      } : item));
      if (['completed', 'failed', 'cancelled'].includes(result.status) && refreshProfile) void refreshProfile();
      if (!silent && result.errorMessage) setMessage({ type: result.success ? 'info' : 'error', text: result.errorMessage });
    } finally {
      if (!silent) setRefreshingId('');
    }
  }, [getToken, refreshProfile]);

  useEffect(() => {
    const active = generations.filter((item) => item.status === 'queued' || item.status === 'processing');
    if (!active.length) return undefined;
    const timer = window.setTimeout(() => {
      void Promise.all(active.map((item) => refreshGeneration(item.id, true)));
    }, 30000);
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
      const response = await fetch('/api/v1/openrouter-video-generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          modelId: selectedModel.modelId,
          prompt: prompt.trim(),
          requestId,
          settings: { ratio, duration, resolution, generateAudio: false },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.generationId) throw new Error(result.errorMessage || result.error || 'تعذر بدء توليد الفيديو.');
      setGenerations((current) => [{
        id: result.generationId,
        project_id: projectId,
        provider: 'openrouter',
        model: selectedModel.modelId,
        prompt: prompt.trim(),
        settings: { ratio, duration, resolution, generateAudio: false },
        status: result.status,
        credits_reserved: result.creditsReserved,
        credits_consumed: result.creditsConsumed,
        created_at: new Date().toISOString(),
        resultUrl: null,
      }, ...current.filter((item) => item.id !== result.generationId)]);
      setMessage({ type: 'success', text: 'بدأ توليد الفيديو عبر OpenRouter. يتم تحديث الحالة تلقائيًا حتى الحفظ داخل Brand Box.' });
      if (refreshProfile) void refreshProfile();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر بدء توليد الفيديو.' });
    } finally {
      setGenerating(false);
    }
  }

  function retry(item) {
    setPrompt(String(item.prompt || '').slice(0, 1000));
    setRatio(normalizeRatio(item.settings?.ratio));
    setDuration(normalizeDuration(item.settings?.duration));
    setResolution(RESOLUTIONS.includes(item.settings?.resolution) ? item.settings.resolution : '480p');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) {
    return <main className="bb-app-canvas min-h-screen pt-24" dir="rtl"><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="bb-text-accent h-7 w-7 animate-spin" /></div></main>;
  }

  if (loadFailed) {
    return (
      <main className="bb-app-canvas min-h-screen" dir="rtl">
        <ProjectToolNav activeTool="video" />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <section className="bb-panel rounded-3xl border p-8 text-center">
            <AlertTriangle className="bb-text-accent mx-auto" size={34} />
            <h1 className="bb-text-primary mt-4 text-2xl font-black">تعذر تحميل استوديو الفيديو</h1>
            <p className="bb-text-secondary mt-3 text-sm">{message?.text}</p>
            <button type="button" onClick={() => void reload()} className="bb-button-primary mt-6 rounded-xl px-5 py-3 font-black">إعادة المحاولة</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="bb-app-canvas min-h-screen" dir="rtl">
      <ProjectToolNav activeTool="video" />
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="bb-text-accent mb-2 flex items-center gap-2 text-sm font-black"><Sparkles size={16} /> OpenRouter Video</div>
            <h1 className="bb-text-primary text-3xl font-black">{project?.name || 'استوديو الفيديو'}</h1>
            <p className="bb-text-secondary mt-2 text-sm">Seedance 2.0 Mini — توليد غير متزامن، خصم آمن للنقاط، وحفظ MP4 دائم داخل Brand Box.</p>
          </div>
          <div className="bb-panel rounded-2xl border px-4 py-3 text-sm font-bold">
            {providerConfigured ? <span className="bb-text-success inline-flex items-center gap-2"><CheckCircle2 size={16} /> المزود متصل</span> : <span className="bb-text-danger">المزود غير مهيأ</span>}
          </div>
        </div>

        {message && <div className={`mb-5 rounded-2xl border p-4 text-sm font-bold ${message.type === 'error' ? 'bb-danger-surface' : 'bb-warning-surface'}`}>{message.text}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <section className="bb-panel rounded-3xl border p-5 lg:p-6">
            <label className="bb-text-primary text-sm font-black">وصف الفيديو</label>
            <textarea id="openrouter-video-prompt" className="bb-input mt-3 min-h-40 w-full rounded-2xl border p-4" maxLength={1000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="صف المشهد، الحركة، الإضاءة، زاوية الكاميرا..." />
            <div className="bb-text-secondary mt-2 text-xs">{prompt.length} / 1000</div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">النموذج<select className="bb-input mt-2 w-full rounded-xl border p-3" value={modelId} onChange={(e) => setModelId(e.target.value)}>{models.map((model) => <option key={model.modelId} value={model.modelId}>{model.name}</option>)}</select></label>
              <label className="text-sm font-bold">الدقة<select className="bb-input mt-2 w-full rounded-xl border p-3" value={resolution} onChange={(e) => setResolution(e.target.value)}>{RESOLUTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="text-sm font-bold">الأبعاد<select className="bb-input mt-2 w-full rounded-xl border p-3" value={ratio} onChange={(e) => setRatio(e.target.value)}>{RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-sm font-bold">المدة<select className="bb-input mt-2 w-full rounded-xl border p-3" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{DURATIONS.map((value) => <option key={value} value={value}>{value} ثوانٍ</option>)}</select></label>
            </div>

            <div className="bb-card mt-5 rounded-2xl border p-4 text-sm">
              <div className="flex justify-between gap-4"><span className="bb-text-secondary">التكلفة المتوقعة</span><strong className="bb-text-primary">{priceEstimate ?? '—'} نقطة</strong></div>
              {insufficientCredits && <p className="bb-text-danger mt-3 font-bold">رصيدك الحالي لا يغطي التكلفة. <Link href="/pricing" className="underline">إضافة رصيد</Link></p>}
            </div>

            <button type="button" onClick={() => void generateVideo()} disabled={!generationReady || generating || !prompt.trim() || insufficientCredits} className="bb-button-primary mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black disabled:cursor-not-allowed disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />} توليد الفيديو
            </button>
          </section>

          <section className="bb-panel rounded-3xl border p-5 lg:p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="bb-text-primary text-xl font-black">سجل التوليد</h2><button type="button" className="bb-button-secondary rounded-xl border p-2" onClick={() => void reload()}><RefreshCw size={17} /></button></div>
            <div className="space-y-4">
              {generations.length === 0 && <div className="bb-text-secondary rounded-2xl border border-dashed p-8 text-center text-sm">لا توجد فيديوهات في هذا المشروع بعد.</div>}
              {generations.map((item) => (
                <article key={item.id} className="bb-card overflow-hidden rounded-2xl border">
                  {item.resultUrl && <video controls className="aspect-video w-full bg-black object-contain" src={item.resultUrl} />}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3"><span className="bb-text-primary inline-flex items-center gap-2 text-sm font-black"><Clock3 size={15} /> {statusLabel(item.status)}</span><span className="bb-text-secondary text-xs">{item.credits_consumed || item.credits_reserved || 0} نقطة</span></div>
                    <p className="bb-text-secondary mt-3 line-clamp-3 text-sm leading-6">{item.prompt}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(item.status === 'queued' || item.status === 'processing') && <button type="button" onClick={() => void refreshGeneration(item.id)} className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"><RefreshCw className={refreshingId === item.id ? 'animate-spin' : ''} size={14} /> تحديث</button>}
                      {(item.status === 'failed' || item.status === 'cancelled') && <button type="button" onClick={() => retry(item)} className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"><RotateCcw size={14} /> إعادة المحاولة</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
