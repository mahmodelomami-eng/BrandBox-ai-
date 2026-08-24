'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import { listUserProjects, createUserProject } from '../../lib/projects/projects-service';
import {
  Sparkles,
  FolderOpen,
  Coins,
  ImageIcon,
  Plus,
  Zap,
  MessageSquare,
  Palette,
  ArrowRight,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';

function MetricCard({ label, value, subtitle, icon }) {
  return (
    <div className="flex min-h-24 items-center justify-between rounded-2xl border border-[#2a2e38] bg-[#11131a] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.02)]">
      <div>
        <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
        <div className="text-2xl font-black text-white">{value}</div>
        {subtitle && <div className="text-[10px] text-gray-500 mt-0.5">{subtitle}</div>}
      </div>
      <div className="p-3 bg-[#0D0F17] rounded-xl border border-[#1F2438]">
        {icon}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, creditBalance } = useAuth();
  const [projects, setProjects] = useState([]);
  const [assetsCount, setAssetsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectIndustry, setNewProjectIndustry] = useState('الأغذية والمشروبات');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let mounted = true;
    async function loadDashboardData() {
      try {
        const userProjects = await listUserProjects();
        if (mounted) setProjects(userProjects || []);
      } catch (err) {
        console.error('[Dashboard] Error fetching projects:', err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    }

    loadDashboardData();
    return () => { mounted = false; };
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      return showToast('يرجى إدخال اسم المشروع', 'error');
    }
    setCreating(true);
    try {
      const created = await createUserProject({
        name: newProjectName.trim(),
        industry: newProjectIndustry,
        type: 'صورة + نص',
        language: 'العربية',
        tone: 'احترافي',
      });
      setProjects((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setNewProjectName('');
      showToast('تم إنشاء المشروع بنجاح!', 'success');
    } catch (err) {
      showToast(err?.message || 'تعذر إنشاء المشروع', 'error');
    } finally {
      setCreating(false);
    }
  };

  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email?.split('@')[0] || 'المستخدم';

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> لوحة التحكم</div>

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-white">
              <Sparkles className="h-6 w-6 text-[#FF2E4C]" /> مرحباً بك، {displayName}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              منصة الذكاء الاصطناعي الشاملة لإدارة المحتوى والمشاريع التسويقية باللغة العربية.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex w-fit items-center gap-2 rounded-xl bg-[#FF2E4C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#FF2E4C]/20 transition hover:bg-[#E50914]"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="المشاريع النشطة"
            value={projects.length}
            subtitle="مشاريع تسويقية محفوظة"
            icon={<FolderOpen className="w-5 h-5 text-[#FF2E4C]" />}
          />
          <MetricCard
            label="الرصيد المتاح"
            value={`${creditBalance.toLocaleString('ar-LY')} نقطة`}
            subtitle="جاهزة للتوليد"
            icon={<Coins className="w-5 h-5 text-amber-400" />}
          />
          <MetricCard
            label="الأصول البصرية"
            value={assetsCount}
            subtitle="ملفات وتصاميم منشأة"
            icon={<ImageIcon className="w-5 h-5 text-[#FF2E4C]" />}
          />
        </div>

        {/* Quick Shortcuts */}
        <div className="space-y-4 rounded-2xl border border-[#2a2e38] bg-[#11131a] p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FF2E4C]" />
            <span>اختصارات التوليد السريع</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/chat-ai"
              className="group flex items-center gap-4 rounded-xl border border-[#2a2e38] bg-[#0b0d12] p-4 text-right transition hover:border-[#FF2E4C]/60"
            >
              <span className="rounded-xl border border-[#343843] p-3 text-[#FF2E4C]"><MessageSquare className="h-6 w-6" /></span>
              <div>
                <div className="font-bold text-sm text-white">المساعد الذكي (AI Chat)</div>
                <p className="text-[10px] text-gray-400 mt-1">كتابة سيناريوهات، نصوص، وأفكار تسويقية</p>
              </div>
            </Link>

            <Link
              href="/images-ai"
              className="group flex items-center gap-4 rounded-xl border border-[#2a2e38] bg-[#0b0d12] p-4 text-right transition hover:border-[#FF2E4C]/60"
            >
              <span className="rounded-xl border border-[#343843] p-3 text-[#FF2E4C]"><ImageIcon className="h-6 w-6" /></span>
              <div>
                <div className="font-bold text-sm text-white">توليد الصور (AI Images)</div>
                <p className="text-[10px] text-gray-400 mt-1">تصاميم وبوسترات إعلانية فائقة الدقة</p>
              </div>
            </Link>

            <Link
              href="/brand-kit"
              className="group flex items-center gap-4 rounded-xl border border-[#2a2e38] bg-[#0b0d12] p-4 text-right transition hover:border-[#FF2E4C]/60"
            >
              <span className="rounded-xl border border-[#343843] p-3 text-[#FF2E4C]"><Palette className="h-6 w-6" /></span>
              <div>
                <div className="font-bold text-sm text-white">مدير الهوية (Brand Kit)</div>
                <p className="text-[10px] text-gray-400 mt-1">تخصيص ألوان وشعار ونبرة علامتك</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#FF2E4C]" />
              <span>أحدث المشاريع</span>
            </h3>
            <Link href="/projects" className="text-xs font-semibold text-[#FF2E4C] hover:underline flex items-center gap-1">
              <span>عرض كل المشاريع</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#2a2e38] bg-[#11131a] space-y-3">
              <FolderOpen className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">لا توجد مشاريع حتى الآن. ابدأ بإنشاء مشروعك الأول!</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#FF2E4C] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#E50914] transition"
              >
                إنشاء مشروع
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="p-4 rounded-2xl border border-[#2a2e38] bg-[#11131a] space-y-3 transition hover:border-[#FF2E4C]/50 hover:-translate-y-0.5 block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{proj.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{proj.industry || 'عام'} · {proj.type || 'صورة + نص'}</p>
                    </div>
                    <span className="text-[10px] bg-[#FF2E4C]/15 text-[#FF2E4C] font-bold px-2 py-0.5 rounded-full border border-[#FF2E4C]/30">
                      نشط
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{proj.description}</p>
                  )}
                  <div className="text-[10px] text-gray-500 flex items-center gap-1 pt-2 border-t border-[#1F2438]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(proj.updated_at || proj.created_at).toLocaleDateString('ar-LY')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create Project Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-md space-y-4 relative">
              <button onClick={() => setCreateModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF2E4C]" /> إنشاء مشروع تسويقي جديد
              </h3>
              <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">اسم المشروع:</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="مثال: حملة متجر القهوة..."
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none focus:border-[#FF2E4C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">المجال / القطاع:</label>
                  <select
                    value={newProjectIndustry}
                    onChange={(e) => setNewProjectIndustry(e.target.value)}
                    className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
                    <option value="العقارات">العقارات</option>
                    <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
                    <option value="التعليم">التعليم</option>
                    <option value="الخدمات والتقنية">الخدمات والتقنية</option>
                  </select>
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
