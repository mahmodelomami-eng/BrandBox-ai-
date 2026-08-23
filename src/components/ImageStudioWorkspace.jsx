'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Copy,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic2,
  Palette,
  Plus,
  RefreshCw,
  Sparkles,
  Video,
  Wand2,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { createUserProject, listUserProjects } from '../lib/projects/projects-service';

const IMAGE_MODELS = [
  {
    id: 'openai/gpt-image-2',
    name: 'BRAND BOX Pro',
    provider: 'OpenAI · GPT Image 2',
    cost: 6,
    badge: 'الأفضل',
  },
  {
    id: 'bytedance-seed/seedream-5-0-lite',
    name: 'Seedream 5 Lite',
    provider: 'ByteDance',
    cost: 4,
    badge: 'سريع',
  },
  {
    id: 'google/gemini-3.1-flash-lite-image',
    name: 'Nano Banana 2 Lite',
    provider: 'Google',
    cost: 4,
    badge: 'اقتصادي',
  },
];

const STYLE_OPTIONS = [
  { id: 'none', label: 'لا شيء', prompt: '', background: 'linear-gradient(135deg,#15181f,#08090d)' },
  { id: 'photo', label: 'فوتوغرافي', prompt: 'تصوير فوتوغرافي احترافي، إضاءة واقعية، تفاصيل عالية', background: 'linear-gradient(135deg,#512119,#c97646 55%,#20130f)' },
  { id: 'cinematic', label: 'سينمائي', prompt: 'أسلوب سينمائي درامي، إضاءة سينمائية، عمق ميدان', background: 'linear-gradient(135deg,#111827,#374151 55%,#0b0d12)' },
  { id: 'minimal', label: 'Minimal', prompt: 'أسلوب minimal نظيف، تكوين بسيط، مساحات سلبية متوازنة', background: 'linear-gradient(135deg,#ece8df,#9ea2a8 55%,#30333a)' },
  { id: 'formal', label: 'رسمي', prompt: 'أسلوب رسمي فاخر، إعلان تجاري احترافي، تكوين متزن', background: 'linear-gradient(135deg,#111827,#552126 55%,#090a0d)' },
];

const ASPECTS = [
  { value: '1:1', label: '1:1', box: 'h-4 w-4' },
  { value: '16:9', label: '16:9', box: 'h-3 w-6' },
  { value: '9:16', label: '9:16', box: 'h-6 w-3' },
  { value: '4:3', label: '4:3', box: 'h-4 w-6' },
  { value: '3:4', label: '3:4', box: 'h-6 w-4' },
];

const RESOLUTIONS = [
  { value: '512', label: '768p' },
  { value: '1K', label: '1024p' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const TOOL_LINKS = [
  { id: 'video', label: 'الفيديو AI', description: 'إنشاء فيديو احترافي', icon: Video, href: '/?view=video' },
  { id: 'chat', label: 'شات AI', description: 'محادثة وكتابة ذكية', icon: MessageSquare, href: '/?view=chat' },
  { id: 'audio', label: 'الصوت AI', description: 'الصوت والتعليق', icon: Mic2, href: '/audio-ai' },
  { id: 'projects', label: 'المشاريع', description: 'العودة إلى مشاريعك', icon: FolderOpen, href: '/?view=projects' },
];

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name || 'مشروع بدون اسم',
    description: project.description || '',
    industry: project.industry || '',
    updatedAt: project.updated_at || project.updatedAt || null,
  };
}

function normalizeAsset(asset) {
  return {
    id: asset.id,
    projectId: asset.project_id,
    generationId: asset.generation_id,
    name: asset.name || 'صورة مولدة',
    url: asset.signed_url || asset.url || null,
    createdAt: asset.created_at || null,
  };
}

