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
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="bb-dashboard-hero overflow-hidden rounded-[34px] border p-7 shadow-[var(--bb-shadow-md)] sm:p-10 lg:p-14">
          <div className="max-w-4xl">
            <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black"><Sparkles size={15} /> BRAND BOX</div>
            <h1 className="bb-text-primary mt-6 text-4xl font-black leading-tight sm:text-6xl">منصة عربية تجمع الإبداع، الذكاء الاصطناعي، والمشاريع في تجربة واحدة</h1>
            <p className="bb-text-secondary mt-6 max-w-3xl text-sm leading-8 sm:text-base">Brand Box ليست مجرد صفحة لتوليد صورة أو محادثة. الفكرة الأساسية هي أن كل أداة تعمل داخل مشروع، وكل مشروع يحتفظ بسياقه ومخرجاته، ثم يمكن الانتقال منه إلى التسويق، القوالب، المتجر أو خدمات الطباعة دون كسر سير العمل.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="bb-button-primary inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black">ابدأ من مشاريعي <ArrowLeft size={16} /></Link>
              <Link href="/pricing" className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-black">الباقات والرصيد</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => <article key={title} className="bb-card rounded-3xl border p-5"><span className="bb-accent-soft grid h-12 w-12 place-items-center rounded-xl border"><Icon size={23} /></span><h2 className="bb-text-primary mt-5 font-black">{title}</h2><p className="bb-text-tertiary mt-2 text-xs leading-6">{text}</p></article>)}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="bb-panel rounded-3xl border p-6 sm:p-8">
            <Boxes className="bb-text-accent" size={28} />
            <h2 className="bb-text-primary mt-5 text-2xl font-black">كيف صممنا التجربة؟</h2>
            <p className="bb-text-secondary mt-3 text-sm leading-8">الأولوية للمشروع لا للأداة. لذلك التنقل الأساسي هو: اختر أداة، اختر مشروعًا، ثم اعمل داخل Workspace. هذا يقلل التشتت ويحافظ على كل التوليدات والأصول مرتبطة بسياقها.</p>
          </div>
          <div className="bb-panel rounded-3xl border p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['01', 'ابدأ', 'اختر مشروعًا أو أنشئ واحدًا جديدًا.'],
                ['02', 'أنجز', 'استخدم الصور أو الشات أو الأدوات الأخرى داخل المشروع.'],
                ['03', 'نفّذ', 'انقل المخرج إلى قالب، حملة، متجر أو طلب طباعة عند الحاجة.'],
              ].map(([number, title, text]) => <div key={number} className="bb-card rounded-2xl border p-5"><div className="bb-text-accent text-xs font-black">{number}</div><h3 className="bb-text-primary mt-3 font-black">{title}</h3><p className="bb-text-tertiary mt-2 text-xs leading-6">{text}</p></div>)}
            </div>
            <Link href="/contact" className="bb-text-accent mt-5 inline-flex items-center gap-2 text-sm font-black">لديك استفسار؟ تواصل معنا <ArrowLeft size={15} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
