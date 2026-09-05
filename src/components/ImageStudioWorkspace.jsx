'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Copy,
  ExternalLink,
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
import { useAuth } from '../context/AuthContext';

const STYLE_OPTIONS = [
  { id: 'none', label: 'لا شيء', prompt: '', background: 'linear-gradient(135deg,#15181f,#08090d)' },
  { id: 'photo', label: 'فوتوغرافي', prompt: 'تصوير فوتوغرافي احترافي، إضاءة واقعية، تفاصيل عالية', background: 'linear-gradient(135deg,#512119,#c97646 55%,#20130f)' },
  { id: 'cinematic', label: 'سينمائي', prompt: 'أسلوب سينمائي درامي، إضاءة سينمائية، عمق ميدان', background: 'linear-gradient(135deg,#111827,#374151 55%,#0b0d12)' },
  { id: 'minimal', label: 'Minimal', prompt: 'أسلوب minimal نظيف، تكوين بسيط، مساحات سلبية متوازنة', background: 'linear-gradient(135deg,#ece8df,#9ea2a8 55%,#30333a)' },
  { id: 'formal', label: 'رسمي', prompt: 'أسلوب رسمي فاخر، إعلان تجاري احترافي، تكوين متزن', background: 'linear-gradient(135deg,#111827,#552126 55%,#090a0d)' },
];

// Visual metadata only. This is NOT an allowlist. The actual selectable aspect
// ratios always come from the selected model's OpenRouter capability object.
const ASPECT_META = {
  '1:1': { label: '1:1', box: 'h-4 w-4' },
  '16:9': { label: '16:9', box: 'h-3 w-6' },
  '9:16': { label: '9:16', box: 'h-6 w-3' },
  '4:3': { label: '4:3', box: 'h-4 w-6' },
  '3:4': { label: '3:4', box: 'h-6 w-4' },
  '3:2': { label: '3:2', box: 'h-4 w-6' },
  '2:3': { label: '2:3', box: 'h-6 w-4' },
  '4:5': { label: '4:5', box: 'h-5 w-4' },
  '5:4': { label: '5:4', box: 'h-4 w-5' },
  '21:9': { label: '21:9', box: 'h-2.5 w-7' },
};

const TOOL_LINKS = [
  { id: 'images', label: 'الصور AI', description: 'مشاريع الصور', icon: ImageIcon, href: '/projects/images' },
  { id: 'video', label: 'الفيديو AI', description: 'مشاريع الفيديو', icon: Video, href: '/projects/video' },
  { id: 'chat', label: 'شات AI', description: 'مشاريع الشات', icon: MessageSquare, href: '/projects/chat' },
  { id: 'audio', label: 'الصوت AI', description: 'مشاريع الصوت', icon: Mic2, href: '/projects/audio' },
  { id: 'projects', label: 'المشاريع', description: 'العودة إلى مشاريعك', icon: FolderOpen, href: '/projects' },
];

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name || 'مشروع بدون اسم',
    type: project.type || '',
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

function normalizeImageModel(model) {
  const metadata = model?.metadata && typeof model.metadata === 'object' ? model.metadata : {};
  const capabilityImage = model?.capabilities?.image && typeof model.capabilities.image === 'object'
    ? model.capabilities.image
    : {};
  const cost = Number(model?.minimum_credits);
  const supportedResolutions = Array.isArray(model?.supported_resolutions)
    ? model.supported_resolutions.filter(Boolean)
    : Array.isArray(capabilityImage.resolutions) ? capabilityImage.resolutions.filter(Boolean) : [];
  const supportedAspectRatios = Array.isArray(model?.supported_aspect_ratios)
    ? model.supported_aspect_ratios.filter(Boolean)
    : Array.isArray(capabilityImage.aspectRatios) ? capabilityImage.aspectRatios.filter(Boolean) : [];
  const maxCount = Number(model?.max_count ?? capabilityImage?.countRange?.max ?? 0);
  return {
    id: model?.model_id || '',
    name: model?.display_name_ar || model?.display_name_en || model?.model_id || 'نموذج صور',
    provider: model?.vendor_name || 'OpenRouter',
    cost: Number.isFinite(cost) ? cost : 0,
    featured: metadata.brandbox_featured === true,
    badge: typeof metadata.brandbox_badge === 'string' ? metadata.brandbox_badge : 'متاح',
    capabilitiesAvailable: model?.capabilitiesAvailable === true,
    capabilitySource: model?.capabilitySource || 'unknown',
    supportedResolutions,
    supportedAspectRatios,
    maxCount: Number.isInteger(maxCount) && maxCount > 0 ? Math.min(maxCount, 20) : 0,
  };
}

