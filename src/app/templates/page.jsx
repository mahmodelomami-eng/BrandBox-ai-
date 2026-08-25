'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProject } from '../../lib/projects/projects-service';
import { useAuth } from '../../context/AuthContext';
import { Layers3, Search, Sparkles } from 'lucide-react';

const TEMPLATES = [
  { id: 'tpl-01', title: 'حملة ترويج القهوة المختصة', category: 'مطاعم ومقاهي', industry: 'الأغذية والمشروبات', description: 'تصميم بوستر سينمائي لقهوة مختصة، إضاءة دافئة فاخرة، إبراز المنتج بوضوح، مساحة نظيفة لإضافة عنوان عربي قصير وشعار العلامة.', badge: 'شائع', thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80' },
  { id: 'tpl-02', title: 'إعلان مجمع سكني فاخر', category: 'إعلانات عقارية', industry: 'العقارات', description: 'مشهد معماري فاخر لمجمع سكني حديث وقت الغروب، طابع استثماري راقٍ، تكوين إعلاني احترافي ومساحة لعنوان ومزايا المشروع.', badge: 'احترافي', thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80' },
  { id: 'tpl-03', title: 'افتتاح مركز تعليمي وتدريبي', category: 'مدارس وتعليم', industry: 'التعليم', description: 'بوستر افتتاح لمركز تعليمي حديث، طلاب وبيئة تعلم عصرية، أسلوب موثوق ومشرق، مساحة واضحة لاسم المركز وتاريخ الافتتاح.', badge: 'جديد', thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80' },
  { id: 'tpl-04', title: 'تهنئة المناسبات الرسمية والأعياد', category: 'مناسبات رسمية', industry: 'عام', description: 'بطاقة تهنئة عربية فاخرة للمناسبات الرسمية، تكوين أنيق ومحايد قابل للتخصيص بألوان وهوية الشركة، مساحة للشعار والعبارة.', badge: 'موسمي', thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80' },
  { id: 'tpl-05', title: 'إنفوجرافيك إحصائيات الشركات', category: 'أعمال وتقارير', industry: 'الخدمات والتقنية', description: 'تصميم إنفوجرافيك أعمال حديث ونظيف لعرض مؤشرات وأرقام رئيسية، شبكة بصرية احترافية ومساحات واضحة للأرقام والعناوين.', badge: 'أعمال', thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80' },
  { id: 'tpl-06', title: 'خصومات التجارة الإلكترونية', category: 'وسائل التواصل', industry: 'التجارة الإلكترونية', description: 'بوستر تخفيضات تجارة إلكترونية عالي التأثير، تركيز على المنتج والسعر، تكوين مناسب لمنشور اجتماعي ومساحة لعبارة العرض ونسبة الخصم.', badge: 'تخفيضات', thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&auto=format&fit=crop&q=80' },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleUseTemplate = async (tpl) => {
    if (loading) return;
    if (!user) {
      router.push('/auth?next=%2Ftemplates');
      return;
    }
    setCreatingId(tpl.id);
    try {
      const project = await createUserProject({
        name: tpl.title,
        industry: tpl.industry,
        description: `قالب: ${tpl.title} — ${tpl.description}`,
        type: 'صورة',
        language: 'العربية',
        tone: 'احترافي',
      });
      router.push(`/projects/images/workspace?project=${encodeURIComponent(project.id)}`);
    } catch (err) {
      showToast(err?.message || 'تعذر إنشاء المشروع من القالب');
      setCreatingId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = TEMPLATES.filter((template) => !normalizedSearch
    || template.title.toLowerCase().includes(normalizedSearch)
    || template.category.toLowerCase().includes(normalizedSearch)
    || template.industry.toLowerCase().includes(normalizedSearch));

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
        {toast && <div className="fixed left-6 top-24 z-50 rounded-xl border border-red-500/40 bg-[#121520] px-4 py-3 text-sm text-red-200 shadow-2xl">{toast}</div>}
        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> مكتبة القوالب</div>
        <section className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-[#0d1016] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <div className="text-xs font-black tracking-wider text-[#ff6674]">TEMPLATES</div>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-black"><Layers3 className="text-[#FF2E4C]" /> مكتبة القوالب</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-400">اختر اتجاهًا بصريًا؛ سننشئ مشروع صور حقيقي ونفتح الاستوديو مع سياق القالب محفوظًا داخل المشروع لتستخدمه كمرجع أثناء التوليد.</p>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالقطاع أو نوع التصميم..." className="w-full rounded-xl border border-white/10 bg-[#151820] py-3 pl-4 pr-10 text-xs outline-none focus:border-[#FF2E4C] sm:w-72" />
          </div>
        </section>
        {filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-12 text-center text-sm text-gray-500">لا توجد قوالب مطابقة للبحث.</div> : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tpl) => (
              <article key={tpl.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] transition hover:-translate-y-1 hover:border-[#FF2E4C]/45">
                <img src={tpl.thumbnail} alt={tpl.title} className="h-44 w-full object-cover" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2"><span className="rounded-full border border-[#FF2E4C]/25 bg-[#FF2E4C]/10 px-2.5 py-1 text-[10px] font-black text-[#ff6674]">{tpl.category}</span><span className="text-[10px] text-gray-600">{tpl.badge}</span></div>
                  <h2 className="mt-4 text-base font-black">{tpl.title}</h2>
                  <p className="mt-2 flex-1 text-xs leading-6 text-gray-400">{tpl.description}</p>
                  <button type="button" onClick={() => void handleUseTemplate(tpl)} disabled={creatingId !== null || loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2438] py-3 text-xs font-black transition hover:bg-[#FF2E4C] disabled:opacity-50"><Sparkles className="h-4 w-4" /> {creatingId === tpl.id ? 'جاري إنشاء المشروع...' : user ? 'استخدام القالب في مشروع' : 'سجّل الدخول لاستخدام القالب'}</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
