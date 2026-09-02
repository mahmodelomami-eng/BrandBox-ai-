'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import {
  createUserProject,
  deleteUserProject,
  listUserProjects,
  setUserProjectFavorite,
} from '../lib/projects/projects-service';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const TOOL_CONFIG = {
  images: {
    label: 'الصور AI',
    title: 'مشاريع الصور',
    description: 'أنشئ وأدر مشاريع الصور، ثم تابع التوليدات والنتائج من كل مشروع.',
    projectType: 'صورة',
    icon: ImageIcon,
    workspace: (id) => `/projects/images/workspace?project=${encodeURIComponent(id)}`,
    matches: (type) => /صورة|image/i.test(type || ''),
  },
  video: {
    label: 'الفيديو AI',
    title: 'مشاريع الفيديو',
    description: 'أدر مشاريع الفيديو ومشاهدها؛ التوليد يتاح عندما يكون مزود الفيديو مفعّلًا.',
    projectType: 'فيديو',
    icon: Video,
    workspace: (id) => `/projects/video/workspace?project=${encodeURIComponent(id)}`,
    matches: (type) => /فيديو|video/i.test(type || ''),
  },
  chat: {
    label: 'الشات AI',
    title: 'مشاريع الشات',
    description: 'محادثاتك ومشاريع الكتابة والمحتوى محفوظة ومنظمة حسب المشروع.',
    projectType: 'محادثة',
    icon: MessageSquare,
    workspace: (id) => `/projects/chat/workspace?project=${encodeURIComponent(id)}`,
    matches: (type) => /محادثة|chat|نص/i.test(type || ''),
  },
  audio: {
    label: 'الصوت AI',
    title: 'مشاريع الصوت',
    description: 'أدر نصوص وإعدادات مشاريع الصوت والتعليق؛ التوليد يتاح حسب المزود المفعّل.',
    projectType: 'صوت',
    icon: Mic2,
    workspace: (id) => `/projects/audio/workspace?project=${encodeURIComponent(id)}`,
    matches: (type) => /صوت|audio/i.test(type || ''),
  },
};

const TOOL_ORDER = ['images', 'video', 'chat', 'audio'];

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name || 'مشروع بدون اسم',
    type: project.type || '',
    description: project.description || '',
    thumbnail: project.thumbnail_url || '',
    isFavorite: Boolean(project.is_favorite),
    updatedAt: project.updated_at || project.created_at || null,
  };
}

