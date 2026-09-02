import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, MessageSquare, Mic2, Trash2, Video } from 'lucide-react';

const TOOLS = [
  {
    id: 'images',
    label: 'الصور AI',
    description: 'أنشئ وأدر مشاريع الصور وتابع التوليدات والنتائج داخل كل مشروع.',
    href: '/projects/images',
    icon: ImageIcon,
  },
  {
    id: 'video',
    label: 'الفيديو AI',
    description: 'جهّز وأدر مشاريع الفيديو ومشاهدها؛ التوليد يتاح حسب مزود الفيديو المفعّل.',
    href: '/projects/video',
    icon: Video,
  },
  {
    id: 'chat',
    label: 'الشات AI',
    description: 'نظّم محادثاتك ومشاريع الكتابة والمحتوى وواصل العمل من حيث توقفت.',
    href: '/projects/chat',
    icon: MessageSquare,
  },
  {
    id: 'audio',
    label: 'الصوت AI',
    description: 'جهّز نصوص وإعدادات مشاريع الصوت والتعليق؛ التوليد يتاح حسب المزود المفعّل.',
    href: '/projects/audio',
    icon: Mic2,
  },
];

export default function ProjectsToolHub() {
  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1480px]">
        <div className="mb-8 text-center">
          <p className="bb-text-accent text-xs font-black tracking-[0.18em]">مساحة المشاريع</p>
          <h1 className="bb-text-primary mt-2 text-2xl font-black sm:text-3xl">اختر نوع المشروع الذي تريد إدارته</h1>
          <p className="bb-text-secondary mx-auto mt-3 max-w-2xl text-sm leading-7">
            كل أداة تحتفظ بمشاريعها ونشاطها بشكل مستقل. افتح مشروعًا موجودًا أو أنشئ مشروعًا جديدًا، ويمكن استعادة المشروع المحذوف من السلة خلال 30 يومًا.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map(({ id, label, description, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className="bb-card group relative overflow-hidden rounded-[24px] border p-6 transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#f31325]/65 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="bb-accent-soft mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border">
                <Icon size={34} strokeWidth={2.2} />
              </span>
              <h2 className="bb-text-primary text-2xl font-black">{label}</h2>
              <p className="bb-text-secondary mt-3 min-h-20 text-sm leading-7">{description}</p>
              <span className="bb-accent-soft mt-8 flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition group-hover:bg-[var(--bb-accent)] group-hover:text-white">
                فتح مشاريع {label} <ArrowLeft size={18} />
              </span>
            </Link>
          ))}
        </div>

        <Link href="/projects/trash" className="bb-panel mt-6 flex min-h-20 flex-col gap-4 rounded-2xl border p-5 transition focus-visible:outline-none focus-visible:ring-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="bb-accent-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"><Trash2 size={20} /></span>
            <div>
              <div className="bb-text-primary text-sm font-black">سلة المحذوفات</div>
              <p className="bb-text-tertiary mt-1 text-xs leading-6">استعد مشاريعك المحذوفة خلال نافذة الاستعادة البالغة 30 يومًا.</p>
            </div>
          </div>
          <span className="bb-text-accent flex min-h-10 items-center gap-2 text-xs font-black">فتح السلة <ArrowLeft size={15} /></span>
        </Link>
      </section>
    </main>
  );
}
