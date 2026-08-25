'use client';

import Link from 'next/link';
import { ArrowLeft, BarChart3, Boxes, CreditCard, FileText, Gauge, MessageSquareWarning, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react';

const departments = {
  overview: {
    title: 'مركز إدارة Brand Box AI',
    subtitle: 'واجهة تشغيل موحدة للإدارات والصلاحيات ومراقبة المنصة.',
    cards: [
      ['/admin/users', 'المستخدمون والصلاحيات', 'إدارة الحسابات، الأدوار، الحالات والوصول.', Users],
      ['/admin/ai', 'الذكاء الاصطناعي والنماذج', 'متابعة المزودين، النماذج، الاستخدام والأخطاء.', Sparkles],
      ['/admin/finance', 'المالية والاشتراكات', 'الباقات، الأرصدة، المدفوعات والمعاملات.', CreditCard],
      ['/admin/operations', 'التشغيل والتحليلات', 'مؤشرات الأداء، الأخطاء، السجلات والحالة التشغيلية.', BarChart3],
      ['/admin/content', 'المحتوى والتسويق', 'إدارة محتوى المنصة، العروض، الحملات والتحديثات.', Boxes],
      ['/admin/settings', 'إعدادات المنصة', 'الإعدادات العامة والسياسات والتكاملات.', Settings],
    ],
  },
  users: {
    title: 'إدارة المستخدمين والصلاحيات',
    subtitle: 'مساحة مخصصة للإدارة التشغيلية للحسابات والأدوار والوصول.',
    cards: [
      ['/dashboard', 'لوحة المستخدم', 'اختبار تجربة المستخدم النهائية.', Users],
      ['/admin', 'مركز الإدارة', 'العودة إلى نظرة الإدارة العامة.', ShieldCheck],
      ['/admin/operations', 'المراجعة والتدقيق', 'الانتقال إلى مؤشرات التشغيل والسجلات.', FileText],
    ],
  },
  ai: {
    title: 'إدارة الذكاء الاصطناعي والنماذج',
    subtitle: 'مساحة فرق AI لمراقبة النماذج والتكلفة والاستخدام وجودة الخدمة.',
    cards: [
      ['/projects/images', 'اختبار الصور', 'فتح تجربة المستخدم لأداة الصور.', Sparkles],
      ['/video-ai', 'اختبار الفيديو', 'فتح تجربة المستخدم لأداة الفيديو.', Gauge],
      ['/chat-ai', 'اختبار الشات', 'فتح تجربة المستخدم للمحادثة.', MessageSquareWarning],
      ['/admin/operations', 'مؤشرات التشغيل', 'مراجعة أداء الخدمات والأخطاء.', BarChart3],
    ],
  },
  finance: {
    title: 'الإدارة المالية والاشتراكات',
    subtitle: 'متابعة الرصيد، الباقات، الدفع، الاشتراكات ومتجر المنصة.',
    cards: [
      ['/pricing', 'الأسعار والباقات', 'معاينة الباقات كما يراها المستخدم.', CreditCard],
      ['/store', 'المتجر', 'معاينة المنتجات والخدمات.', Boxes],
      ['/store/purchases', 'المشتريات', 'مراجعة واجهة سجل المشتريات.', FileText],
      ['/admin/operations', 'تقارير التشغيل', 'الانتقال إلى مؤشرات الأداء العامة.', BarChart3],
    ],
  },
  content: {
    title: 'إدارة المحتوى والتسويق',
    subtitle: 'لوحة فرق المحتوى والتسويق لإدارة العروض والصفحات والحملات.',
    cards: [
      ['/admin/home-content', 'محتوى الصفحة الرئيسية', 'إدارة أقسام وبانرات محتوى الواجهة العامة.', Boxes],
      ['/marketing-plans', 'الخطط التسويقية', 'معاينة مساحة الخطط والحملات.', Sparkles],
      ['/templates', 'القوالب', 'مراجعة مكتبة القوالب.', FileText],
      ['/admin', 'مركز الإدارة', 'العودة إلى النظرة العامة.', ShieldCheck],
    ],
  },
  operations: {
    title: 'التشغيل والتحليلات',
    subtitle: 'مساحة الإدارة التشغيلية لمتابعة الصحة العامة والمؤشرات والأخطاء.',
    cards: [
      ['/api/health', 'حالة الخدمة', 'فحص صحة واجهة API الأساسية.', Gauge],
      ['/admin/users', 'حالة المستخدمين', 'الانتقال إلى إدارة الحسابات.', Users],
      ['/admin/ai', 'تشغيل AI', 'الانتقال إلى إدارة النماذج والأدوات.', Sparkles],
      ['/admin/finance', 'تشغيل المالية', 'الانتقال إلى الإدارة المالية.', CreditCard],
    ],
  },
  settings: {
    title: 'إعدادات المنصة',
    subtitle: 'التكوين العام للمنصة والتكاملات والسياسات التشغيلية.',
    cards: [
      ['/admin', 'مركز الإدارة', 'العودة إلى الصفحة الإدارية الرئيسية.', ShieldCheck],
      ['/admin/operations', 'التشغيل', 'مراجعة الحالة قبل أي تغيير تشغيلي.', Gauge],
      ['/dashboard', 'تجربة المستخدم', 'معاينة الواجهة بعد التغييرات.', Users],
    ],
  },
};

export default function AdminDepartmentDashboard({ type = 'overview' }) {
  const data = departments[type] || departments.overview;
  return <div className="space-y-6">
    <section className="rounded-3xl border border-[#f31325]/20 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.15),transparent_34%),#10131a] p-6 sm:p-8">
      <div className="text-xs font-black tracking-wider text-[#ff6674]">ADMIN CONTROL CENTER</div>
      <h2 className="mt-3 text-3xl font-black">{data.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">{data.subtitle}</p>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.cards.map(([href, label, text, Icon]) => <Link key={`${type}-${href}-${label}`} href={href} className="group rounded-2xl border border-white/8 bg-[#0d1016] p-5 transition hover:-translate-y-0.5 hover:border-[#f31325]/35">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={22}/></span>
        <h3 className="mt-4 text-base font-black">{label}</h3>
        <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{text}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#ff6674]">فتح <ArrowLeft size={14}/></span>
      </Link>)}
    </section>
  </div>;
}
