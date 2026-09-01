'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic2,
  RotateCcw,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { listDeletedUserProjects, restoreUserProject } from '../lib/projects/projects-service';

const DAY_MS = 24 * 60 * 60 * 1000;

function projectMeta(type = '') {
  if (/فيديو|video/i.test(type)) return { label: 'فيديو AI', icon: Video };
  if (/محادثة|chat|نص/i.test(type)) return { label: 'الشات AI', icon: MessageSquare };
  if (/صوت|audio/i.test(type)) return { label: 'الصوت AI', icon: Mic2 };
  return { label: 'الصور AI', icon: ImageIcon };
}

function remainingDays(purgeAfter) {
  if (!purgeAfter) return 30;
  return Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / DAY_MS));
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ar-LY');
}

export default function ProjectTrashWorkspace() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringIds, setRestoringIds] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listDeletedUserProjects();
        if (mounted) setProjects(rows || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'تعذر تحميل سلة المحذوفات.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const visibleProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) =>
      (project.name || '').toLowerCase().includes(term) ||
      (project.description || '').toLowerCase().includes(term),
    );
  }, [projects, search]);

  async function restoreProject(projectId) {
    if (restoringIds.has(projectId)) return;
    setRestoringIds((current) => new Set(current).add(projectId));
    setError('');

    try {
      await restoreUserProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر استعادة المشروع.');
    } finally {
      setRestoringIds((current) => {
        const next = new Set(current);
        next.delete(projectId);
        return next;
      });
    }
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050506] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1320px]">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/projects" className="mb-3 inline-flex items-center gap-2 text-xs font-black text-gray-500 transition hover:text-[#ff3344]">
              <ArrowLeft size={15} className="rotate-180" /> العودة إلى المشاريع
            </Link>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f31325]/25 bg-[#f31325]/10 text-[#ff3344]">
                <Trash2 size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black sm:text-3xl">سلة المحذوفات</h1>
                <p className="mt-1 text-sm leading-7 text-gray-500">يمكن استعادة المشروع لمدة 30 يومًا من تاريخ نقله إلى السلة.</p>
              </div>
            </div>
          </div>

          <label className="flex min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-[#101217] px-4 py-3 text-gray-500 focus-within:border-[#f31325]/40">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المحذوفات..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600" />
          </label>
        </div>

        <div className="mb-6 rounded-2xl border border-[#f31325]/20 bg-[#f31325]/7 px-5 py-4 text-sm leading-7 text-gray-300">
          <strong className="text-white">سياسة الحفظ:</strong> المشاريع النشطة لا تنتهي تلقائيًا. المشروع لا يدخل هذه السلة إلا عندما تحذفه أنت، ويظل قابلًا للاستعادة خلال نافذة الـ30 يومًا قبل أن يصبح مؤهلًا للتنظيف النهائي الآمن للملفات والبيانات.
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm font-bold text-red-300">{error}</div>}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-[#0b0d12]">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-[#f31325]" /> جاري تحميل المحذوفات...</div>
          </div>
        ) : visibleProjects.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => {
              const meta = projectMeta(project.type);
              const Icon = meta.icon;
              const restoring = restoringIds.has(project.id);
              const days = remainingDays(project.purge_after);

              return (
                <article key={project.id} className="rounded-3xl border border-white/10 bg-[#101217] p-5 shadow-[0_18px_50px_rgba(0,0,0,.28)]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#181b22] text-[#ff3344]"><Icon size={23} /></span>
                    <span className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-black text-gray-400">{meta.label}</span>
                  </div>

                  <h2 className="mt-5 truncate text-lg font-black">{project.name || 'مشروع بدون اسم'}</h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-gray-500">{project.description || 'مشروع محفوظ في سلة المحذوفات.'}</p>

                  <div className="mt-5 space-y-2 border-t border-white/[.07] pt-4 text-xs text-gray-500">
                    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> نُقل إلى السلة</span><strong className="text-gray-300">{formatDate(project.deleted_at)}</strong></div>
                    <div className="flex items-center justify-between gap-3"><span>نافذة الاستعادة</span><strong className={days <= 3 ? 'text-[#ff6672]' : 'text-gray-300'}>{days} يوم متبقٍ</strong></div>
                  </div>

                  <button type="button" disabled={restoring} onClick={() => restoreProject(project.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black transition hover:bg-[#ff2637] disabled:cursor-not-allowed disabled:opacity-60">
                    {restoring ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />} استعادة المشروع
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#0b0d12] px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171a21] text-gray-500"><FolderOpen size={28} /></span>
            <h2 className="mt-5 text-lg font-black">{search ? 'لا توجد نتائج مطابقة' : 'سلة المحذوفات فارغة'}</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-gray-500">{search ? 'جرّب كلمة بحث أخرى.' : 'لن يظهر هنا أي مشروع ما لم تقم بنقله إلى سلة المحذوفات.'}</p>
          </div>
        )}
      </section>
    </main>
  );
}
