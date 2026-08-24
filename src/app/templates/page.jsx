'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProject } from '../../lib/projects/projects-service';
import { Layers3, Search, Sparkles } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'tpl-01',
    title: 'حملة ترويج القهوة المختصة',
    category: 'مطاعم ومقاهي',
    industry: 'الأغذية والمشروبات',
    description: 'تصميم بوسترات سينمائية مع نصوص إعلانية فاخرة باللغة العربية.',
    badge: 'شائع',
    thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tpl-02',
    title: 'إعلان مجمع سكني فاخر',
    category: 'إعلانات عقارية',
    industry: 'العقارات',
    description: 'صور معمارية حديثة مع نصوص تسويقية موجهة للمستثمرين.',
    badge: 'احترافي',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tpl-03',
    title: 'افتتاح مركز تعليمي وتدريبي',
    category: 'مدارس وتعلّيم',
    industry: 'التعليم',
    description: 'بوستات توعية وقبول وتعديل الهوية البصرية للجامعات والمدارس.',
    badge: 'جديد',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tpl-04',
    title: 'تهنئة المناسبات الرسمية والأعياد',
    category: 'مناسبات رسمية',
    industry: 'عام',
    description: 'قوالب بطاقات معايدة فاخرة قابلة للتخصيص بشعار شركتك.',
    badge: 'موسمي',
    thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tpl-05',
    title: 'انفوجرافيك إحصائيات الشركات',
    category: 'أعمال وتقارير',
    industry: 'الخدمات والتقنية',
    description: 'عروض بصرية للبيانات ومؤشرات الأداء التنافسية للفرق.',
    badge: 'أعمال',
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tpl-06',
    title: 'خصومات وتخفيضات التجارة الإلكترونية',
    category: 'وسائل التواصل',
    industry: 'التجارة الإلكترونية',
    description: 'تصاميم خصم حصرية وبنرات ستوري متناسقة مع مظهر متجرك.',
    badge: 'تخفيضات',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&auto=format&fit=crop&q=80',
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUseTemplate = async (tpl) => {
    setCreatingId(tpl.id);
    try {
      const project = await createUserProject({
        name: tpl.title,
        industry: tpl.industry,
        description: tpl.description,
        type: 'صورة + نص',
        language: 'العربية',
        tone: 'احترافي',
      });
      showToast('تم إنشاء المشروع بنجاح!', 'success');
      router.push(`/projects/${project.id}`);
    } catch (err) {
      showToast(err?.message || 'تعذر إنشاء المشروع من القالب', 'error');
      setCreatingId(null);
    }
  };

  const filtered = TEMPLATES.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()) ||
    t.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-8">
      {toast && (
        <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> مكتبة القوالب</div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Layers3 className="w-5 h-5 text-[#FF2E4C]" /> مكتبة القوالب التسويقية (Templates Library)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            قوالب جاهزة قابلة للتخصيص ومعدة مسبقاً لحملاتك الإعلانية بالذكاء الاصطناعي.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute top-3 right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث في القوالب..."
            className="bg-[#11131a] border border-[#2a2e38] text-white text-xs rounded-xl pr-9 pl-4 py-2.5 outline-none focus:border-[#FF2E4C] w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="p-4 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-3 flex flex-col justify-between hover:border-[#FF2E4C]/50 transition"
          >
            <div className="space-y-3">
              <img
                src={tpl.thumbnail}
                alt={tpl.title}
                className="w-full h-40 object-cover rounded-xl border border-[#1F2438]"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] bg-[#FF2E4C]/15 text-[#FF2E4C] px-2.5 py-0.5 rounded-full font-bold border border-[#FF2E4C]/30">
                  {tpl.category}
                </span>
                <span className="text-[10px] text-gray-500">{tpl.badge}</span>
              </div>
              <h3 className="font-bold text-white text-sm">{tpl.title}</h3>
              <p className="text-xs text-gray-400 leading-5">{tpl.description}</p>
            </div>

            <button
              onClick={() => handleUseTemplate(tpl)}
              disabled={creatingId !== null}
              className="w-full bg-[#1F2438] hover:bg-[#FF2E4C] text-white font-bold text-xs py-3 rounded-xl transition disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{creatingId === tpl.id ? 'جاري تجهيز المشروع...' : 'استخدام القالب في مشروع'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