export default function ToolProjectsWorkspace({ tool = 'images' }) {
  const router = useRouter();
  const config = TOOL_CONFIG[tool] || TOOL_CONFIG.images;
  const ActiveIcon = config.icon;
  const [projects, setProjects] = useState([]);
  const [generationCounts, setGenerationCounts] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [statsWarning, setStatsWarning] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setLoadFailed(false);
      setError('');
      setStatsWarning('');
      try {
        const rows = await listUserProjects();
        if (!mounted) return;
        setProjects((rows || []).map(normalizeProject));

        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || !mounted) {
          if (mounted) setStatsWarning('تعذر تحديث أعداد التوليد الآن. المشاريع نفسها ما زالت متاحة.');
          return;
        }

        try {
          const response = await fetch(`/api/v1/project-stats?tool=${encodeURIComponent(tool)}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          });
          if (!response.ok) throw new Error('PROJECT_STATS_UNAVAILABLE');
          const result = await response.json();
          if (mounted && result?.counts) setGenerationCounts(result.counts);
        } catch {
          if (mounted) setStatsWarning('تعذر تحديث أعداد التوليد الآن. المشاريع نفسها ما زالت متاحة.');
        }
      } catch {
        if (mounted) {
          setLoadFailed(true);
          setError('تعذر تحميل المشاريع. تحقق من الاتصال ثم أعد المحاولة.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [tool, reloadTick]);

  useEffect(() => {
    if (!createOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !creating) {
        setCreateOpen(false);
        setNewName('');
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [createOpen, creating]);

  const allToolProjects = useMemo(() => projects
    .filter((project) => config.matches(project.type))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [projects, config]);

  const toolProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allToolProjects;
    return allToolProjects.filter((project) => project.name.toLowerCase().includes(term) || project.description.toLowerCase().includes(term));
  }, [allToolProjects, search]);

  const hasSearch = Boolean(search.trim());
  const searchHasNoResults = !loading && hasSearch && allToolProjects.length > 0 && toolProjects.length === 0;
  const selectedCount = selectedIds.size;
  const allVisibleSelected = toolProjects.length > 0 && toolProjects.every((project) => selectedIds.has(project.id));

  function retryProjects() {
    setLoading(true);
    setLoadFailed(false);
    setError('');
    setStatsWarning('');
    setReloadTick((value) => value + 1);
  }

  function closeCreateModal() {
    if (creating) return;
    setCreateOpen(false);
    setNewName('');
  }

  function toggleSelection(projectId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) toolProjects.forEach((project) => next.delete(project.id));
      else toolProjects.forEach((project) => next.add(project.id));
      return next;
    });
  }

  async function toggleFavorite(project) {
    if (favoriteIds.has(project.id)) return;
    setFavoriteIds((current) => new Set(current).add(project.id));
    setError('');
    try {
      const updated = await setUserProjectFavorite(project.id, !project.isFavorite);
      setProjects((current) => current.map((item) => item.id === project.id ? normalizeProject(updated) : item));
    } catch {
      setError('تعذر تحديث المفضلة. أعد المحاولة.');
    } finally {
      setFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  async function deleteProjects(ids) {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (!uniqueIds.length) return;
    const confirmation = uniqueIds.length === 1
      ? 'هل تريد نقل هذا المشروع إلى سلة المحذوفات؟ يمكنك استعادته خلال 30 يومًا.'
      : `هل تريد نقل ${uniqueIds.length} مشاريع إلى سلة المحذوفات؟ يمكنك استعادتها خلال 30 يومًا.`;
    if (!window.confirm(confirmation)) return;

    setDeletingIds((current) => new Set([...current, ...uniqueIds]));
    setError('');
    try {
      const results = await Promise.allSettled(uniqueIds.map((id) => deleteUserProject(id)));
      const deleted = uniqueIds.filter((_, index) => results[index].status === 'fulfilled');
      const failed = uniqueIds.length - deleted.length;

      setProjects((current) => current.filter((project) => !deleted.includes(project.id)));
      setSelectedIds((current) => {
        const next = new Set(current);
        deleted.forEach((id) => next.delete(id));
        return next;
      });
      setGenerationCounts((current) => {
        const next = { ...current };
        deleted.forEach((id) => delete next[id]);
        return next;
      });
      if (failed) setError(`تم نقل ${deleted.length} مشروع إلى السلة، وتعذر نقل ${failed}.`);
    } catch {
      setError('تعذر نقل المشروع إلى سلة المحذوفات. أعد المحاولة.');
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        uniqueIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  async function createProject(event) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const created = await createUserProject({
        name: newName.trim() || `مشروع ${config.title.replace('مشاريع ', '')} جديد`,
        type: config.projectType,
        description: `مشروع مخصص لـ ${config.label}`,
        industry: 'عام',
        language: 'العربية',
        tone: 'احترافي',
      });
      const project = normalizeProject(created);
      setProjects((current) => [project, ...current]);
      setGenerationCounts((current) => ({ ...current, [project.id]: 0 }));
      setCreateOpen(false);
      setNewName('');
      router.push(config.workspace(project.id));
    } catch {
      setError('تعذر إنشاء المشروع. أعد المحاولة.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050506] px-4 py-7 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1500px]">
        <div className="sticky top-20 z-30 mb-7 rounded-2xl border border-white/10 bg-[#0b0d12] p-2 shadow-[0_18px_55px_rgba(0,0,0,.4)]">
          <div className="flex gap-2 overflow-x-auto" aria-label="مساحات المشاريع">
            {TOOL_ORDER.map((id) => {
              const item = TOOL_CONFIG[id];
              const Icon = item.icon;
              const active = id === tool;
              return (
                <Link
                  key={id}
                  href={`/projects/${id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 min-w-[160px] flex-1 items-center gap-3 rounded-xl border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${active ? 'border-[#f31325]/55 bg-[#f31325]/12 text-white' : 'border-white/[.07] bg-[#111318] text-gray-400 hover:border-[#f31325]/30 hover:text-white'}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#f31325] text-white' : 'bg-[#191c23] text-[#ff3344]'}`}><Icon size={20} /></span>
                  <span className="text-sm font-black">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/projects" className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-black text-gray-500 transition hover:text-[#ff3344] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><ArrowLeft size={15} className="rotate-180" /> العودة لاختيار الأداة</Link>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f31325]/25 bg-[#f31325]/10 text-[#ff3344]"><ActiveIcon size={25} /></span>
              <div>
                <h1 className="text-2xl font-black sm:text-3xl">{config.title}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{config.description}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-12 min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-[#101217] px-4 py-3 text-gray-500 transition focus-within:border-[#f31325]/40 focus-within:ring-2 focus-within:ring-[#f31325]/20">
              <Search size={17} />
              <input aria-label={`البحث في ${config.title}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المشاريع..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600" />
              {hasSearch && <button type="button" onClick={() => setSearch('')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70" aria-label="مسح البحث"><X size={15} /></button>}
            </label>
            <button type="button" onClick={() => setCreateOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black shadow-[0_12px_35px_rgba(243,19,37,.18)] transition hover:bg-[#ff2637] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6672]"><Plus size={18} /> مشروع جديد</button>
          </div>
        </div>

        {!loading && toolProjects.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d0f14] px-4 py-3">
            <button type="button" onClick={toggleSelectAll} className="flex min-h-10 items-center gap-2 rounded-lg text-xs font-black text-gray-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
              <CheckSquare size={17} className={allVisibleSelected ? 'text-[#ff3344]' : 'text-gray-500'} />
              {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
            {selectedCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-[#ff3344]">تم تحديد {selectedCount}</span>
                <button type="button" onClick={() => deleteProjects([...selectedIds])} className="flex min-h-10 items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><Trash2 size={15} /> نقل المحدد للسلة</button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm font-bold text-red-300 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
            {loadFailed && <button type="button" onClick={retryProjects} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/25 px-3 text-xs font-black text-red-200 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><RefreshCw size={14} /> إعادة المحاولة</button>}
          </div>
        )}
        {statsWarning && !loading && <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-bold text-amber-200/80" role="status">{statsWarning}</div>}

        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center rounded-3xl border border-white/10 bg-[#0b0d12]" aria-live="polite"><div className="flex items-center gap-3 text-sm font-bold text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-[#f31325]" /> جاري تحميل المشاريع...</div></div>
        ) : searchHasNoResults ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0d12] px-5 py-14 text-center">
            <Search className="mx-auto h-10 w-10 text-gray-600" />
            <h2 className="mt-4 text-lg font-black">لا توجد نتائج مطابقة</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-gray-500">جرّب كلمة بحث مختلفة، أو امسح البحث للعودة إلى جميع مشاريع {config.label}.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => setSearch('')} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black text-gray-200 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">مسح البحث</button>
              <button type="button" onClick={() => setCreateOpen(true)} className="min-h-11 rounded-xl bg-[#f31325] px-4 text-xs font-black text-white transition hover:bg-[#ff2637] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6672]">إنشاء مشروع جديد</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <button type="button" onClick={() => setCreateOpen(true)} className="group min-h-[250px] rounded-3xl border border-dashed border-[#3a3d46] bg-[#0c0e13] p-6 text-center transition hover:border-[#f31325]/60 hover:bg-[#f31325]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171a21] text-[#ff3344] transition group-hover:bg-[#f31325] group-hover:text-white"><Plus size={30} /></span>
              <div className="mt-5 text-lg font-black">{allToolProjects.length ? 'إنشاء مشروع آخر' : 'أنشئ أول مشروع'}</div>
              <div className="mt-2 text-xs leading-6 text-gray-500">أنشئ مشروعًا لـ {config.label} وابدأ العمل مباشرة.</div>
            </button>

            {toolProjects.map((project) => {
              const isSelected = selectedIds.has(project.id);
              const isDeleting = deletingIds.has(project.id);
              const isFavoriting = favoriteIds.has(project.id);

              return (
                <article key={project.id} className={`group relative overflow-hidden rounded-3xl border bg-[#101217] text-right transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(0,0,0,.45)] ${isSelected ? 'border-[#f31325] ring-1 ring-[#f31325]/45' : 'border-white/10 hover:border-[#f31325]/45'} ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
                  <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                    <button type="button" onClick={() => toggleFavorite(project)} disabled={isFavoriting} aria-label={project.isFavorite ? `إزالة ${project.name} من المفضلة` : `إضافة ${project.name} إلى المفضلة`} title={project.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${project.isFavorite ? 'border-[#f31325]/40 bg-[#f31325] text-white' : 'border-white/10 bg-black/85 text-gray-400 hover:text-[#ff3344]'}`}>
                      {isFavoriting ? <Loader2 size={15} className="animate-spin" /> : <Heart size={17} fill={project.isFavorite ? 'currentColor' : 'none'} />}
                    </button>
                    <button type="button" onClick={() => deleteProjects([project.id])} aria-label={`نقل ${project.name} إلى سلة المحذوفات`} title="نقل المشروع إلى سلة المحذوفات" className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-black/85 text-red-300 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><Trash2 size={16} /></button>
                  </div>

                  <label className="absolute right-3 top-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-black/85 focus-within:ring-2 focus-within:ring-[#f31325]/70">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(project.id)} className="h-4 w-4 accent-[#f31325]" aria-label={`تحديد ${project.name}`} />
                  </label>

                  <button type="button" onClick={() => router.push(config.workspace(project.id))} className="block w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f31325]/70">
                    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.13),transparent_45%),#0b0d12]">
                      {project.thumbnail ? <img src={project.thumbnail} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <ActiveIcon size={44} className="text-[#ff3344]/70" />}
                      <span className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/85 px-2.5 py-1 text-[10px] font-black text-gray-300">{config.label}</span>
                      <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-[#f31325]/20 bg-black/90 px-2.5 py-1 text-[10px] font-black text-[#ff6672]"><Sparkles size={12} /> {generationCounts[project.id] ?? 0} توليد</span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <h2 className="min-w-0 flex-1 truncate text-base font-black">{project.name}</h2>
                        {project.isFavorite && <Heart size={15} className="shrink-0 text-[#ff3344]" fill="currentColor" />}
                      </div>
                      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-gray-500">{project.description || 'مشروع جاهز لبدء العمل.'}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-4 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1.5"><CalendarDays size={14} />{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('ar-LY') : '—'}</span>
                        <span className="flex items-center gap-1.5 font-black text-[#ff3344]">فتح المشروع <ArrowLeft size={14} /></span>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateModal(); }}>
          <form onSubmit={createProject} role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1016] p-6 shadow-[0_28px_90px_rgba(0,0,0,.7)]">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-black text-[#ff3344]">{config.label}</div><h2 id="create-project-title" className="mt-1 text-xl font-black">مشروع جديد</h2></div>
              <button type="button" onClick={closeCreateModal} disabled={creating} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-gray-500 transition hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70" aria-label="إغلاق نافذة إنشاء المشروع"><X size={18} /></button>
            </div>
            <label htmlFor="new-project-name" className="mt-6 block text-xs font-black text-gray-400">اسم المشروع</label>
            <input id="new-project-name" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`مثال: حملة ${config.label}`} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#171a21] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f31325]/55 focus:ring-2 focus:ring-[#f31325]/20" />
            <p className="mt-2 text-[11px] leading-5 text-gray-500">يمكنك تغيير اسم المشروع وبياناته لاحقًا من داخل مساحة العمل.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button disabled={creating} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6672]">{creating ? <Loader2 size={17} className="animate-spin" /> : <FolderOpen size={17} />} إنشاء وفتح المشروع</button>
              <button type="button" onClick={closeCreateModal} disabled={creating} className="min-h-12 rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-gray-400 transition hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
