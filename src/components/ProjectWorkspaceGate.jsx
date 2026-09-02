'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, FolderOpen, Loader2 } from 'lucide-react';
import { listUserProjects } from '../lib/projects/projects-service';
import { projectToolFromType } from '../lib/projects/project-scope';

const TOOL_META = {
  images: { label: 'الصور', listHref: '/projects/images' },
  video: { label: 'الفيديو', listHref: '/projects/video' },
  chat: { label: 'الشات', listHref: '/projects/chat' },
  audio: { label: 'الصوت', listHref: '/projects/audio' },
};

export default function ProjectWorkspaceGate({ tool = 'images', projectId, children }) {
  const meta = TOOL_META[tool] || TOOL_META.images;
  const [state, setState] = useState({ status: 'loading', message: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setState({ status: 'loading', message: '' });

        if (!projectId) {
          if (!cancelled) setState({ status: 'missing', message: 'لم يتم تحديد مشروع لفتح مساحة العمل.' });
          return;
        }

        try {
          const projects = await listUserProjects();
          if (cancelled) return;

          const project = projects.find((item) => item.id === projectId) || null;
          if (!project) {
            setState({ status: 'invalid', message: 'المشروع غير موجود أو لا تملك صلاحية الوصول إليه.' });
            return;
          }

          if (projectToolFromType(project.type) !== tool) {
            setState({ status: 'mismatch', message: `هذا المشروع لا ينتمي إلى مساحة ${meta.label}. افتحه من الأداة الصحيحة.` });
            return;
          }

          setState({ status: 'ready', message: '' });
        } catch (error) {
          if (!cancelled) {
            setState({ status: 'error', message: error instanceof Error ? error.message : 'تعذر التحقق من المشروع.' });
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [meta.label, projectId, reloadKey, tool]);

  if (state.status === 'ready') return children;

  if (state.status === 'loading') {
    return (
      <main dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center px-5">
        <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold">
          <Loader2 size={18} className="bb-text-accent animate-spin" />
          جارٍ التحقق من المشروع...
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center px-5 py-10">
      <section className="bb-panel w-full max-w-xl rounded-3xl border p-7 text-center">
        <span className="bb-accent-soft mx-auto grid h-16 w-16 place-items-center rounded-2xl border">
          <AlertTriangle size={30} />
        </span>
        <h1 className="bb-text-primary mt-5 text-2xl font-black">تعذر فتح مساحة المشروع</h1>
        <p className="bb-text-secondary mx-auto mt-3 max-w-md text-sm leading-7">{state.message}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={meta.listHref} className="bb-button-primary flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition">
            <FolderOpen size={17} /> مشاريع {meta.label}
          </Link>
          <Link href="/projects" className="bb-button-secondary flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition">
            <ArrowLeft size={17} className="rotate-180" /> كل الأدوات
          </Link>
        </div>

        {state.status === 'error' && (
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="bb-text-danger bb-hoverable mt-4 rounded-lg px-3 py-2 text-xs font-black">
            إعادة المحاولة
          </button>
        )}
      </section>
    </main>
  );
}
