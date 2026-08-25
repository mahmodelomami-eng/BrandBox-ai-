'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { listUserProjects, createUserProject, deleteUserProject } from '../../lib/projects/projects-service';
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Clock,
  X,
  ChevronLeft,
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('الأغذية والمشروبات');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const data = await listUserProjects();
          if (active) setProjects(data || []);
        } catch (err) {
          console.error('[ProjectsPage] Error loading projects:', err);
          if (active) setToast({ text: 'تعذر تحميل المشاريع', type: 'error' });
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return showToast('يرجى إدخال اسم المشروع', 'error');
    }
    setCreating(true);
    try {
      const created = await createUserProject({
        name: name.trim(),
        industry,
        description: description.trim() || null,
        type: 'صورة + نص',
        language: 'العربية',
        tone: 'احترافي',
      });
      setProjects((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      showToast('تم إنشاء المشروع بنجاح!', 'success');
    } catch (err) {
      showToast(err?.message || 'تعذر إنشاء المشروع', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذا المشروع؟')) return;

    try {
      await deleteUserProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      showToast('تم حذف المشروع', 'success');
    } catch (err) {
      showToast(err?.message || 'تعذر حذف المشروع', 'error');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesIndustry = filterIndustry === 'all' || p.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> المشاريع</div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-[#FF2E4C]" /> مكتبة المشاريع التسويقية
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              إدارة وتنظيم حملاتك الإعلانية ومحتواك البصري المنشأ بالذكاء الاصطناعي.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF2E4C] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF2E4C]/20 transition hover:bg-[#E50914]"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute top-3 right-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث في المشاريع بالاسم أو الوصف..."
              className="w-full bg-[#11131a] border border-[#2a2e38] text-white text-xs rounded-xl pr-9 pl-4 py-2.5 outline-none focus:border-[#FF2E4C]"
            />
          </div>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="bg-[#11131a] border border-[#2a2e38] text-white text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer"
          >
            <option value="all">جميع المجالات</option>
            <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
            <option value="العقارات">العقارات</option>
            <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
            <option value="التعليم">التعليم</option>
            <option value="الخدمات والتقنية">الخدمات والتقنية</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">جاري تحميل المشاريع...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[#2a2e38] bg-[#11131a] space-y-3">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">لم يتم العثور على مشاريع</h3>
            <p className="text-xs text-gray-500">ابدأ بإنشاء مشروع جديد لتوليد الصور والمحتوى التسويقي.</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-[#FF2E4C] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#E50914] transition"
            >
              إنشاء أول مشروع
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="group p-5 rounded-2xl border border-[#2a2e38] bg-[#11131a] space-y-4 transition hover:border-[#FF2E4C]/50 hover:-translate-y-1 block relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#FF2E4C] transition truncate max-w-[220px]">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{proj.industry || 'عام'}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, proj.id)}
                    className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition"
                    title="حذف المشروع"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {proj.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 leading-5">{proj.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#1F2438] text-[11px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(proj.updated_at || proj.created_at).toLocaleDateString('ar-LY')}</span>
                  </div>
                  <span className="text-[#FF2E4C] font-bold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                    <span>فتح المساحة</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-md space-y-4 relative">
              <button onClick={() => setCreateModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF2E4C]" /> إنشاء مشروع تسويقي جديد
              </h3>
              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">اسم المشروع:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: حملة المتجر الإلكتروني..."
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none focus:border-[#FF2E4C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">المجال / القطاع:</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
                    <option value="العقارات">العقارات</option>
                    <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
                    <option value="التعليم">التعليم</option>
                    <option value="الخدمات والتقنية">الخدمات والتقنية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">وصف موجز للهدف:</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توضيح تفاصيل الهدف والتطلعات..."
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs py-3 rounded-xl transition disabled:opacity-50 mt-2"
                >
                  {creating ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
