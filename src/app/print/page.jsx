import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Boxes, ImageIcon, Printer, Ruler, Sparkles, Store, TentTree } from 'lucide-react';

const SERVICES = [
  { icon: Printer, title: 'المطبوعات التجارية', text: 'بروشورات، مطويات، بطاقات، ملفات، دفاتر ومواد مكتبية وتجارية.', subject: 'طلب عرض سعر — مطبوعات تجارية' },
  { icon: Ruler, title: 'الطباعة كبيرة المقاس', text: 'بنرات، لوحات، مواد عرض وإعلانات خارجية مع تجهيز الملفات قبل التنفيذ.', subject: 'طلب عرض سعر — طباعة كبيرة المقاس' },
  { icon: Boxes, title: 'اللوحات والقص والتجهيز', text: 'تنفيذ مواد دعائية ولوحات وعناصر عرض بعد اعتماد المقاسات والخامات المناسبة.', subject: 'طلب عرض سعر — لوحات وتجهيز' },
  { icon: TentTree, title: 'المعارض والفعاليات', text: 'مواد الهوية للمعارض والمؤتمرات ونقاط العرض والفعاليات التجارية.', subject: 'طلب عرض سعر — معرض أو فعالية' },
];

export default function PrintPage() {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(243,19,37,.2),transparent_36%),#0b0d12] p-6 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.06] px-4 py-2 text-xs font-black text-red-300"><Printer size={15} /> BRAND BOX PRINT</div>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">من الفكرة والتصميم إلى ملف جاهز للتنفيذ</h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-gray-400 sm:text-base">هذه البوابة تربط خدمات التصميم داخل Brand Box بطلبات الطباعة والإنتاج. لا نعرض شراءً آليًا لخدمة لم يتم تسعيرها واعتمادها؛ يبدأ التنفيذ بطلب واضح ومراجعة المقاس والخامة والكمية.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contact?category=print&subject=%D8%B7%D9%84%D8%A8%20%D8%B9%D8%B1%D8%B6%20%D8%B3%D8%B9%D8%B1%20%D9%84%D9%84%D8%B7%D8%A8%D8%A7%D8%B9%D8%A9" className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-6 py-3.5 text-sm font-black transition hover:bg-[#ff2637]">طلب عرض سعر <ArrowLeft size={16} /></Link>
              <Link href="/projects/images" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-6 py-3.5 text-sm font-black text-gray-200 transition hover:border-[#f31325]/40"><ImageIcon size={17} /> تجهيز التصميم أولًا</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [Sparkles, 'تصميم مدعوم بالـAI', 'ابدأ من مشروع الصور ثم عد بطلب التنفيذ.'],
              [BadgeCheck, 'مراجعة قبل الإنتاج', 'المقاس والخامة والكمية تحدد قبل التنفيذ.'],
              [Store, 'طلب منظم', 'كل طلب طباعة يصل إلى نظام الدعم بحساب المستخدم.'],
              [Boxes, 'إنتاج متنوع', 'مواد مطبوعة ولوحات وتجهيزات عرض.'],
            ].map(([Icon, title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-[#11141a] p-5"><Icon className="text-[#ff3344]" size={21} /><h3 className="mt-4 text-sm font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></div>)}
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, text, subject }) => (
            <article key={title} className="flex flex-col rounded-3xl border border-white/10 bg-[#0d1016] p-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={23} /></span>
              <h2 className="mt-5 text-base font-black">{title}</h2>
              <p className="mt-2 flex-1 text-xs leading-6 text-gray-500">{text}</p>
              <Link href={`/contact?category=print&subject=${encodeURIComponent(subject)}`} className="mt-5 inline-flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-gray-300 transition hover:border-[#f31325]/45 hover:text-white"><span>ابدأ الطلب</span><ArrowLeft size={15} /></Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1016] p-6 sm:p-8">
          <h2 className="text-xl font-black">قبل إرسال طلب الطباعة</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {['حدد نوع المنتج والكمية', 'أرفق أو جهز التصميم', 'اذكر المقاس والخامة إن كانت معروفة', 'يراجع الفريق الطلب قبل التسعير والتنفيذ'].map((step, index) => <div key={step} className="rounded-2xl border border-white/[.07] bg-[#11141a] p-4"><div className="text-xs font-black text-[#ff3344]">0{index + 1}</div><p className="mt-2 text-xs leading-6 text-gray-400">{step}</p></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