export default function ImageStudioWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const projectFromUrl = searchParams.get('project') || '';

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl);
  const [gallery, setGallery] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(IMAGE_MODELS[0].id);
  const [styleId, setStyleId] = useState('photo');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2K');
  const [count, setCount] = useState(1);
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [balance, setBalance] = useState(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [message, setMessage] = useState(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const selectedModel = IMAGE_MODELS.find((model) => model.id === selectedModelId) || IMAGE_MODELS[0];
  const selectedStyle = STYLE_OPTIONS.find((style) => style.id === styleId) || STYLE_OPTIONS[0];

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadHistory = useCallback(async (projectId) => {
    if (!projectId) {
      setGallery([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
      const response = await fetch('/api/v1/generations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('تعذر تحميل الصور المولدة.');
      const payload = await response.json();
      const images = (Array.isArray(payload.assets) ? payload.assets : [])
        .filter((asset) => asset.project_id === projectId && asset.signed_url)
        .map(normalizeAsset);
      setGallery(images);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل الصور.' });
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listUserProjects();
      const normalized = rows.map(normalizeProject);
      setProjects(normalized);

      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credit_balance')
          .eq('id', authData.user.id)
          .maybeSingle();
        setBalance(profile?.credit_balance ?? null);
      }

      const initialProject = normalized.find((project) => project.id === projectFromUrl) || normalized[0] || null;
      if (initialProject) {
        setSelectedProjectId(initialProject.id);
        await loadHistory(initialProject.id);
      } else {
        setGallery([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل مساحة الصور.' });
    } finally {
      setLoading(false);
    }
  }, [loadHistory, projectFromUrl, supabase]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const selectProject = async (projectId) => {
    setSelectedProjectId(projectId);
    setProjectOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'images');
    url.searchParams.set('project', projectId);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    await loadHistory(projectId);
  };

  const createImageProject = async () => {
    if (creatingProject) return;
    setCreatingProject(true);
    setMessage(null);
    try {
      const project = await createUserProject({
        name: `مشروع صور ${projects.length + 1}`,
        type: 'صورة',
        description: 'مشروع مخصص لتوليد الصور بالذكاء الاصطناعي',
        industry: 'عام',
        language: 'العربية',
        tone: 'احترافي',
      });
      const normalized = normalizeProject(project);
      setProjects((current) => [normalized, ...current]);
      await selectProject(normalized.id);
      setMessage({ type: 'success', text: 'تم إنشاء مشروع الصور ويمكنك البدء بالتوليد.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر إنشاء المشروع.' });
    } finally {
      setCreatingProject(false);
    }
  };

  const generateImages = async () => {
    if (!activeProject) {
      setMessage({ type: 'error', text: 'أنشئ مشروع صور أولاً.' });
      return;
    }
    if (!prompt.trim()) {
      setMessage({ type: 'error', text: 'اكتب وصف الصورة قبل بدء التوليد.' });
      return;
    }
    if (generating) return;

    setGenerating(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('يجب تسجيل الدخول قبل بدء التوليد.');
      const finalPrompt = selectedStyle.prompt
        ? `${prompt.trim()}\nالأسلوب البصري المطلوب: ${selectedStyle.prompt}.`
        : prompt.trim();
      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationType: 'image',
          modelId: selectedModel.id,
          prompt: finalPrompt,
          projectId: activeProject.id,
          settings: {
            aspectRatio,
            resolution,
            count,
            style: styleId,
            useBrandKit,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.errorMessage || result.error || 'فشل توليد الصورة.');
      }

      const urls = Array.isArray(result.resultUrls)
        ? result.resultUrls
        : result.resultUrl
          ? [result.resultUrl]
          : [];
      const now = new Date().toISOString();
      const optimistic = urls.map((url, index) => ({
        id: `${result.generationId}-${index}`,
        projectId: activeProject.id,
        generationId: result.generationId,
        name: prompt.trim(),
        url,
        createdAt: now,
      }));
      if (optimistic.length) setGallery((current) => [...optimistic, ...current]);
      setBalance(result.remainingBalance ?? balance);
      setPrompt('');
      setMessage({
        type: 'success',
        text: `تم توليد ${urls.length || count} ${urls.length === 1 || count === 1 ? 'صورة' : 'صور'} بنجاح.`,
      });
      window.setTimeout(() => void loadHistory(activeProject.id), 800);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر إكمال التوليد.' });
    } finally {
      setGenerating(false);
    }
  };

  const copyImageLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: 'تم نسخ رابط الصورة.' });
    } catch {
      setMessage({ type: 'error', text: 'تعذر نسخ الرابط.' });
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-[#050506] px-5 py-16 text-white" dir="rtl">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-300">
            <Loader2 className="h-5 w-5 animate-spin text-[#f31325]" /> جاري تجهيز استوديو الصور...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_15%_15%,rgba(243,19,37,.08),transparent_28%),#050506] text-white" dir="rtl">
      <div className="sticky top-20 z-40 border-b border-white/[.06] bg-[#07080b]/95 px-4 py-3 backdrop-blur-xl lg:px-6">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
          <div className="hidden text-xs font-black text-gray-500 lg:block">تنقل سريع بين أدوات الذكاء الاصطناعي</div>
          <div className="flex flex-1 items-stretch justify-end gap-2 overflow-x-auto lg:flex-none">
            {TOOL_LINKS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => router.push(tool.href)}
                  className="group flex min-w-[130px] items-center gap-2 rounded-xl border border-white/[.08] bg-[#0d1016] px-3 py-2.5 text-right transition hover:border-[#f31325]/55 hover:bg-[#f31325]/8"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#171a21] text-[#ff3344] transition group-hover:border-[#ff3344]/40"><Icon size={18} /></span>
                  <span><span className="block text-xs font-black text-white">{tool.label}</span><span className="mt-0.5 hidden text-[9px] text-gray-500 xl:block">{tool.description}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-0 lg:grid-cols-[370px_minmax(0,1fr)]">
        <aside className="border-b border-white/[.07] bg-[#0b0e14] lg:min-h-[calc(100vh-10.5rem)] lg:border-b-0 lg:border-l lg:border-white/[.07]">
          <div className="border-b border-white/[.07] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-white"><Sparkles className="h-5 w-5 text-[#ff3344]" /> توليد صورة جديدة</h1>
                <p className="mt-1 text-xs leading-6 text-gray-500">حوّل أفكارك إلى صور احترافية بألوان Brand Box.</p>
              </div>
              <button type="button" onClick={() => void loadHistory(activeProject?.id)} className="rounded-xl border border-white/10 p-2 text-gray-500 transition hover:border-[#f31325]/40 hover:text-white" aria-label="تحديث الصور"><RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} /></button>
            </div>

            <div className="relative mt-4">
              <button type="button" onClick={() => setProjectOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#11141b] px-3 py-3 text-right transition hover:border-[#f31325]/35">
                <span className="min-w-0"><span className="block text-[10px] font-bold text-gray-500">المشروع الحالي</span><span className="mt-0.5 block truncate text-xs font-black text-white">{activeProject?.name || 'لا يوجد مشروع'}</span></span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition ${projectOpen ? 'rotate-180' : ''}`} />
              </button>
              {projectOpen && projects.length > 0 && (
                <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#151820] p-1.5 shadow-2xl">
                  {projects.map((project) => (
                    <button key={project.id} type="button" onClick={() => void selectProject(project.id)} className={`w-full rounded-lg px-3 py-2.5 text-right text-xs font-bold transition ${activeProject?.id === project.id ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>{project.name}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={createImageProject} disabled={creatingProject} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f31325]/35 px-3 py-2.5 text-xs font-black text-[#ff6573] transition hover:bg-[#f31325]/8 disabled:opacity-50"><Plus className="h-4 w-4" />{creatingProject ? 'جاري الإنشاء...' : 'مشروع صور جديد'}</button>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black text-gray-300">وصف الصورة</label><span className="text-[10px] text-gray-600">{prompt.length} / 1000</span></div>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1000))} rows={5} placeholder="مثال: غرفة معيشة حديثة وفاخرة، إضاءة طبيعية، نافذة كبيرة، أثاث عصري..." className="w-full resize-none rounded-xl border border-white/10 bg-[#11141b] p-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-[#f31325]/55" />
              <div className="mt-2 flex gap-2"><button type="button" onClick={() => setPrompt('')} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-gray-400 hover:text-white">مسح</button><button type="button" onClick={() => setPrompt('تصميم إعلاني احترافي لمنتج فاخر، تكوين بصري قوي، إضاءة درامية، جودة تصوير تجاري عالية')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-gray-400 hover:text-white"><Wand2 className="h-3.5 w-3.5" /> إلهام عشوائي</button></div>
            </div>

            <div className="relative">
              <label className="mb-2 block text-xs font-black text-gray-300">النموذج (Model)</label>
              <button type="button" onClick={() => setModelOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#11141b] p-3 text-right transition hover:border-[#f31325]/35">
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/5"><Sparkles className="h-4 w-4 text-white" /></span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-xs font-black text-white">{selectedModel.name}</span><span className="rounded-full bg-[#f31325]/15 px-2 py-0.5 text-[9px] font-black text-[#ff6573]">{selectedModel.badge}</span></span><span className="mt-1 block truncate text-[9px] text-gray-500">{selectedModel.provider} · {selectedModel.cost} نقاط</span></span></span><ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${modelOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelOpen && (
                <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border border-white/10 bg-[#151820] p-1.5 shadow-2xl">
                  {IMAGE_MODELS.map((model) => <button key={model.id} type="button" onClick={() => { setSelectedModelId(model.id); setModelOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right ${selectedModel.id === model.id ? 'bg-[#f31325]/12' : 'hover:bg-white/5'}`}><span><span className="block text-xs font-black text-white">{model.name}</span><span className="mt-0.5 block text-[9px] text-gray-500">{model.provider}</span></span><span className="text-[10px] font-black text-[#ff6573]">{model.cost} نقاط</span></button>)}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black text-gray-300">الطراز (Style)</label><span className="text-[10px] font-bold text-[#ff4d5f]">عرض الكل</span></div>
              <div className="grid grid-cols-5 gap-2">{STYLE_OPTIONS.map((style) => <button key={style.id} type="button" onClick={() => setStyleId(style.id)} className={`overflow-hidden rounded-xl border bg-[#11141b] p-1 transition ${styleId === style.id ? 'border-[#f31325] shadow-[0_0_18px_rgba(243,19,37,.14)]' : 'border-white/[.07] hover:border-white/20'}`}><span className="block aspect-square rounded-lg" style={{ background: style.background }} /><span className="mt-1 block truncate text-[9px] font-bold text-gray-400">{style.label}</span></button>)}</div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black text-gray-300">النسبة (Aspect Ratio)</label><span className="text-[10px] font-bold text-[#ff4d5f]">عرض الكل</span></div>
              <div className="grid grid-cols-5 gap-2">{ASPECTS.map((item) => <button key={item.value} type="button" onClick={() => setAspectRatio(item.value)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-[9px] font-bold transition ${aspectRatio === item.value ? 'border-[#f31325] bg-[#f31325]/7 text-white' : 'border-white/[.08] bg-[#11141b] text-gray-500 hover:border-white/20'}`}><span className={`mb-1 rounded-sm border ${item.box} ${aspectRatio === item.value ? 'border-[#ff3344]' : 'border-gray-500'}`} />{item.label}</button>)}</div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black text-gray-300">الدقة (Resolution)</label><span className="text-[10px] font-bold text-[#ff4d5f]">عرض الكل</span></div>
              <div className="grid grid-cols-4 gap-2">{RESOLUTIONS.map((item) => <button key={item.label} type="button" onClick={() => setResolution(item.value)} className={`rounded-xl border px-2 py-2.5 text-[10px] font-black transition ${resolution === item.value ? 'border-[#f31325] bg-[#f31325]/7 text-white' : 'border-white/[.08] bg-[#11141b] text-gray-500 hover:border-white/20'}`}>{item.label}</button>)}</div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black text-gray-300">عدد الصور</label><span className="text-[10px] text-gray-600">حتى 4</span></div>
              <div className="grid grid-cols-3 gap-2">{[1, 2, 4].map((value) => <button key={value} type="button" onClick={() => setCount(value)} className={`rounded-xl border px-2 py-2.5 text-xs font-black transition ${count === value ? 'border-[#f31325] bg-[#f31325]/7 text-white' : 'border-white/[.08] bg-[#11141b] text-gray-500 hover:border-white/20'}`}>{value}</button>)}</div>
            </div>

            <button type="button" onClick={() => setUseBrandKit((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/[.08] bg-[#11141b] p-3 text-xs font-bold text-gray-300"><span className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#ff3344]" />تطبيق هوية المشروع</span><span className={`relative h-5 w-9 rounded-full transition ${useBrandKit ? 'bg-[#f31325]' : 'bg-[#343847]'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${useBrandKit ? 'right-0.5' : 'right-[18px]'}`} /></span></button>

            <button type="button" onClick={generateImages} disabled={generating || !activeProject} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#c50f1d] to-[#f31325] py-3.5 text-sm font-black text-white shadow-[0_12px_35px_rgba(243,19,37,.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" />{generating ? 'جاري توليد الصور...' : `توليد ${count === 1 ? 'الصورة' : `${count} صور`}`}</button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600"><span>سيستهلك تقريباً</span><strong className="text-gray-400">{selectedModel.cost * count}</strong><span>نقطة</span>{balance !== null && <><span>· رصيدك</span><strong className="text-[#ff6573]">{balance}</strong></>}</div>

            {message && <div className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${message.type === 'error' ? 'border-red-500/25 bg-red-500/8 text-red-200' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-200'}`}>{message.text}</div>}
          </div>
        </aside>

        <section className="min-w-0 bg-[#07080b] lg:min-h-[calc(100vh-10.5rem)]">
          <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4 sm:px-6">
            <div className="min-w-0"><p className="text-[10px] font-bold text-[#ff3344]">الصور المولدة</p><h2 className="mt-0.5 truncate text-sm font-black text-white">{activeProject?.name || 'معرض الصور'}</h2></div>
            <div className="flex items-center gap-2"><span className="rounded-lg border border-white/10 bg-[#0d1016] px-3 py-2 text-[10px] font-bold text-gray-400">{gallery.length} صورة</span><button type="button" onClick={() => void loadHistory(activeProject?.id)} className="rounded-lg border border-white/10 bg-[#0d1016] p-2 text-gray-500 hover:text-white" aria-label="تحديث المعرض"><RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} /></button></div>
          </div>

          <div className="p-4 sm:p-6">
            {!activeProject ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#0b0d12] text-center"><FolderOpen className="h-12 w-12 text-gray-700" /><h3 className="mt-5 text-lg font-black">أنشئ مشروع صور للبدء</h3><p className="mt-2 max-w-md text-xs leading-6 text-gray-500">لوحة التوليد على اليسار مرتبطة بالمشروع، وستظهر الصور الناتجة هنا فقط.</p><button type="button" onClick={createImageProject} className="mt-5 rounded-xl bg-[#f31325] px-5 py-3 text-xs font-black">إنشاء مشروع صور</button></div>
            ) : gallery.length === 0 ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#f31325]/20 bg-[radial-gradient(circle_at_center,rgba(243,19,37,.05),transparent_45%),#0b0d12] text-center"><span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[#11141b]"><ImageIcon className="h-9 w-9 text-gray-600" /></span><h3 className="mt-6 text-lg font-black text-white">لم يتم توليد أي صورة بعد</h3><p className="mt-2 max-w-md text-xs leading-6 text-gray-500">اكتب وصفك وحدد الإعدادات من لوحة الأدوات على اليسار. كل الصور التي يتم توليدها ستظهر هنا فقط.</p></div>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
                {gallery.map((image) => (
                  <article key={image.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/[.08] bg-[#0d1016] shadow-[0_12px_40px_rgba(0,0,0,.18)] transition hover:border-[#f31325]/45">
                    <img src={image.url} alt={image.name} className="h-auto w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16 transition duration-300 group-hover:translate-y-0">
                      <p className="line-clamp-2 text-xs font-black leading-5 text-white">{image.name}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')} className="rounded-lg border border-white/10 bg-black/50 p-2 text-white backdrop-blur" aria-label="فتح أو تنزيل الصورة"><Download className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => void copyImageLink(image.url)} className="rounded-lg border border-white/10 bg-black/50 p-2 text-white backdrop-blur" aria-label="نسخ رابط الصورة"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
