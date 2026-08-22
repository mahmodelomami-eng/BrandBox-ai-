'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Image as ImageIcon, Plus, Sparkles, Video, MessageSquare, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { createUserProject, listUserProjects } from '../../lib/projects/projects-service';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('صورة + نص');
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.replace('/auth?mode=login&next=/projects');
        return;
      }
      const rows = await listUserProjects();
      setProjects(rows);
    } catch (err) {
      setError(err?.message || 'تعذر تحميل المشاريع.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createProject(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const project = await createUserProject({ name: name.trim(), type, language: 'العربية', tone: 'احترافي' });
      setProjects((current) => [project, ...current]);
      setName('');
      setModalOpen(false);
    } catch (err) {
      setError(err?.message || 'تعذر إنشاء المشروع.');
    } finally {
      setCreating(false);
    }
  }

  const iconForType = (projectType) => {
    if (projectType?.includes('فيديو')) return <Video size={19} />;
    if (projectType?.includes('محادثة') || projectType?.includes('شات')) return <MessageSquare size={19} />;
    return <ImageIcon size={19} />;
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#080a0f] px-4 pb-14 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black text-[#ff3344]">مساحة العمل</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><FolderOpen className="text-[#ff3344]" /> المشاريع</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">اختر مشروعًا قبل استخدام الصور AI أو الفيديو AI أو شات AI حتى تحفظ كل التوليدات والملفات في مكان واحد.</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex w-fit items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black transition hover:bg-[#ff2637]"><Plus size={18} /> مشروع جديد</button>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-[#252b3a] bg-[#0d1018] p-10 text-center text-sm text-gray-500">جاري تحميل مشاريعك...</div>
        ) : projects.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-[#303747] bg-[#0d1018] p-8 text-center">
            <span className="mb-5 rounded-2xl bg-[#f31325]/10 p-4 text-[#ff3344]"><Sparkles size={28} /></span>
            <h2 className="text-xl font-black">ابدأ مشروعك الأول</h2>
            <p className="mt-2 max-w-lg text-sm leading-7 text-gray-500">أنشئ مشروعًا ثم استخدم أدوات الصور والفيديو والمحادثة داخله.</p>
            <button onClick={() => setModalOpen(true)} className="mt-6 rounded-xl bg-[#f31325] px-6 py-3 text-sm font-black">إنشاء مشروع</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="group rounded-2xl border border-[#252b3a] bg-[#0d1018] p-5 transition hover:-translate-y-0.5 hover:border-[#f31325]/40">
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-xl border border-[#2b3140] bg-[#151923] p-3 text-[#ff3344]">{iconForType(project.type)}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-gray-500">{project.type || 'صورة + نص'}</span>
                </div>
                <h2 className="text-lg font-black">{project.name}</h2>
                <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{project.description || 'مشروع Brand Box جاهز لاستقبال التوليدات والمحتوى.'}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#202632] pt-4 text-[11px] text-gray-600">
                  <span>{project.industry || 'عام'}</span>
                  <span>{project.updated_at ? new Date(project.updated_at).toLocaleDateString('ar-LY') : ''}</span>
                </div>
                <a href="/" className="mt-5 flex w-full items-center justify-center rounded-xl border border-[#303747] py-3 text-xs font-black text-gray-300 transition hover:border-[#f31325]/50 hover:text-white">فتح مساحة العمل</a>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={createProject} className="relative w-full max-w-md rounded-3xl border border-[#2c3240] bg-[#10131b] p-6 shadow-2xl">
            <button type="button" onClick={() => setModalOpen(false)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-black">إنشاء مشروع جديد</h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">اختر نوع البداية، ويمكنك استخدام بقية أدوات AI داخل المشروع لاحقًا.</p>
            <div className="mt-6 space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المشروع" className="w-full rounded-2xl border border-[#303747] bg-[#181c25] p-4 text-sm outline-none focus:border-[#f31325]" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-2xl border border-[#303747] bg-[#181c25] p-4 text-sm outline-none focus:border-[#f31325]">
                <option>صورة + نص</option>
                <option>فيديو AI</option>
                <option>شات AI</option>
              </select>
              <button disabled={creating || !name.trim()} className="w-full rounded-2xl bg-[#f31325] py-4 text-sm font-black disabled:opacity-40">{creating ? 'جاري الإنشاء...' : 'إنشاء المشروع'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
