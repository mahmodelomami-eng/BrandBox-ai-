'use client';

import Link from 'next/link';
import {
  Bell,
  Database,
  Flag,
  Gauge,
  HardDrive,
  KeyRound,
  Mail,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
  Wrench,
} from 'lucide-react';

const SETTINGS_GROUPS = [
  {
    id: 'general',
    title: 'الإعدادات العامة',
    description: 'هوية المنصة والبيانات العامة واللغة والمنطقة الزمنية والعملات.',
    icon: Settings2,
    items: ['اسم المنصة والشعار', 'الدومين والبريد والدعم', 'الدولة والعملة والمنطقة الزمنية', 'اللغة الافتراضية'],
  },
  {
    id: 'users',
    title: 'المستخدمون والتسجيل',
    description: 'سياسات إنشاء الحسابات والتحقق والجلسات واسترداد الحساب.',
    icon: Users,
    items: ['السماح بالتسجيل', 'التحقق من البريد', 'موفرو تسجيل الدخول', 'سياسة كلمات المرور والجلسات'],
  },
  {
    id: 'usage',
    title: 'الحدود والاستخدام',
    description: 'حدود الاستخدام العامة والأساس الذي ستبنى عليه حدود كل خطة.',
    icon: SlidersHorizontal,
    items: ['الحد اليومي والشهري', 'المهام المتزامنة', 'حجم الملفات', 'مدة الفيديو ودقة الصور وطلبات API'],
  },
  {
    id: 'security',
    title: 'الأمان',
    description: 'سياسات الإدارة الحساسة والمصادقة الإضافية وإدارة الجلسات.',
    icon: ShieldCheck,
    items: ['2FA للإدارة', 'انتهاء الجلسات', 'تاريخ تسجيل الدخول', 'تأكيد العمليات الحساسة'],
  },
  {
    id: 'maintenance',
    title: 'وضع الصيانة',
    description: 'تهيئة وضع صيانة مركزي مع استثناء حسابات الإدارة عند الحاجة.',
    icon: Wrench,
    items: ['تشغيل/إيقاف الصيانة', 'رسالة الصيانة', 'استثناء الإداريين', 'نافذة الصيانة المجدولة'],
  },
  {
    id: 'features',
    title: 'Feature Flags',
    description: 'إطلاق تدريجي وآمن للميزات والتجارب قبل تعميمها على جميع المستخدمين.',
    icon: Flag,
    items: ['تشغيل/إيقاف الميزات', 'إطلاق بنسبة مئوية', 'ميزات Beta', 'تقييد حسب الخطة أو الدور'],
  },
  {
    id: 'notifications',
    title: 'الإشعارات',
    description: 'قنوات الإشعارات وقواعد التنبيه الخاصة بالنظام والاستخدام.',
    icon: Bell,
    items: ['In-app', 'Email', 'Push', 'تنبيهات الرصيد والتوليد والنظام'],
  },
  {
    id: 'email',
    title: 'البريد والقوالب',
    description: 'تهيئة مزود البريد وقوالب الرسائل دون كشف الأسرار في الواجهة.',
    icon: Mail,
    items: ['اسم المرسل والبريد', 'التحقق والترحيب', 'استعادة كلمة المرور', 'الفواتير والتنبيهات'],
  },
  {
    id: 'storage',
    title: 'التخزين والاحتفاظ',
    description: 'سياسات رفع الملفات والاحتفاظ والحذف والضغط والتوزيع.',
    icon: HardDrive,
    items: ['مزود التخزين', 'حدود الرفع', 'سياسة الاحتفاظ', 'CDN والضغط والحذف التلقائي'],
  },
  {
    id: 'integrations',
    title: 'تكاملات النظام',
    description: 'نقطة مركزية للتكاملات الحساسة مع إبقاء المفاتيح في بيئة الخادم فقط.',
    icon: KeyRound,
    items: ['AI Providers', 'Payments', 'Webhooks', 'Email/Storage integrations'],
  },
];

function SourceBadge({ value }) {
  const healthy = String(value || '').toLowerCase() === 'live';
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${healthy ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-gray-400'}`}>
      {value || 'غير محدد'}
    </span>
  );
}

export default function AdminSettingsHub({ sources = {} }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[.18em] text-[#ff6674]">ADMIN SETTINGS</div>
            <h2 className="mt-2 text-xl font-black">مركز إعدادات المنصة</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-gray-500">
              هيكل مركزي للإعدادات التشغيلية والأمنية. هذه المرحلة تنظم الواجهة فقط؛ الحفظ الفعلي سيتم عبر API محمي وسجل تدقيق في المرحلة التالية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/home-content" className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black hover:border-[#f31325]/40">
              <UserRoundCog size={16} className="text-[#ff3344]" /> محتوى الصفحة الرئيسية
            </Link>
            <a href="/api/health" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-black text-emerald-300">
              <Gauge size={16} /> حالة الخدمة
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {SETTINGS_GROUPS.map(({ id, title, description, icon: Icon, items }) => (
          <section key={id} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 transition hover:border-white/20">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={20} /></span>
              <div className="min-w-0">
                <h3 className="font-black">{title}</h3>
                <p className="mt-1 text-xs leading-6 text-gray-500">{description}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {items.map((item) => <div key={item} className="rounded-xl border border-white/[.07] bg-[#10131a] px-3 py-2.5 text-xs text-gray-400">{item}</div>)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px]">
              <span className="font-black text-amber-300">واجهة التهيئة</span>
              <span className="text-gray-600">الحفظ الآمن في Phase 2B</span>
            </div>
          </section>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
          <div className="flex items-center gap-2 font-black"><Database size={18} className="text-emerald-300" /> مصادر البيانات الحالية</div>
          <p className="mt-2 text-xs leading-6 text-gray-500">تعرض هذه القائمة المصادر التي يصرح بها مركز الإدارة الحالي فقط، دون أسرار أو مفاتيح.</p>
          <div className="mt-4 space-y-2">
            {Object.entries(sources).length ? Object.entries(sources).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-[#10131a] px-4 py-3 text-xs">
                <span className="font-mono text-gray-400">{key}</span>
                <SourceBadge value={value} />
              </div>
            )) : <div className="rounded-xl border border-white/[.07] bg-[#10131a] px-4 py-6 text-center text-xs text-gray-600">لا توجد مصادر معلنة حاليًا.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 font-black text-amber-200"><KeyRound size={18} /> قاعدة الأمان للإعدادات</div>
          <div className="mt-4 space-y-3 text-xs leading-6 text-amber-100/70">
            <p>لن يتم تخزين مفاتيح API أو كلمات المرور أو أسرار SMTP داخل إعدادات قابلة للقراءة من المتصفح.</p>
            <p>الإعدادات الحساسة ستتطلب صلاحيات RBAC مناسبة، وسيتم تسجيل التغييرات الإدارية المهمة في Audit Log.</p>
            <p>لن يتم تنفيذ تغييرات بنية تحتية أو Production مباشرة من هذه الواجهة دون طبقة خادم محمية وتأكيد إضافي للعمليات الخطرة.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