function aspectMeta(value) {
  return ASPECT_META[value] || { label: value, box: 'h-4 w-5' };
}

function resolutionLabel(value) {
  return String(value).toLowerCase() === '512' ? '512px' : String(value);
}

function isImageProject(project) {
  return /صورة|image/i.test(project?.type || '');
}

function friendlyImageError(value) {
  const code = String(value || '').toUpperCase();
  if (code.includes('INSUFFICIENT_CREDITS')) return 'رصيدك غير كافٍ لهذه العملية. اشحن الرصيد أو خفّض عدد الصور.';
  if (code.includes('RATE_LIMIT')) return 'مزود الصور مشغول حاليًا. انتظر قليلًا ثم أعد المحاولة.';
  if (code.includes('TIMEOUT')) return 'استغرق مزود الصور وقتًا أطول من المتوقع. لم تُحتسب العملية الناجحة ويمكنك إعادة المحاولة.';
  if (code.includes('CAPABILIT')) return 'تعذر التحقق من إعدادات هذا النموذج من OpenRouter. تم إيقاف التوليد بدل إرسال إعدادات غير مؤكدة.';
  if (code.includes('MODEL') && (code.includes('UNAVAILABLE') || code.includes('DISABLED') || code.includes('NOT_ALLOWED'))) return 'نموذج الصور المحدد غير متاح حاليًا. اختر نموذجًا آخر أو حدّث القائمة.';
  if (code.includes('SETTING') || code.includes('ASPECT') || code.includes('RESOLUTION') || code.includes('COUNT')) return 'الإعدادات الحالية غير مدعومة بواسطة هذا النموذج. غيّر الدقة أو النسبة أو عدد الصور.';
  if (code.includes('PROVIDER') || code.includes('UPSTREAM')) return 'تعذر الوصول إلى مزود الصور حاليًا. أعد المحاولة بعد قليل.';
  return 'تعذر توليد الصورة. احتفظنا بإعداداتك ويمكنك إعادة المحاولة.';
}

function handleListboxOptionKeyDown(event, closeMenu, triggerId) {
  const listbox = event.currentTarget.closest('[role="listbox"]');
  const options = listbox ? Array.from(listbox.querySelectorAll('[role="option"]')) : [];
  const currentIndex = options.indexOf(event.currentTarget);
  let nextIndex = null;
  if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, currentIndex + 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = Math.max(0, options.length - 1);
  if (nextIndex !== null) {
    event.preventDefault();
    options[nextIndex]?.focus();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
    document.getElementById(triggerId)?.focus();
  }
}

function SelectTile({ active, children, onClick, pressed, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`min-h-11 rounded-xl border p-2 transition focus-visible:outline-none focus-visible:ring-2 ${active ? 'bb-menu-item-active border-[var(--bb-accent-border)]' : 'bb-button-secondary'} ${className}`}
    >
      {children}
    </button>
  );
}

