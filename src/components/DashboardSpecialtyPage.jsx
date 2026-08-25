'use client';

import Link from 'next/link';
import { ArrowLeft, Boxes, BriefcaseBusiness, CreditCard, FileText, ImageIcon, MessageSquare, Package, Palette, Printer, ShoppingBag, Sparkles, Video, WandSparkles } from 'lucide-react';

const sections = {
  studio: {
    title: 'استوديو الذكاء الاصطناعي',
    subtitle: 'ابدأ من نوع المهمة ثم انتقل مباشرة إلى أداة التنفيذ المناسبة.',
    cards: [
      ['/projects/images', 'الصور AI', 'إنشاء وتحرير الصور والمشاهد البصرية.', ImageIcon],
      ['/projects/video', 'الفيديو AI', 'إنشاء الفيديو والمشاهد والحركة.', Video],
      ['/projects/chat', 'شات AI', 'كتابة المحتوى، الأفكار، البحث والمساعدة.', MessageSquare],
      ['/projects/audio', 'الصوت AI', 'التعليق الصوتي والصوت المدعوم بالذكاء الاصطناعي.', Sparkles],
    ],
  },
  brand: {
    title: 'الهوية والعلامة التجارية',
    subtitle: 'مساحة تجمع الهوية والقوالب والأصول الإبداعية للعلامة.',
    cards: [
      ['/templates', 'مكتبة القوالب', 'قوالب جاهزة للمنشورات والحملات.', Palette],
      ['/projects', 'مشاريع الهوية', 'اجمع ملفات كل علامة ومخرجاتها في مشروع واحد.', Boxes],
      ['/projects/images', 'تصميم بصري بالذكاء الاصطناعي', 'أنشئ اتجاهات بصرية ومفاهيم أولية بسرعة.', WandSparkles],
      ['/dashboard/account', 'إعدادات الحساب', 'إدارة بيانات الحساب وتفضيلات الاستخدام.', FileText],
    ],
  },
  marketing: {
    title: 'التسويق والمحتوى',
    subtitle: 'خطط، اكتب، صمم، ثم انقل العمل إلى مشروع قابل للتنفيذ.',
    cards: [
      ['/marketing-plans', 'الخطط التسويقية', 'إنشاء وإدارة خطط الحملات والمحتوى.', BriefcaseBusiness],
      ['/projects/chat', 'كاتب المحتوى', 'صياغة منشورات، إعلانات، أفكار وسيناريوهات.', MessageSquare],
      ['/projects/images', 'التصاميم التسويقية', 'إنشاء الصور والمفاهيم الإعلانية.', ImageIcon],
      ['/projects', 'مشاريع الحملات', 'تنظيم الحملة ومخرجاتها وأصولها.', Boxes],
    ],
  },
  print: {
    title: 'الطباعة والإنتاج',
    subtitle: 'انتقل من التصميم إلى طلب وتجهيز مواد الطباعة والإنتاج.',
    cards: [
      ['/print', 'المطبعة', 'خدمات الطباعة والمواد المطبوعة.', Printer],
      ['/projects', 'مشاريع الإنتاج', 'تنظيم ملفات التنفيذ والموافقات.', Package],
      ['/projects/images', 'تجهيز التصميم', 'إنشاء مفاهيم وصور قبل مرحلة التنفيذ.', ImageIcon],
      ['/templates', 'قوالب مطبوعة', 'ابدأ من قالب مناسب للمقاس والاستخدام.', FileText],
    ],
  },
  commerce: {
    title: 'المتجر والمشتريات',
    subtitle: 'إدارة المنتجات الرقمية والمشتريات والرصيد من مساحة واحدة.',
    cards: [
      ['/store', 'المتجر', 'استعرض المنتجات والخدمات المتاحة.', ShoppingBag],
      ['/store/purchases', 'مشترياتي', 'راجع الطلبات والمشتريات السابقة.', Package],
      ['/pricing', 'الباقات والرصيد', 'اختر الباقة واشحن رصيدك.', CreditCard],
      ['/dashboard/account', 'الفوترة والحساب', 'راجع معلومات الحساب والرصيد.', FileText],
    ],
  },
  account: {
    title: 'الحساب والرصيد',
    subtitle: 'كل ما يتعلق بالحساب، الرصيد، المشتريات والوصول للخدمات.',
    cards: [
      ['/pricing', 'شراء رصيد', 'الاطلاع على الباقات وخيارات الشحن.', CreditCard],
      ['/store/purchases', 'المشتريات', 'عرض سجل المشتريات والطلبات.', Package],
      ['/projects', 'مشاريعي', 'الوصول إلى مشاريع الحساب الحالية.', Boxes],
      ['/dashboard', 'العودة للنظرة العامة', 'العودة إلى لوحة التحكم الرئيسية.', ArrowLeft],
    ],
  },
};

export default function DashboardSpecialtyPage({ type }) {
  const data = sections[type] || sections.studio;
  return <div className="space-y-6">
    <section className="rounded-3xl border border-white/8 bg-[#10131a] p-6 sm:p-8">
      <div className="text-xs font-black tracking-wider text-[#ff6674]">WORKSPACE</div>
      <h2 className="mt-3 text-3xl font-black">{data.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">{data.subtitle}</p>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {data.cards.map(([href, label, text, Icon]) => <Link key={`${type}-${href}-${label}`} href={href} className="group rounded-2xl border border-white/8 bg-[#0d1016] p-5 transition hover:-translate-y-0.5 hover:border-[#f31325]/35 hover:bg-[#11151d]">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={22}/></span>
        <h3 className="mt-4 text-base font-black">{label}</h3>
        <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{text}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#ff6674]">فتح <ArrowLeft size={14}/></span>
      </Link>)}
    </section>
  </div>;
}
