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
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)] px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1320px]">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/projects" className="bb-text-tertiary bb-hoverable mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-black transition">
              <ArrowLeft size={15} className="rotate-180" /> العودة إلى المشاريع
            </Link>
            <div className="flex items-center gap-3">
              <span className="bb-accent-soft flex h-12 w-12 items-center justify-center rounded-2xl border">
                <Trash2 size={24} />
              </span>
              <div>
                <h1 className="bb-text-primary text-2xl font-black sm:text-3xl">سلة المحذوفات</h1>
                <p className="bb-text-secondary mt-1 text-sm leading-7">يمكن استعادة المشروع لمدة 30 يومًا من تاريخ نقله إلى السلة.</p>
              </div>
            </div>
          </div>

          <label className="bb-input flex min-w-[260px] items-center gap-2 rounded-xl border px-4 py-3 focus-within:border-[var(--bb-accent-border)]">
            <Search size={17} className="bb-text-tertiary" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المحذوفات..." className="bb-text-primary w-full bg-transparent text-sm outline-none placeholder:text-[var(--bb-placeholder)]" />
          </label>
        </div>

        <div className="bb-accent-soft mb-6 rounded-2xl border px-5 py-4 text-sm leading-7">
          <strong className="bb-text-primary">سياسة الحفظ:</strong> <span className="bb-text-secondary">المشاريع النشطة لا تنتهي تلقائيًا. المشروع لا يدخل هذه السلة إلا عندما تحذفه أنت، ويظل قابلًا للاستعادة خلال نافذة الـ30 يومًا قبل أن يصبح مؤهلًا للتنظيف النهائي الآمن للملفات والبيانات.</span>
        </div>

        {error && <div className="bb-danger-surface mb-5 rounded-xl border px-4 py-3 text-sm font-bold">{error}</div>}

        {loading ? (
          <div className="bb-panel flex min-h-[320px] items-center justify-center rounded-3xl border">
            <div className="bb-text-secondary flex items-center gap-3 text-sm font-bold"><Loader2 className="bb-text-accent h-5 w-5 animate-spin" /> جاري تحميل المحذوفات...</div>
          </div>
        ) : visibleProjects.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => {
              const meta = projectMeta(project.type);
              const Icon = meta.icon;
              const restoring = restoringIds.has(project.id);
              const days = remainingDays(project.purge_after);

              return (
                <article key={project.id} className="bb-card rounded-3xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="bb-accent-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"><Icon size={23} /></span>
                    <span className="bb-surface-1 bb-border-subtle bb-text-secondary rounded-lg border px-2.5 py-1 text-[10px] font-black">{meta.label}</span>
                  </div>

                  <h2 className="bb-text-primary mt-5 truncate text-lg font-black">{project.name || 'مشروع بدون اسم'}</h2>
                  <p className="bb-text-tertiary mt-2 line-clamp-2 min-h-10 text-xs leading-5">{project.description || 'مشروع محفوظ في سلة المحذوفات.'}</p>

                  <div className="bb-divider bb-text-tertiary mt-5 space-y-2 border-t pt-4 text-xs">
                    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> نُقل إلى السلة</span><strong className="bb-text-secondary">{formatDate(project.deleted_at)}</strong></div>
                    <div className="flex items-center justify-between gap-3"><span>نافذة الاستعادة</span><strong className={days <= 3 ? 'bb-text-danger' : 'bb-text-secondary'}>{days} يوم متبقٍ</strong></div>
                  </div>

                  <button type="button" disabled={restoring} onClick={() => restoreProject(project.id)} className="bb-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60">
                    {restoring ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />} استعادة المشروع
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bb-panel flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center">
            <span className="bb-surface-1 bb-text-tertiary flex h-16 w-16 items-center justify-center rounded-2xl"><FolderOpen size={28} /></span>
            <h2 className="bb-text-primary mt-5 text-lg font-black">{search ? 'لا توجد نتائج مطابقة' : 'سلة المحذوفات فارغة'}</h2>
            <p className="bb-text-secondary mt-2 max-w-md text-sm leading-7">{search ? 'جرّب كلمة بحث أخرى.' : 'لن يظهر هنا أي مشروع ما لم تقم بنقله إلى سلة المحذوفات.'}</p>
          </div>
        )}
      </section>
    </main>
  );
}