export default function ImageStudioWorkspace() {
  const searchParams = useSearchParams();
  const { creditBalance, refreshProfile } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const projectFromUrl = searchParams.get('project') || '';
  const promptFromUrl = searchParams.get('prompt') || '';
  const styleFromUrl = searchParams.get('style') || '';
  const aspectFromUrl = searchParams.get('aspect') || '';
  const initialStyleId = STYLE_OPTIONS.some((style) => style.id === styleFromUrl) ? styleFromUrl : 'photo';

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl);
  const [gallery, setGallery] = useState([]);
  const [galleryProjectId, setGalleryProjectId] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [workspaceLoadFailed, setWorkspaceLoadFailed] = useState(false);
  const [imageModels, setImageModels] = useState([]);
  const [imageModelsAvailable, setImageModelsAvailable] = useState(true);
  const [prompt, setPrompt] = useState(promptFromUrl.slice(0, 1000));
  const [selectedModelId, setSelectedModelId] = useState('');
  const [styleId, setStyleId] = useState(initialStyleId);
  const [aspectRatio, setAspectRatio] = useState(aspectFromUrl || '');
  const [resolution, setResolution] = useState('');
  const [count, setCount] = useState(1);
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [balance, setBalance] = useState(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [message, setMessage] = useState(promptFromUrl ? { type: 'success', text: 'تم تحميل برومبت القالب. سيتم ضبط الدقة والنسبة والعدد تلقائيًا حسب النموذج المختار.' } : null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const selectedModel = imageModels.find((model) => model.id === selectedModelId) || imageModels[0] || null;
  const recommendedImageModels = useMemo(() => imageModels.filter((model) => model.featured), [imageModels]);
  const otherImageModels = useMemo(() => imageModels.filter((model) => !model.featured), [imageModels]);
  const selectedStyle = STYLE_OPTIONS.find((style) => style.id === styleId) || STYLE_OPTIONS[0];
  const availableAspects = selectedModel?.supportedAspectRatios || [];
  const availableResolutions = selectedModel?.supportedResolutions || [];
  const maxCount = selectedModel?.maxCount || 0;
  const countOptions = useMemo(
    () => maxCount > 0 ? Array.from({ length: maxCount }, (_, index) => index + 1) : [],
    [maxCount],
  );
  const capabilitiesAvailable = Boolean(selectedModel?.capabilitiesAvailable && availableAspects.length && maxCount > 0);

  useEffect(() => {
    if (!selectedModel) return;
    if (availableAspects.length > 0 && !availableAspects.includes(aspectRatio)) {
      setAspectRatio(availableAspects[0]);
    }
    if (availableResolutions.length === 0) {
      if (resolution) setResolution('');
    } else if (!availableResolutions.includes(resolution)) {
      setResolution(availableResolutions[0]);
    }
    if (maxCount > 0 && (count < 1 || count > maxCount)) setCount(1);
  }, [aspectRatio, availableAspects, availableResolutions, count, maxCount, resolution, selectedModel]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadHistory = useCallback(async (projectId) => {
    if (!projectId) {
      setGallery([]);
      setGalleryProjectId(null);
      setHistoryError('');
      return;
    }
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('SESSION_REQUIRED');
      const query = new URLSearchParams({ projectId, generationType: 'image' });
      const response = await fetch(`/api/v1/generations?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('IMAGE_HISTORY_UNAVAILABLE');
      const payload = await response.json();
      const models = (Array.isArray(payload.imageModels) ? payload.imageModels : [])
        .map(normalizeImageModel)
        .filter((model) => model.id && model.cost > 0);
      setImageModels(models);
      setImageModelsAvailable(payload.imageModelsAvailable !== false);
      setSelectedModelId((current) => models.some((model) => model.id === current) ? current : (models[0]?.id || ''));
      const images = (Array.isArray(payload.assets) ? payload.assets : [])
        .filter((asset) => asset.signed_url)
        .map(normalizeAsset);
      setGallery(images);
      setGalleryProjectId(projectId);
    } catch (error) {
      const text = error instanceof Error && error.message === 'SESSION_REQUIRED'
        ? 'انتهت جلسة الدخول. أعد تسجيل الدخول ثم حدّث المعرض.'
        : 'تعذر تحميل معرض الصور لهذا المشروع. يمكنك إعادة المحاولة دون فقد إعداداتك.';
      setHistoryError(text);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setWorkspaceLoadFailed(false);
    try {
      const rows = await listUserProjects();
      const normalized = rows.map(normalizeProject).filter(isImageProject);
      setProjects(normalized);

      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', authData.user.id).maybeSingle();
        setBalance(profile?.credit_balance ?? null);
      }

      const initialProject = normalized.find((project) => project.id === projectFromUrl) || normalized[0] || null;
      if (initialProject) {
        setSelectedProjectId(initialProject.id);
        if (projectFromUrl !== initialProject.id && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('project', initialProject.id);
          url.searchParams.delete('view');
          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        }
        await loadHistory(initialProject.id);
      } else {
        setGallery([]);
        setGalleryProjectId(null);
        setSelectedProjectId('');
      }
    } catch {
      setWorkspaceLoadFailed(true);
      setMessage({ type: 'error', text: 'تعذر تحميل مساحة الصور. تحقق من الاتصال ثم أعد المحاولة.' });
    } finally {
      setLoading(false);
    }
  }, [loadHistory, projectFromUrl, supabase]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    if (projectFromUrl && projectFromUrl !== selectedProjectId && projects.length > 0) {
      const found = projects.find((project) => project.id === projectFromUrl);
      if (found) {
        setSelectedProjectId(found.id);
        void loadHistory(found.id);
      }
    }
  }, [projectFromUrl, projects, selectedProjectId, loadHistory]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setModelOpen(false);
        setProjectOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const selectProject = async (projectId) => {
    setSelectedProjectId(projectId);
    setProjectOpen(false);
    setHistoryError('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('project', projectId);
      url.searchParams.delete('view');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    await loadHistory(projectId);
  };

  const selectImageModel = (modelId) => {
    setSelectedModelId(modelId);
    setModelOpen(false);
  };

  const openImageModelListFromKeyboard = (event) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    setModelOpen(true);
    window.requestAnimationFrame(() => {
      document.querySelector('#image-model-listbox [role="option"]')?.focus();
    });
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
    } catch {
      setMessage({ type: 'error', text: 'تعذر إنشاء مشروع الصور. أعد المحاولة.' });
    } finally {
      setCreatingProject(false);
    }
  };

  const currentBalance = balance !== null ? balance : (creditBalance ?? null);
  const requiredCredits = selectedModel ? selectedModel.cost * count : 0;
  const insufficientCredits = currentBalance !== null && requiredCredits > currentBalance;
  const galleryReady = Boolean(activeProject?.id && galleryProjectId === activeProject.id);

  const generateImages = async () => {
    if (!activeProject) {
      setMessage({ type: 'error', text: 'أنشئ مشروع صور أولاً.' });
      return;
    }
    if (!imageModelsAvailable || !selectedModel) {
      setMessage({ type: 'error', text: 'نماذج الصور غير متاحة مؤقتًا. أعد المحاولة بعد قليل.' });
      return;
    }
    if (!capabilitiesAvailable) {
      setMessage({ type: 'error', text: 'تعذر تأكيد قدرات النموذج من OpenRouter. لن نرسل إعدادات بالتخمين.' });
      return;
    }
    if (!prompt.trim()) {
      setMessage({ type: 'error', text: 'اكتب وصف الصورة قبل بدء التوليد.' });
      return;
    }
    if (insufficientCredits) {
      setMessage({ type: 'error', text: 'رصيدك غير كافٍ لهذه العملية. اشحن الرصيد أو خفّض عدد الصور.' });
      return;
    }
    if (generating) return;

    setGenerating(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('SESSION_REQUIRED');
      const finalPrompt = selectedStyle.prompt ? `${prompt.trim()}\nالأسلوب البصري المطلوب: ${selectedStyle.prompt}.` : prompt.trim();
      const settings = { aspectRatio, count, style: styleId, useBrandKit, ...(resolution ? { resolution } : {}) };
      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'image',
          requestId: crypto.randomUUID(),
          modelId: selectedModel.id,
          prompt: finalPrompt,
          projectId: activeProject.id,
          settings,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.errorMessage || result.error || 'IMAGE_GENERATION_FAILED');

      const normalizedSettings = result.normalizedSettings || settings;
      if (normalizedSettings.aspectRatio) setAspectRatio(normalizedSettings.aspectRatio);
      if ('resolution' in normalizedSettings) setResolution(normalizedSettings.resolution || '');
      if (Number.isInteger(Number(normalizedSettings.count))) setCount(Number(normalizedSettings.count));

      const urls = Array.isArray(result.resultUrls) ? result.resultUrls : result.resultUrl ? [result.resultUrl] : [];
      const now = new Date().toISOString();
      const optimistic = urls.map((url, index) => ({
        id: `${result.generationId}-${index}`,
        projectId: activeProject.id,
        generationId: result.generationId,
        name: prompt.trim(),
        url,
        createdAt: now,
      }));
      if (optimistic.length) {
        setGalleryProjectId(activeProject.id);
        setGallery((current) => [...optimistic, ...current]);
      }
      if (typeof result.remainingBalance === 'number') setBalance(result.remainingBalance);
      setMessage({ type: 'success', text: `تم توليد ${urls.length || count} ${urls.length === 1 || count === 1 ? 'صورة' : 'صور'} بالإعدادات المدعومة فعليًا من النموذج.` });
      if (refreshProfile) void refreshProfile();
      window.setTimeout(() => void loadHistory(activeProject.id), 800);
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'IMAGE_GENERATION_FAILED';
      setMessage({ type: 'error', text: raw === 'SESSION_REQUIRED' ? 'انتهت جلسة الدخول. أعد تسجيل الدخول ثم جرّب مرة أخرى.' : friendlyImageError(raw) });
    } finally {
      setGenerating(false);
    }
  };

  const copyImageLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: 'تم نسخ رابط مؤقت للصورة. قد تنتهي صلاحيته لاحقًا.' });
    } catch {
      setMessage({ type: 'error', text: 'تعذر نسخ رابط الصورة.' });
    }
  };

  if (loading) {
    return (
      <main className="bb-app-canvas min-h-[calc(100vh-5rem)] px-5 py-16" dir="rtl">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold" aria-live="polite">
            <Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تجهيز استوديو الصور...
          </div>
        </div>
      </main>
    );
  }

  const renderImageModelOption = (model) => (
    <button
      key={model.id}
      type="button"
      onClick={() => selectImageModel(model.id)}
      onKeyDown={(event) => handleListboxOptionKeyDown(event, () => setModelOpen(false), 'image-model-trigger')}
      role="option"
      aria-selected={selectedModel?.id === model.id}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right focus-visible:outline-none focus-visible:ring-2 ${selectedModel?.id === model.id ? 'bb-menu-item-active' : 'bb-menu-item'}`}
    >
      <span className="min-w-0"><span className="bb-text-primary block truncate text-xs font-black">{model.name}</span><span className="bb-text-tertiary mt-0.5 block truncate text-[9px]">{model.provider} · {model.cost} نقاط/صورة</span></span>
      <span className="bb-accent-soft shrink-0 rounded-full px-2 py-1 text-[9px] font-black">{model.badge}</span>
    </button>
  );

  return (
    <main className="bb-app-canvas min-h-[calc(100vh-5rem)]" dir="rtl">
      <div className="bb-surface-1 bb-border-subtle sticky top-20 z-40 border-b px-4 py-3 shadow-[var(--bb-shadow-sm)] lg:px-6">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
          <div className="bb-text-tertiary hidden text-xs font-black lg:block">تنقل سريع بين أدوات الذكاء الاصطناعي</div>
          <div className="flex flex-1 items-stretch justify-end gap-2 overflow-x-auto lg:flex-none">
            {TOOL_LINKS.map((tool) => {
              const Icon = tool.icon;
              const active = tool.id === 'images';
              return (
                <Link key={tool.id} href={tool.href} aria-current={active ? 'page' : undefined} className={`group flex min-h-12 min-w-[130px] items-center gap-2 rounded-xl border px-3 py-2.5 text-right transition focus-visible:outline-none focus-visible:ring-2 ${active ? 'bb-menu-item-active border-[var(--bb-accent-border)]' : 'bb-button-secondary'}`}>
                  <span className={`${active ? 'bb-button-primary' : 'bb-accent-soft'} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}><Icon size={18} /></span>
                  <span><span className="bb-text-primary block text-xs font-black">{tool.label}</span><span className="bb-text-tertiary mt-0.5 hidden text-[9px] xl:block">{tool.description}</span></span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {workspaceLoadFailed && (
        <div className="mx-auto max-w-[1800px] px-4 pt-4 lg:px-6">
          <div className="bb-danger-surface flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>تعذر تحميل مساحة الصور. لم نفقد البرومبت أو إعداداتك الحالية.</span>
            <button type="button" onClick={() => void loadWorkspace()} className="bb-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2"><RefreshCw size={14} /> إعادة المحاولة</button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-0 lg:grid-cols-[370px_minmax(0,1fr)]">
        <aside className="bb-surface-2 bb-border-subtle border-b lg:min-h-[calc(100vh-10.5rem)] lg:border-b-0 lg:border-l">
          <div className="bb-divider border-b px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="bb-text-primary flex items-center gap-2 text-xl font-black"><Sparkles className="bb-text-accent h-5 w-5" /> توليد صورة جديدة</h1>
                <p className="bb-text-secondary mt-1 text-xs leading-6">الإعدادات أدناه تتغير تلقائيًا لتطابق قدرات النموذج المحدد في OpenRouter.</p>
              </div>
              <button type="button" onClick={() => void loadHistory(activeProject?.id)} disabled={!activeProject || historyLoading} className="bb-button-secondary grid h-10 w-10 place-items-center rounded-xl border transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2" aria-label="تحديث الصور"><RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} /></button>
            </div>

            <div className="relative mt-4">
              <button type="button" onClick={() => setProjectOpen((value) => !value)} aria-expanded={projectOpen} aria-haspopup="listbox" className="bb-button-secondary flex min-h-12 w-full items-center justify-between rounded-xl border px-3 py-3 text-right transition focus-visible:outline-none focus-visible:ring-2">
                <span className="min-w-0"><span className="bb-text-tertiary block text-[10px] font-bold">مشروع الصور الحالي</span><span className="bb-text-primary mt-0.5 block truncate text-xs font-black">{activeProject?.name || 'لا يوجد مشروع صور'}</span></span>
                <ChevronDown className={`bb-text-tertiary h-4 w-4 transition ${projectOpen ? 'rotate-180' : ''}`} />
              </button>
              {projectOpen && projects.length > 0 && (
                <div className="bb-menu absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border p-1.5" role="listbox" aria-label="مشاريع الصور">
                  {projects.map((project) => (
                    <button key={project.id} type="button" onClick={() => void selectProject(project.id)} role="option" aria-selected={activeProject?.id === project.id} className={`min-h-11 w-full rounded-lg px-3 py-2.5 text-right text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 ${activeProject?.id === project.id ? 'bb-menu-item-active' : 'bb-menu-item'}`}>{project.name}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={createImageProject} disabled={creatingProject} className="bb-accent-soft mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs font-black transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"><Plus className="h-4 w-4" />{creatingProject ? 'جاري الإنشاء...' : 'مشروع صور جديد'}</button>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between"><label htmlFor="image-prompt" className="bb-text-secondary text-xs font-black">وصف الصورة</label><span className="bb-text-tertiary text-[10px]">{prompt.length} / 1000</span></div>
              <textarea id="image-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1000))} rows={5} placeholder="مثال: غرفة معيشة حديثة وفاخرة، إضاءة طبيعية، نافذة كبيرة، أثاث عصري..." className="bb-input w-full resize-none rounded-xl border p-3 text-sm leading-6 outline-none transition" />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setPrompt('')} className="bb-button-secondary min-h-10 flex-1 rounded-lg border px-3 py-2 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2">مسح</button>
                <button type="button" onClick={() => setPrompt('تصميم إعلاني احترافي لمنتج فاخر، تكوين بصري قوي، إضاءة درامية، جودة تصوير تجاري عالية')} className="bb-button-secondary flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2"><Wand2 className="h-3.5 w-3.5" /> اقتراح جاهز</button>
              </div>
            </div>

            <div className="relative">
              <label className="bb-text-secondary mb-2 block text-xs font-black">النموذج (Model)</label>
              <button id="image-model-trigger" type="button" disabled={!imageModelsAvailable || !selectedModel} onClick={() => setModelOpen((value) => !value)} onKeyDown={openImageModelListFromKeyboard} aria-expanded={modelOpen} aria-haspopup="listbox" aria-controls="image-model-listbox" className="bb-button-secondary flex min-h-12 w-full items-center justify-between rounded-xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2">
                {selectedModel ? (
                  <span className="flex min-w-0 items-center gap-3"><span className="bb-accent-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"><Sparkles className="h-4 w-4" /></span><span className="min-w-0"><span className="flex items-center gap-2"><span className="bb-text-primary truncate text-xs font-black">{selectedModel.name}</span><span className="bb-accent-soft rounded-full px-2 py-0.5 text-[9px] font-black">{selectedModel.badge}</span></span><span className="bb-text-tertiary mt-1 block truncate text-[9px]">{selectedModel.provider} · {selectedModel.cost} نقاط للصورة</span></span></span>
                ) : <span className="bb-text-tertiary text-xs font-bold">لا يوجد نموذج صور مفعّل حاليًا</span>}
                <ChevronDown className={`bb-text-tertiary h-4 w-4 shrink-0 transition ${modelOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelOpen && imageModels.length > 0 && (
                <div id="image-model-listbox" className="bb-menu absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border p-1.5" role="listbox" aria-label="نماذج الصور">
                  {recommendedImageModels.length > 0 && <div className="bb-text-accent px-3 pb-1 pt-2 text-[9px] font-black" role="presentation">موصى به</div>}
                  {recommendedImageModels.map(renderImageModelOption)}
                  {otherImageModels.length > 0 && <div className="bb-text-tertiary mt-1 border-t border-[var(--bb-border)] px-3 pb-1 pt-2 text-[9px] font-black" role="presentation">كل النماذج</div>}
                  {otherImageModels.map(renderImageModelOption)}
                </div>
              )}
              {(!imageModelsAvailable || imageModels.length === 0) && <p className="bb-text-warning mt-2 text-[10px] leading-5">نماذج الصور غير متاحة مؤقتًا. لن يتم خصم نقاط حتى يعود كتالوج النماذج.</p>}
              {selectedModel && !capabilitiesAvailable && <p className="bb-text-warning mt-2 text-[10px] leading-5">تعذر تأكيد قدرات هذا النموذج. تم تعطيل التوليد حتى لا تظهر أو تُرسل إعدادات غير مدعومة.</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="bb-text-secondary text-xs font-black">الطراز (Style)</label><span className="bb-text-accent text-[10px] font-bold">{selectedStyle.label}</span></div>
              <div className="grid grid-cols-5 gap-2">{STYLE_OPTIONS.map((style) => <SelectTile key={style.id} active={styleId === style.id} pressed={styleId === style.id} onClick={() => setStyleId(style.id)} className="overflow-hidden p-1"><span className="block aspect-square rounded-lg" style={{ background: style.background }} /><span className="bb-text-secondary mt-1 block truncate text-[9px] font-bold">{style.label}</span></SelectTile>)}</div>
            </div>

            {availableAspects.length > 0 && <div>
              <div className="mb-2 flex items-center justify-between"><label className="bb-text-secondary text-xs font-black">النسبة (Aspect Ratio)</label><span className="bb-text-accent text-[10px] font-bold">{aspectRatio}</span></div>
              <div className="grid grid-cols-3 gap-2">{availableAspects.map((value) => { const item = aspectMeta(value); return <SelectTile key={value} active={aspectRatio === value} pressed={aspectRatio === value} onClick={() => setAspectRatio(value)} className="flex min-h-14 flex-col items-center justify-center text-[9px] font-bold"><span className={`mb-1 rounded-sm border ${item.box} ${aspectRatio === value ? 'border-[var(--bb-accent)]' : 'border-[var(--bb-border-strong)]'}`} />{item.label}</SelectTile>; })}</div>
            </div>}

            {availableResolutions.length > 0 && <div>
              <div className="mb-2 flex items-center justify-between"><label className="bb-text-secondary text-xs font-black">الدقة (Resolution)</label><span className="bb-text-accent text-[10px] font-bold">{resolution}</span></div>
              <div className="grid grid-cols-3 gap-2">{availableResolutions.map((value) => <SelectTile key={value} active={resolution === value} pressed={resolution === value} onClick={() => setResolution(value)} className="text-[10px] font-black">{resolutionLabel(value)}</SelectTile>)}</div>
            </div>}

            {countOptions.length > 0 && <div>
              <div className="mb-2 flex items-center justify-between"><label className="bb-text-secondary text-xs font-black">عدد الصور</label><span className="bb-text-tertiary text-[10px]">حتى {maxCount}</span></div>
              <div className="grid grid-cols-4 gap-2">{countOptions.map((value) => <SelectTile key={value} active={count === value} pressed={count === value} onClick={() => setCount(value)} className="text-xs font-black">{value}</SelectTile>)}</div>
            </div>}

            <button type="button" onClick={() => setUseBrandKit((value) => !value)} aria-pressed={useBrandKit} className="bb-button-secondary flex min-h-12 w-full items-center justify-between rounded-xl border p-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2"><span className="flex items-center gap-2"><Palette className="bb-text-accent h-4 w-4" />تطبيق هوية المشروع</span><span className={`relative h-5 w-9 rounded-full transition ${useBrandKit ? 'bg-[var(--bb-accent)]' : 'bg-[var(--bb-border-strong)]'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${useBrandKit ? 'right-0.5' : 'right-[18px]'}`} /></span></button>

            {insufficientCredits && selectedModel && (
              <div className="bb-warning-surface rounded-xl border p-3 text-xs leading-6" role="alert">
                تحتاج <strong>{requiredCredits}</strong> نقطة لهذه العملية، بينما رصيدك الحالي <strong>{currentBalance}</strong>.
                <Link href="/pricing" className="bb-text-accent mr-2 font-black underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2">شحن الرصيد</Link>
              </div>
            )}

            <button type="button" onClick={generateImages} disabled={generating || !activeProject || !selectedModel || !imageModelsAvailable || !capabilitiesAvailable || insufficientCredits} className="bb-button-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"><Sparkles className="h-4 w-4" />{generating ? 'جاري توليد الصور...' : `توليد ${count === 1 ? 'الصورة' : `${count} صور`}`}</button>
            {selectedModel && <div className="bb-text-tertiary flex flex-wrap items-center justify-center gap-1.5 text-center text-[10px]"><span>التكلفة المتوقعة</span><strong className="bb-text-secondary">{requiredCredits}</strong><span>نقطة حسب كتالوج المنصة</span>{currentBalance !== null && <><span>· رصيدك</span><strong className={insufficientCredits ? 'bb-text-warning' : 'bb-text-accent'}>{currentBalance}</strong></>}</div>}

            {message && <div className={`${message.type === 'error' ? 'bb-danger-surface' : 'bb-accent-soft'} rounded-xl border px-3 py-2.5 text-xs leading-5`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
          </div>
        </aside>

        <section className="bb-surface-1 min-w-0 lg:min-h-[calc(100vh-10.5rem)]">
          <div className="bb-divider flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <div className="min-w-0"><p className="bb-text-accent text-[10px] font-bold">الصور المولدة</p><h2 className="bb-text-primary mt-0.5 truncate text-sm font-black">{activeProject?.name || 'معرض الصور'}</h2></div>
            <div className="flex items-center gap-2"><span className="bb-panel bb-text-secondary rounded-lg border px-3 py-2 text-[10px] font-bold">{galleryReady ? gallery.length : 0} صورة</span><button type="button" onClick={() => void loadHistory(activeProject?.id)} disabled={!activeProject || historyLoading} className="bb-button-secondary grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2" aria-label="تحديث المعرض"><RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} /></button></div>
          </div>

          <div className="p-4 sm:p-6">
            {historyError && activeProject && (
              <div className="bb-danger-surface mb-4 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-xs font-bold sm:flex-row sm:items-center sm:justify-between" role="alert">
                <span>{historyError}</span>
                <button type="button" onClick={() => void loadHistory(activeProject.id)} className="bb-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 font-black transition focus-visible:outline-none focus-visible:ring-2"><RefreshCw size={14} /> إعادة تحميل المعرض</button>
              </div>
            )}

            {!activeProject ? (
              <div className="bb-panel flex min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed px-5 text-center"><FolderOpen className="bb-text-disabled h-12 w-12" /><h3 className="bb-text-primary mt-5 text-lg font-black">أنشئ مشروع صور للبدء</h3><p className="bb-text-secondary mt-2 max-w-md text-xs leading-6">سيُنشأ مشروع صور مخصص، وتبقى نتائجه منفصلة عن مشاريع الشات والفيديو والصوت.</p><button type="button" onClick={createImageProject} disabled={creatingProject} className="bb-button-primary mt-5 min-h-11 rounded-xl px-5 py-3 text-xs font-black disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2">{creatingProject ? 'جاري الإنشاء...' : 'إنشاء مشروع صور'}</button></div>
            ) : (historyLoading && !galleryReady) ? (
              <div className="bb-panel flex min-h-[560px] items-center justify-center rounded-3xl border" aria-live="polite"><div className="bb-text-secondary flex items-center gap-3 text-sm font-bold"><Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تحميل معرض المشروع...</div></div>
            ) : !galleryReady && historyError ? (
              <div className="bb-panel flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed px-5 text-center"><ImageIcon className="bb-text-disabled h-10 w-10" /><h3 className="bb-text-primary mt-4 text-base font-black">تعذر عرض نتائج هذا المشروع</h3><p className="bb-text-secondary mt-2 max-w-md text-xs leading-6">المشروع وإعداداتك ما زالت محفوظة. استخدم زر إعادة تحميل المعرض أعلاه.</p></div>
            ) : gallery.length === 0 ? (
              <div className="bb-panel flex min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed px-5 text-center"><span className="bb-surface-1 bb-border flex h-20 w-20 items-center justify-center rounded-full border"><ImageIcon className="bb-text-disabled h-9 w-9" /></span><h3 className="bb-text-primary mt-6 text-lg font-black">لم يتم توليد أي صورة بعد</h3><p className="bb-text-secondary mt-2 max-w-md text-xs leading-6">اختر النموذج أولًا؛ ستظهر النسب والدقات وعدد الصور التي يدعمها ذلك النموذج فقط.</p></div>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
                {gallery.map((image) => (
                  <article key={image.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-black shadow-[var(--bb-shadow-sm)] transition hover:border-[var(--bb-accent-border)] focus-within:border-[var(--bb-accent-border)]">
                    <img src={image.url} alt={image.name} className="h-auto w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 translate-y-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16 transition duration-300 sm:translate-y-full sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0">
                      <p className="line-clamp-2 text-xs font-black leading-5 text-white">{image.name}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')} className="bb-media-control grid h-10 w-10 place-items-center rounded-lg border focus-visible:outline-none focus-visible:ring-2" aria-label="فتح الصورة بحجم كامل"><ExternalLink className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => void copyImageLink(image.url)} className="bb-media-control grid h-10 w-10 place-items-center rounded-lg border focus-visible:outline-none focus-visible:ring-2" aria-label="نسخ رابط مؤقت للصورة"><Copy className="h-3.5 w-3.5" /></button>
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
