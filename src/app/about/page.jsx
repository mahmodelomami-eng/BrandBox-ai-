import Link from 'next/link';
import { ArrowLeft, Boxes, BrainCircuit, Layers3, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

const PILLARS = [
  { icon: BrainCircuit, title: 'ذكاء اصطناعي داخل المشاريع', text: 'الصور والشات والفيديو والصوت تُنظّم حول مشروع واضح بدل أدوات منفصلة بلا سياق.' },
  { icon: Layers3, title: 'تصميم وهوية وتسويق', text: 'القوالب والخطط التسويقية والهوية البصرية مرتبطة بمساحة العمل نفسها.' },
  { icon: Workflow, title: 'من الفكرة إلى التنفيذ', text: 'ابدأ بالفكرة، أنشئ المشروع، ولّد المحتوى ثم انتقل إلى خدمات التنفيذ والطباعة عند الحاجة.' },
  { icon: ShieldCheck, title: 'حسابات وصلاحيات وبيانات فعلية', text: 'المشاريع والرصيد والمشتريات والإدارة مبنية على Supabase وصلاحيات مستخدم واضحة.' },
];

export default function AboutPage() {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.19),transparent_38%),#0b0d12] p-7 sm:p-10 lg:p-14">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.06] px-4 py-2 text-xs font-black text-red-300"><Sparkles size={15} /> BRAND BOX</div>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">منصة عربية تجمع الإبداع، الذكاء الاصطناعي، والمشاريع في تجربة واحدة</h1>
            <p className="mt-6 max-w-3xl text-sm leading-8 text-gray-400 sm:text-base">Brand Box ليست مجرد صفحة لتوليد صورة أو محادثة. الفكرة الأساسية هي أن كل أداة تعمل داخل مشروع، وكل مشروع يحتفظ بسياقه ومخرجاته، ثم يمكن الانتقال منه إلى التسويق، القوالب، المتجر أو خدمات الطباعة دون كسر سير العمل.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-6 py-3.5 text-sm font-black transition hover:bg-[#ff2637]">ابدأ من مشاريعي <ArrowLeft size={16} /></Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-6 py-3.5 text-sm font-black text-gray-200 transition hover:border-[#f31325]/40">الباقات والرصيد</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={23} /></span><h2 className="mt-5 font-black">{title}</h2><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></article>)}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-6 sm:p-8">
            <Boxes className="text-[#ff3344]" size={28} />
            <h2 className="mt-5 text-2xl font-black">كيف صممنا التجربة؟</h2>
            <p className="mt-3 text-sm leading-8 text-gray-500">الأولوية للمشروع لا للأداة. لذلك التنقل الأساسي هو: اختر أداة، اختر مشروعًا، ثم اعمل داخل Workspace. هذا يقلل التشتت ويحافظ على كل التوليدات والأصول مرتبطة بسياقها.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['01', 'ابدأ', 'اختر مشروعًا أو أنشئ واحدًا جديدًا.'],
                ['02', 'أنجز', 'استخدم الصور أو الشات أو الأدوات الأخرى داخل المشروع.'],
                ['03', 'نفّذ', 'انقل المخرج إلى قالب، حملة، متجر أو طلب طباعة عند الحاجة.'],
              ].map(([number, title, text]) => <div key={number} className="rounded-2xl border border-white/[.07] bg-[#11141a] p-5"><div className="text-xs font-black text-[#ff3344]">{number}</div><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></div>)}
            </div>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#ff6674]">لديك استفسار؟ تواصل معنا <ArrowLeft size={15} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
