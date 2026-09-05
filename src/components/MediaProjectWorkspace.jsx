'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  Save,
  Sparkles,
  Video,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { listUserProjects } from '../lib/projects/projects-service';
import ProjectToolNav from './ProjectToolNav';

const CONFIG = {
  video: {
    label: 'الفيديو AI',
    projectLabel: 'مشروع فيديو',
    listHref: '/projects/video',
    icon: Video,
    promptLabel: 'وصف الفيديو',
    placeholder: 'صف المشهد، الحركة، زاوية الكاميرا، الإضاءة والتسلسل الزمني...',
    model: 'Video Draft',
    notice: 'استخدم استوديو الفيديو المباشر للتوليد. هذه المساحة القديمة تبقى للمسودات المحفوظة فقط.',
    matchesProject: (type) => /فيديو|video/i.test(type || ''),
    settings: [
      { key: 'ratio', label: 'النسبة المرجعية للمسودة', values: ['16:9', '9:16', '1:1'] },
      { key: 'duration', label: 'المدة المرجعية للمسودة', values: ['5 ثوانٍ', '10 ثوانٍ', '15 ثانية'] },
      { key: 'quality', label: 'الجودة المرجعية للمسودة', values: ['720p', '1080p'] },
    ],
  },
  audio: {
    label: 'الصوت AI',
    projectLabel: 'مشروع صوت',
    listHref: '/projects/audio',
    icon: Mic2,
    promptLabel: 'النص أو وصف الصوت',
    placeholder: 'اكتب النص المراد تحويله إلى صوت أو صف النبرة، الأسلوب واللغة...',
    model: 'OpenRouter TTS Draft',
    notice: 'التوليد الصوتي المباشر لم يتم تفعيله بعد. إذا وُجد موديل TTS مفعّل في الكتالوج فستظهر أصواته وصيغه المدعومة هنا للمسودة فقط، دون تشغيل المزود أو خصم نقاط.',
    matchesProject: (type) => /صوت|audio/i.test(type || ''),
    settings: [
      { key: 'language', label: 'لغة المحتوى (إعداد للمسودة)', values: ['العربية', 'الإنجليزية'] },
    ],
  },
};

function resolveTemplateSettings(config, templateSettings = {}) {
  return Object.fromEntries(config.settings.map((field) => {
    const requested = templateSettings?.[field.key];
    return [field.key, field.values.includes(requested) ? requested : field.values[0]];
  }));
}

function friendlyLoadError(error, fallback) {
  const text = error instanceof Error ? error.message : '';
  if (/انتهت جلسة|تسجيل الدخول/i.test(text)) return 'انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.';
  if (/غير موجود|صلاحية/i.test(text)) return text;
  return fallback;
}

function normalizeAudioModel(model) {
  return {
    id: model.modelId,
    name: model.name || model.modelId,
    vendor: model.vendor || 'OpenRouter',
    minimumCredits: Number(model.minimumCredits || 0),
    capabilitiesAvailable: model.capabilitiesAvailable === true,
    voices: Array.isArray(model.voices) ? model.voices.filter(Boolean) : [],
    responseFormats: Array.isArray(model.responseFormats) ? model.responseFormats.filter(Boolean) : [],
    supportsSpeed: model.supportsSpeed === true,
  };
}

