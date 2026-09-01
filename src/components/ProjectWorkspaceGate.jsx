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
            setState({
              status: 'invalid',
              message: 'المشروع غير موجود أو لا تملك صلاحية الوصول إليه.',
            });
            return;
          }

          if (projectToolFromType(project.type) !== tool) {
            setState({
              status: 'mismatch',
              message: `هذا المشروع لا ينتمي إلى مساحة ${meta.label}. افتحه من الأداة الصحيحة.`,
            });
            return;
          }

          setState({ status: 'ready', message: '' });
        } catch (error) {
          if (!cancelled) {
            setState({
              status: 'error',
              message: error instanceof Error ? error.message : 'تعذر التحقق من المشروع.',
            });
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
      <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050506] px-5 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm font-bold text-gray-400">
          <Loader2 size={18} className="animate-spin text-[#f31325]" />
          جارٍ التحقق من المشروع...
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050506] px-5 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d1016] p-7 text-center shadow-2xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#f31325]/25 bg-[#f31325]/10 text-[#ff3344]">
          <AlertTriangle size={30} />
        </span>
        <h1 className="mt-5 text-2xl font-black">تعذر فتح مساحة المشروع</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-400">{state.message}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={meta.listHref} className="flex items-center justify-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black transition hover:bg-[#ff2637]">
            <FolderOpen size={17} /> مشاريع {meta.label}
          </Link>
          <Link href="/projects" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm font-black text-gray-300 transition hover:text-white">
            <ArrowLeft size={17} className="rotate-180" /> كل الأدوات
          </Link>
        </div>

        {state.status === 'error' && (
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 text-xs font-black text-[#ff6674] hover:text-white">
            إعادة المحاولة
          </button>
        )}
      </section>
    </main>
  );
}
