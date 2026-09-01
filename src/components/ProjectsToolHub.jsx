import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, MessageSquare, Mic2, Trash2, Video } from 'lucide-react';

const TOOLS = [
  {
    id: 'images',
    label: 'الصور AI',
    description: 'توليد وتحرير الصور بالذكاء الاصطناعي',
    href: '/projects/images',
    icon: ImageIcon,
  },
  {
    id: 'video',
    label: 'الفيديو AI',
    description: 'إنشاء فيديوهات احترافية بذكاء اصطناعي',
    href: '/projects/video',
    icon: Video,
  },
  {
    id: 'chat',
    label: 'الشات AI',
    description: 'محادثة ذكية ومساعدك الإبداعي',
    href: '/projects/chat',
    icon: MessageSquare,
  },
  {
    id: 'audio',
    label: 'الصوت AI',
    description: 'توليد الصوت والتعليق الصوتي باحتراف',
    href: '/projects/audio',
    icon: Mic2,
  },
];

export default function ProjectsToolHub() {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050506] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1480px]">
        <div className="mb-8 text-center">
          <p className="text-xs font-black tracking-[0.18em] text-[#ff3344]">مساحة المشاريع</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">اختر الأداة للبدء</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            كل أداة لها مشاريعها الخاصة. المشاريع النشطة تبقى محفوظة، ويمكن استعادة المشروع المحذوف من السلة خلال 30 يومًا.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map(({ id, label, description, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className="group relative overflow-hidden rounded-[24px] border border-[#4a292c] bg-[#171719] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#f31325]/80 hover:shadow-[0_24px_70px_rgba(243,19,37,.12)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#f31325]/70 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff2637] shadow-[0_0_28px_rgba(243,19,37,.08)]">
                <Icon size={34} strokeWidth={2.2} />
              </span>
              <h2 className="text-2xl font-black">{label}</h2>
              <p className="mt-3 min-h-14 text-sm leading-7 text-[#c6a7a9]">{description}</p>
              <span className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-[#f31325]/35 bg-[#441b20] px-4 py-3 text-sm font-black text-[#ff4a58] transition group-hover:bg-[#f31325] group-hover:text-white">
                عرض المشاريع <ArrowLeft size={18} />
              </span>
            </Link>
          ))}
        </div>

        <Link href="/projects/trash" className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0f14] p-5 transition hover:border-[#f31325]/35 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#181b22] text-[#ff3344]"><Trash2 size={20} /></span>
            <div>
              <div className="text-sm font-black">سلة المحذوفات</div>
              <p className="mt-1 text-xs leading-6 text-gray-500">استعد المشاريع التي حذفتها خلال نافذة 30 يومًا.</p>
            </div>
          </div>
          <span className="flex items-center gap-2 text-xs font-black text-[#ff3344]">فتح السلة <ArrowLeft size={15} /></span>
        </Link>
      </section>
    </main>
  );
}