export default function MediaProjectWorkspace({ tool = 'video', projectId, initialPrompt = '', templateSettings = {} }) {
  const config = CONFIG[tool] || CONFIG.video;
  const Icon = config.icon;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsOwnerId, setItemsOwnerId] = useState('');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [settings, setSettings] = useState(() => resolveTemplateSettings(config, templateSettings));
  const [audioModels, setAudioModels] = useState([]);
  const [audioModelsAvailable, setAudioModelsAvailable] = useState(true);
  const [selectedAudioModelId, setSelectedAudioModelId] = useState('');
  const [audioVoice, setAudioVoice] = useState('');
  const [audioFormat, setAudioFormat] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [message, setMessage] = useState(initialPrompt
    ? { type: 'info', text: 'تم تحميل قالب جاهز. عدّل البرومبت والإعدادات ثم احفظ نسخة داخل المشروع.' }
    : null);

  const visibleItems = itemsOwnerId === projectId ? items : [];
  const selectedAudioModel = audioModels.find((model) => model.id === selectedAudioModelId) || audioModels[0] || null;
  const effectiveAudioVoice = selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.voices.length > 0
    ? (selectedAudioModel.voices.includes(audioVoice) ? audioVoice : selectedAudioModel.voices[0])
    : '';
  const effectiveAudioFormat = selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.responseFormats.length > 0
    ? (selectedAudioModel.responseFormats.includes(audioFormat) ? audioFormat : selectedAudioModel.responseFormats[0])
    : '';

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadAudioModels = useCallback(async () => {
    if (tool !== 'audio') return;
    try {
      const token = await getToken();
      if (!token) throw new Error('SESSION_REQUIRED');
      const response = await fetch('/api/v1/audio-models', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'AUDIO_MODEL_CATALOG_UNAVAILABLE');
      const nextModels = (Array.isArray(payload.models) ? payload.models : [])
        .map(normalizeAudioModel)
        .filter((model) => model.id);
      setAudioModels(nextModels);
      setAudioModelsAvailable(true);
      setSelectedAudioModelId((current) => nextModels.some((model) => model.id === current) ? current : (nextModels[0]?.id || ''));
    } catch {
      setAudioModels([]);
      setAudioModelsAvailable(false);
      setSelectedAudioModelId('');
      setAudioVoice('');
      setAudioFormat('');
    }
  }, [getToken, tool]);

  const loadItems = useCallback(async (targetProjectId = projectId) => {
    if (!targetProjectId) return false;
    setItemsLoading(true);
    setItemsError('');
    setItemsOwnerId('');
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch(`/api/v1/project-tool-items?projectId=${encodeURIComponent(targetProjectId)}&tool=${tool}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('انتهت جلسة الدخول.');
        throw new Error('تعذر تحميل سجل المشروع.');
      }
      const payload = await response.json();
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setItemsOwnerId(targetProjectId);
      return true;
    } catch (error) {
      setItems([]);
      setItemsOwnerId(targetProjectId);
      setItemsError(friendlyLoadError(error, 'تعذر تحميل سجل المشروع. يمكنك متابعة إعداد المسودة أو إعادة المحاولة.'));
      return false;
    } finally {
      setItemsLoading(false);
    }
  }, [getToken, projectId, tool]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setWorkspaceError('');
    try {
      const projects = await listUserProjects();
      const found = projects.find((item) => item.id === projectId && config.matchesProject(item.type)) || null;
      if (!found) throw new Error(`المشروع غير موجود ضمن ${config.projectLabel} أو لا تملك صلاحية الوصول إليه.`);
      setProject(found);
      await Promise.all([loadItems(found.id), loadAudioModels()]);
    } catch (error) {
      setProject(null);
      setItems([]);
      setItemsOwnerId('');
      setWorkspaceError(friendlyLoadError(error, 'تعذر تحميل مساحة المشروع. أعد المحاولة.'));
    } finally {
      setLoading(false);
    }
  }, [config, loadAudioModels, loadItems, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  function reuseDraft(item) {
    setPrompt(String(item.prompt || '').slice(0, 4000));
    setSettings(resolveTemplateSettings(config, item.settings || {}));
    if (tool === 'audio') {
      const savedModelId = typeof item.settings?.modelId === 'string' ? item.settings.modelId : '';
      if (audioModels.some((model) => model.id === savedModelId)) setSelectedAudioModelId(savedModelId);
      setAudioVoice(typeof item.settings?.voice === 'string' ? item.settings.voice : '');
      setAudioFormat(typeof item.settings?.responseFormat === 'string' ? item.settings.responseFormat : '');
    }
    setMessage({ type: 'info', text: 'تم تحميل المسودة في المحرر كنقطة بداية. سيتم تصحيح أي إعداد مزود قديم إلى قدرات الموديل الحالي.' });
    if (typeof document !== 'undefined') {
      document.getElementById('media-draft-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function draftSettings() {
    if (tool !== 'audio') return settings;
    return {
      ...settings,
      ...(selectedAudioModel?.capabilitiesAvailable ? { modelId: selectedAudioModel.id } : {}),
      ...(selectedAudioModel?.capabilitiesAvailable && effectiveAudioVoice ? { voice: effectiveAudioVoice } : {}),
      ...(selectedAudioModel?.capabilitiesAvailable && effectiveAudioFormat ? { responseFormat: effectiveAudioFormat } : {}),
      ...(selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.supportsSpeed ? { speed: 1 } : {}),
    };
  }

  async function saveDraft() {
    if (!project || !config.matchesProject(project.type) || !prompt.trim() || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/project-tool-items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tool, prompt: prompt.trim(), settings: draftSettings(), status: 'draft', itemType: 'draft' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.item) {
        if (response.status === 401) throw new Error('انتهت جلسة الدخول.');
        throw new Error('تعذر حفظ المسودة. تحقق من الاتصال ثم أعد المحاولة.');
      }
      setItems((current) => [payload.item, ...current]);
      setItemsOwnerId(projectId);
      setItemsError('');
      setMessage({ type: 'success', text: 'تم حفظ نسخة مسودة جديدة داخل المشروع. أبقينا النص في المحرر لتتمكن من تطويره أو حفظ نسخة أخرى.' });
    } catch (error) {
      setMessage({ type: 'error', text: friendlyLoadError(error, 'تعذر حفظ المسودة. تحقق من الاتصال ثم أعد المحاولة.') });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="bb-app-canvas min-h-screen pt-24" dir="rtl">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold">
            <Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تحميل مساحة {tool === 'video' ? 'الفيديو' : 'الصوت'}...
          </div>
        </div>
      </main>
    );
  }

  if (workspaceError || !project) {
    return (
      <main className="bb-app-canvas min-h-screen pt-24" dir="rtl">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
          <div className="bb-panel w-full rounded-3xl border p-6 text-center">
            <span className="bb-danger-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl border"><AlertTriangle size={25} /></span>
            <h1 className="bb-text-primary mt-4 text-lg font-black">تعذر فتح مساحة المشروع</h1>
            <p className="bb-text-secondary mt-2 text-sm leading-7">{workspaceError || 'المشروع غير متاح.'}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => void loadWorkspace()} className="bb-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"><RefreshCw size={16} /> إعادة المحاولة</button>
              <Link href={config.listHref} className="bb-button-secondary inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-3 text-sm font-black">العودة إلى المشاريع</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const messageClass = message?.type === 'error'
    ? 'bb-danger-surface'
    : message?.type === 'success'
      ? 'border-[color-mix(in_srgb,var(--bb-success)_25%,transparent)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]'
      : 'bb-accent-soft';

  return (
    <main dir="rtl" className="bb-app-canvas min-h-screen">
      <ProjectToolNav activeTool={tool} />
      <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-6 lg:px-6 xl:grid-cols-[1fr_390px]">
        <section className="bb-panel order-2 overflow-hidden rounded-3xl border xl:order-1">
          <div className="bb-divider flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <div className="bb-text-accent text-xs font-black">{config.projectLabel}</div>
              <h1 className="bb-text-primary mt-1 text-xl font-black">{project.name || config.projectLabel}</h1>
            </div>
            <Link href={config.listHref} className="bb-button-secondary rounded-xl border px-3 py-2 text-xs font-black">كل مشاريع {tool === 'video' ? 'الفيديو' : 'الصوت'}</Link>
          </div>

          <div className="p-5">
            <div className="bb-warning-surface mb-5 rounded-2xl border p-4 text-xs leading-6">
              <div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><div className="bb-text-primary font-black">التوليد المباشر غير مفعل بعد</div><p className="bb-text-secondary mt-1">{config.notice}</p></div></div>
            </div>

            <div className="bb-surface-1 bb-border min-h-[470px] rounded-3xl border border-dashed p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2"><h2 className="bb-text-primary text-sm font-black">سجل المشروع</h2>{itemsLoading && <Loader2 size={14} className="bb-text-accent animate-spin" />}</div>
                <div className="flex items-center gap-2"><span className="bb-text-tertiary text-[11px]">{visibleItems.length} عنصر محفوظ</span><button type="button" onClick={() => void loadItems(projectId)} disabled={itemsLoading} className="bb-button-secondary inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] font-black disabled:opacity-50"><RefreshCw size={13} /> تحديث</button></div>
              </div>

              {itemsError && (
                <div className="bb-danger-surface mb-4 flex flex-col gap-3 rounded-xl border px-3 py-3 text-xs font-bold sm:flex-row sm:items-center sm:justify-between" role="alert">
                  <span>{itemsError}</span><button type="button" onClick={() => void loadItems(projectId)} className="bb-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 font-black"><RefreshCw size={13} /> إعادة تحميل السجل</button>
                </div>
              )}

              {itemsLoading && visibleItems.length === 0 ? (
                <div className="bb-text-secondary flex min-h-[330px] items-center justify-center gap-3 text-sm font-bold"><Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تحميل السجل...</div>
              ) : visibleItems.length === 0 ? (
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><span className="bb-accent-soft flex h-16 w-16 items-center justify-center rounded-2xl border"><Icon size={28} /></span><h3 className="bb-text-primary mt-5 text-lg font-black">لا توجد مسودات محفوظة بعد</h3><p className="bb-text-secondary mt-2 max-w-md text-sm leading-7">جهّز النص والإعدادات من اللوحة الجانبية ثم احفظ نسخة داخل المشروع دون تشغيل أي مزود أو خصم نقاط.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleItems.map((item) => (
                    <article key={item.id} className="bb-card rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3"><span className="bb-accent-soft rounded-lg border px-2 py-1 text-[10px] font-black">مسودة</span><span className="bb-text-tertiary flex items-center gap-1 text-[10px]"><Clock3 size={12} /> {item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</span></div>
                      <p className="bb-text-secondary mt-4 line-clamp-5 text-sm leading-7">{item.prompt}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(item.settings || {}).map(([key, value]) => <span key={key} className="bb-button-secondary rounded-lg border px-2 py-1 text-[10px]">{String(value)}</span>)}</div>
                      <button type="button" onClick={() => reuseDraft(item)} className="bb-button-secondary mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"><PencilLine size={14} /> استخدام كنقطة بداية</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside id="media-draft-composer" className="bb-panel order-1 h-fit scroll-mt-28 rounded-3xl border p-5 xl:order-2 xl:sticky xl:top-[150px]">
          <div className="flex items-center gap-3"><span className="bb-accent-soft flex h-11 w-11 items-center justify-center rounded-xl border"><Icon size={22} /></span><div><div className="bb-text-primary text-sm font-black">أدوات {config.label}</div><div className="bb-text-tertiary text-[11px]">{tool === 'audio' && selectedAudioModel ? `${selectedAudioModel.name} · ${selectedAudioModel.vendor}` : config.model}</div></div></div>
          <div className="mt-6 flex items-center justify-between gap-3"><label htmlFor="media-draft-prompt" className="bb-text-secondary text-xs font-black">{config.promptLabel}</label><span className="bb-text-tertiary text-[10px]">{prompt.length} / 4000</span></div>
          <textarea id="media-draft-prompt" maxLength={4000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={config.placeholder} className="bb-input mt-2 min-h-44 w-full resize-none rounded-2xl border p-4 text-sm leading-7 outline-none" />

          <div className="mt-5 space-y-4">
            {config.settings.map((field) => (
              <label key={field.key} className="block">
                <span className="bb-text-secondary mb-2 block text-xs font-black">{field.label}</span>
                <div className="relative">
                  <select value={settings[field.key]} onChange={(event) => setSettings((current) => ({ ...current, [field.key]: event.target.value }))} className="bb-input w-full appearance-none rounded-xl border px-4 py-3 text-sm font-bold outline-none">
                    {field.values.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <ChevronDown size={15} className="bb-text-tertiary pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </label>
            ))}

            {tool === 'audio' && <div className="bb-surface-1 bb-border rounded-2xl border p-4">
              <div className="bb-text-primary text-xs font-black">إعدادات OpenRouter TTS</div>
              {!audioModelsAvailable ? <p className="bb-text-warning mt-2 text-[10px] leading-5">تعذر قراءة كتالوج الصوت. لم نعرض أصواتًا أو صيغًا بالتخمين.</p> : audioModels.length === 0 ? <p className="bb-text-tertiary mt-2 text-[10px] leading-5">لا يوجد موديل TTS مفعّل ومرئي حاليًا، لذلك لا توجد إعدادات مزود لعرضها.</p> : <div className="mt-3 space-y-3">
                <label className="block"><span className="bb-text-secondary mb-1.5 block text-[10px] font-black">الموديل</span><select value={selectedAudioModelId} onChange={(event) => setSelectedAudioModelId(event.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs font-bold">{audioModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
                {selectedAudioModel && !selectedAudioModel.capabilitiesAvailable && <p className="bb-text-warning text-[10px] leading-5">الموديل موجود لكن قدراته غير مؤكدة؛ لن نعرض Voice أو Format.</p>}
                {selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.voices.length > 0 && <label className="block"><span className="bb-text-secondary mb-1.5 block text-[10px] font-black">Voice</span><select value={effectiveAudioVoice} onChange={(event) => setAudioVoice(event.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs font-bold">{selectedAudioModel.voices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}</select></label>}
                {selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.responseFormats.length > 0 && <label className="block"><span className="bb-text-secondary mb-1.5 block text-[10px] font-black">Output format</span><select value={effectiveAudioFormat} onChange={(event) => setAudioFormat(event.target.value)} className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs font-bold">{selectedAudioModel.responseFormats.map((format) => <option key={format} value={format}>{format}</option>)}</select></label>}
                {selectedAudioModel?.capabilitiesAvailable && selectedAudioModel.supportsSpeed && <div className="bb-text-tertiary rounded-lg border border-[var(--bb-border)] px-3 py-2 text-[10px]">Speed مدعوم بواسطة هذا الموديل؛ إلى أن يعلن الكتالوج Range دقيقًا نحفظ القيمة الآمنة 1.0 فقط ولا نعرض Range تخمينيًا.</div>}
              </div>}
            </div>}
          </div>

          {message && <div className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${messageClass}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
          <button type="button" onClick={saveDraft} disabled={saving || !prompt.trim()} className="bb-button-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ نسخة مسودة
          </button>
          <p className="bb-text-tertiary mt-2 text-center text-[10px] leading-5">حفظ المسودة لا يشغّل مزودًا خارجيًا ولا يخصم نقاطًا.</p>
          <button type="button" disabled className="bb-button-secondary bb-text-disabled mt-2 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-black"><Sparkles size={18} /> التوليد غير متاح حتى تفعيل المزود</button>
        </aside>
      </div>
    </main>
  );
}
