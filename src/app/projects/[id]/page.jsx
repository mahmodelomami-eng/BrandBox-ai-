'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WorkspaceLayout from '../../../components/navigation/WorkspaceLayout';
import { useAuth } from '../../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import {
  Image as ImageIcon,
  MessageSquare,
  Video,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Palette,
  Layers,
  ChevronRight,
  Download,
  Copy,
  Plus,
} from 'lucide-react';

const IMAGE_MODELS = [
  { id: 'openai/gpt-image-2', displayName: 'GPT Image 2', provider: 'OpenAI', creditCost: 6 },
  { id: 'bytedance-seed/seedream-5-0-lite', displayName: 'Seedream 5.0 Lite', provider: 'ByteDance', creditCost: 4 },
  { id: 'google/gemini-3.1-flash-lite-image', displayName: 'Nano Banana 2 Lite', provider: 'Google', creditCost: 4 },
];

const CHAT_MODELS = [
  { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'OpenAI', creditCost: 2 },
  { id: 'anthropic/claude-3.5-sonnet', displayName: 'Claude 3.5 Sonnet', provider: 'Anthropic', creditCost: 4 },
  { id: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B', provider: 'Meta', creditCost: 2 },
  { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', provider: 'Google', creditCost: 1 },
];

const ASPECT_RATIOS = ['Auto', '4:1', '3:1', '21:9', '2:1', '17:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];

export default function ProjectWorkspacePage({ params }) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [aspectMenuOpen, setAspectMenuOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [selectedImageModel, setSelectedImageModel] = useState(IMAGE_MODELS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assets, setAssets] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let mounted = true;
    async function loadProjectData() {
      if (!user) return;
      try {
        setLoading(true);
        const supabase = createBrowserSupabaseClient();
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('owner_id', user.id)
          .maybeSingle();

        if (projErr || !projData) {
          showToast('المشروع غير موجود أو تم حذفه', 'error');
          router.replace('/projects');
          return;
        }

        if (mounted) setProject(projData);

        // Load project content
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/v1/generations', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const result = await res.json();
            if (mounted) {
              const projectGens = (result.generations || []).filter((g) => g.project_id === projectId);
              const projectAssets = (result.assets || []).filter((a) => a.project_id === projectId);
              setGenerations(projectGens);
              setAssets(projectAssets);
            }
          }
        }
      } catch (err) {
        console.error('[ProjectWorkspace] Error loading data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProjectData();
    return () => { mounted = false; };
  }, [projectId, user, router]);

  const startGeneration = async () => {
    if (mode === 'video') return showToast('مولد الفيديو سيُتاح بعد اكتمال ربط المزود', 'error');
    if (!prompt.trim()) return showToast('اكتب وصفاً واضحاً للتوليد أولاً', 'error');
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (sessionError || !accessToken) throw new Error('يجب تسجيل الدخول قبل بدء التوليد');

      const modelId = mode === 'image' ? selectedImageModel : CHAT_MODELS[0].id;
      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationType: mode,
          modelId,
          prompt: prompt.trim(),
          projectId: project.id,
          settings: mode === 'image' ? {
            aspectRatio: aspectRatio === 'Auto' ? 'auto' : aspectRatio,
            count,
            resolution: '1K',
            useBrandKit,
          } : {},
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.errorMessage || result.error || 'فشل التوليد');
      }

      const resultUrls = Array.isArray(result.resultUrls) ? result.resultUrls : result.resultUrl ? [result.resultUrl] : [];
      const newAssets = resultUrls.map((url, index) => ({
        id: `asset_${result.generationId}_${index + 1}`,
        project_id: project.id,
        generation_id: result.generationId,
        name: `BrandBox ${index + 1}`,
        signed_url: url,
        created_at: new Date().toISOString(),
      }));

      setAssets((prev) => [...newAssets, ...prev]);
      setGenerations((prev) => [
        {
          id: result.generationId,
          project_id: project.id,
          generation_type: mode,
          model: modelId,
          prompt: prompt.trim(),
          status: 'completed',
          credits_consumed: result.creditsConsumed,
          result_url: resultUrls[0] || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setPrompt('');
      await refreshProfile();
      showToast(`اكتمل التوليد بنجاح! الرصيد المتبقي: ${result.remainingBalance}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إكمال التوليد', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="py-20 text-center text-xs text-gray-400">جاري تحميل مساحة العمل...</div>
      </WorkspaceLayout>
    );
  }

  if (!project) return null;

  const selectedModelObj = IMAGE_MODELS.find((m) => m.id === selectedImageModel) || IMAGE_MODELS[0];
  const timelineItems = [
    ...assets.map((asset) => ({ id: asset.id, type: 'image', url: asset.signed_url, title: asset.name, createdAt: asset.created_at })),
    ...generations.filter((g) => g.generation_type !== 'image').map((g) => ({ id: g.id, type: g.generation_type, url: g.result_url, title: g.prompt, createdAt: g.created_at })),
  ].filter((item) => filter === 'all' || item.type === filter);

  return (
    <WorkspaceLayout>
      <div className="space-y-4">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-white">الرئيسية</Link>
          <span>/</span>
          <Link href="/projects" className="hover:text-white">المشاريع</Link>
          <span>/</span>
          <span className="text-gray-300 font-bold truncate max-w-[150px]">{project.name}</span>
        </div>

        <div className="-m-4 flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-[#1F2438] bg-[#090A0F] lg:-m-8 lg:flex-row" dir="rtl">
          {/* Generation Rail Sidebar */}
          <aside className="order-1 flex w-full shrink-0 flex-col border-b border-[#1F2438] bg-[#11131A] lg:order-none lg:w-[340px] lg:border-b-0 lg:border-l">
            <div className="flex items-center justify-between border-b border-[#242837] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold text-[#FF2E4C]">إنشاء داخل المشروع</p>
                <h3 className="mt-0.5 max-w-[220px] truncate text-sm font-extrabold text-white">{project.name}</h3>
              </div>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="rounded-xl border border-[#2B3041] p-2 text-gray-400 transition hover:text-white"
                aria-label="إعدادات التوليد"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-[#242837] p-3">
              {[
                { id: 'image', label: 'صورة', icon: ImageIcon },
                { id: 'chat', label: 'محادثة', icon: MessageSquare },
                { id: 'video', label: 'فيديو', icon: Video },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition ${
                      mode === item.id ? 'bg-white text-black' : 'text-gray-500 hover:bg-[#1A1D27] hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-300">الوصف</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder={
                    mode === 'chat'
                      ? 'اكتب سؤالك أو الفكرة التي تريد تطويرها...'
                      : mode === 'video'
                      ? 'صف المشهد والحركة والمدة...'
                      : 'صف البوستر، العناصر، الألوان والأسلوب البصري...'
                  }
                  className="w-full resize-none rounded-2xl border border-[#2B3041] bg-[#1A1D25] p-3 text-xs leading-6 text-white placeholder:text-gray-600 outline-none focus:border-[#FF2E4C]"
                />
              </div>

              {showSettings && mode !== 'chat' && (
                <div className="space-y-3 text-xs">
                  <div className="relative">
                    <label className="mb-2 block text-xs font-bold text-gray-300">حجم البوستر</label>
                    <button
                      onClick={() => { setAspectMenuOpen((v) => !v); setModelMenuOpen(false); }}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#2B3041] bg-[#171922] px-3 py-3 font-bold text-white transition hover:border-[#41475B]"
                      aria-haspopup="listbox"
                      aria-expanded={aspectMenuOpen}
                    >
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        <span>{aspectRatio}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition ${aspectMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aspectMenuOpen && (
                      <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[#353A4B] bg-[#292A2E] p-1.5 shadow-2xl">
                        {ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => { setAspectRatio(ratio); setAspectMenuOpen(false); }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              aspectRatio === ratio ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                            }`}
                          >
                            <span>{ratio}</span>
                            {aspectRatio === ratio && <Check className="h-4 w-4 text-white" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="mb-2 block text-xs font-bold text-gray-300">أداة توليد الصورة</label>
                    <button
                      onClick={() => { setModelMenuOpen((v) => !v); setAspectMenuOpen(false); }}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#2B3041] bg-[#171922] px-3 py-3 text-right transition hover:border-[#41475B]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-white">{selectedModelObj.displayName}</span>
                        <span className="mt-0.5 block text-[10px] text-gray-500">OpenRouter · {selectedModelObj.creditCost} نقاط</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${modelMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {modelMenuOpen && (
                      <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-[#353A4B] bg-[#292A2E] p-1.5 shadow-2xl">
                        {IMAGE_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => { setSelectedImageModel(model.id); setModelMenuOpen(false); }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right transition ${
                              selectedImageModel === model.id ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-extrabold text-white">{model.displayName}</span>
                              <span className="mt-0.5 block text-[10px] text-gray-400">{model.provider} · {model.creditCost} نقاط</span>
                            </span>
                            {selectedImageModel === model.id && <Check className="h-4 w-4 shrink-0 text-[#FF2E4C]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[#2B3041] bg-[#171922] p-3">
                    <span className="text-xs font-bold text-gray-300">عدد النتائج</span>
                    <div className="flex gap-1">
                      {[1, 2, 4].map((val) => (
                        <button
                          key={val}
                          onClick={() => setCount(val)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            count === val ? 'bg-white text-black' : 'text-gray-500 hover:bg-[#252936] hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setUseBrandKit((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#2B3041] bg-[#171922] p-3 text-xs font-bold"
                  >
                    <span className="flex items-center gap-2 text-gray-300">
                      <Palette className="h-4 w-4 text-[#FF2E4C]" />
                      <span>استخدام هوية المشروع</span>
                    </span>
                    <span className={`relative h-5 w-9 rounded-full transition ${useBrandKit ? 'bg-[#FF2E4C]' : 'bg-[#343847]'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${useBrandKit ? 'right-0.5' : 'right-[18px]'}`} />
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-[#242837] p-4">
              <button
                onClick={startGeneration}
                disabled={mode === 'video' || isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF2E4C] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#FF2E4C]/15 transition hover:bg-[#E50914] disabled:cursor-not-allowed disabled:bg-[#303441] disabled:text-gray-500"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? 'جاري التوليد...' : mode === 'video' ? 'قريباً بعد ربط المزود' : mode === 'chat' ? 'إرسال المحادثة' : `توليد ${count} ${count === 1 ? 'صورة' : 'صور'}`}</span>
              </button>
            </div>
          </aside>

          {/* Outputs Canvas Area */}
          <section className="order-2 min-w-0 flex-1 bg-[#090A0F] lg:order-none">
            <div className="flex flex-col gap-4 border-b border-[#1F2438] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/projects"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#272B39] text-gray-400 transition hover:text-white"
                  aria-label="العودة للمشاريع"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-white">{project.name}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500">{project.description || `${project.industry} · ${project.tone}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-[#12141B] p-1">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'image', label: 'الصور' },
                  { id: 'video', label: 'الفيديو' },
                  { id: 'chat', label: 'المحادثات' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                      filter === item.id ? 'bg-[#272B37] text-white' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[calc(100%-73px)] overflow-y-auto p-4 sm:p-6">
              {timelineItems.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#272B39] bg-[#0E1016] text-center p-6">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171A23]">
                    <Sparkles className="h-7 w-7 text-[#FF2E4C]" />
                  </span>
                  <h3 className="text-base font-extrabold text-white">ابدأ أول توليد في هذا المشروع</h3>
                  <p className="mt-2 max-w-sm text-xs leading-6 text-gray-500">
                    اكتب الوصف في اللوحة الجانبية، واختر المقاس والعدد. ستظهر كل النتائج هنا تلقائياً.
                  </p>
                </div>
              ) : (
                <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                  {timelineItems.map((item) => (
                    <article key={item.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#1F2438] bg-[#121520]">
                      {item.url ? (
                        <img src={item.url} alt={item.title || 'توليد محفوظ'} className="h-auto w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-[#0D0F17] p-4 text-xs text-gray-300 text-center">
                          {item.title}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10 transition duration-300 group-hover:translate-y-0">
                        <p className="line-clamp-2 text-xs font-bold leading-5 text-white">{item.title || 'توليد محفوظ'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
