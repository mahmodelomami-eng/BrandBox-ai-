import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BrainCircuit,
  Lightbulb,
  LockKeyhole,
  Palette,
  Rocket,
  Sparkles,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import MarketingDashboardPreview from '../../components/MarketingDashboardPreview';

const PILLARS = [
  {
    icon: BrainCircuit,
    title: 'الذكاء الاصطناعي داخل المشاريع',
    text: 'أدوات ذكية تساعدك على توليد الأفكار، والكتابة، والتصميم والتحليل داخل مشروعك.',
  },
  {
    icon: Palette,
    title: 'التصميم والهوية',
    text: 'أنشئ هوية بصرية متكاملة لعلامتك التجارية بسهولة واحترافية داخل المنصة.',
  },
  {
    icon: Rocket,
    title: 'من الفكرة إلى التنفيذ',
    text: 'حوّل أفكارك إلى مشاريع قابلة للتنفيذ بخطوات واضحة من التخطيط حتى الإطلاق.',
  },
  {
    icon: LockKeyhole,
    title: 'أمان وخصوصية بياناتك',
    text: 'نولي حماية بياناتك أولوية مع صلاحيات واضحة وتجربة حساب موحدة وآمنة.',
  },
];

const STEPS = [
  {
    number: '01',
    icon: Lightbulb,
    title: 'ابدأ بفكرتك',
    text: 'سجّل دخولك، وأضف مشروعًا جديدًا، وحدد أهدافك والأدوات التي تحتاجها.',
  },
  {
    number: '02',
    icon: WandSparkles,
    title: 'أنشئ وابتكر',
    text: 'استخدم أدوات الذكاء الاصطناعي والقوالب والمصادر لبناء المحتوى والهوية.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'نفّذ وانطلق',
    text: 'راجع مشروعك، نظّم مخرجاتك، ثم انتقل إلى التنفيذ والطباعة أو الإطلاق بثقة.',
  },
];

export default function AboutPage() {
  return (
    <main dir="rtl" className="bb-app-canvas relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-[#f31325]/10 blur-[105px]" />
      <div className="pointer-events-none absolute bottom-20 right-6 h-28 w-28 opacity-25" style={{ backgroundImage: 'radial-gradient(var(--bb-accent) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

      <div className="relative mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <section dir="ltr" className="grid items-center gap-9 lg:grid-cols-[1.02fr_.98fr] xl:gap-14">
          <div dir="rtl" className="min-w-0">
            <MarketingDashboardPreview compact />
          </div>

          <div dir="rtl" className="text-center lg:text-right">
            <div className="bb-accent-soft mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black lg:mx-0"><Sparkles size={15} /> منصة الإبداع المدعومة بالذكاء الاصطناعي</div>
            <h1 className="bb-text-primary mt-6 text-5xl font-black leading-tight sm:text-6xl">من نحن</h1>
            <h2 className="bb-text-primary mt-4 text-xl font-black leading-9 sm:text-2xl">منصة عربية تجمع <span className="bb-text-accent">الإبداع والذكاء الاصطناعي</span> في تجربة واحدة.</h2>
            <p className="bb-text-secondary mx-auto mt-5 max-w-2xl text-sm leading-8 lg:mx-0">Brand Box يجمع بين المشاريع، وأدوات الذكاء الاصطناعي، والقوالب الجاهزة، وهوية العلامة التجارية، وخدمات التنفيذ الاحترافية في مساحة عمل واحدة سهلة وآمنة.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/projects" className="bb-button-primary inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-black shadow-[0_18px_45px_rgba(243,19,37,.18)]">ابدأ الآن <Sparkles size={15} /></Link>
              <Link href="/" className="bb-button-secondary inline-flex items-center gap-2 rounded-2xl border px-7 py-4 text-sm font-black">استكشف المنصة</Link>
              <Link href="/pricing" className="bb-text-accent inline-flex items-center gap-2 rounded-2xl px-4 py-4 text-sm font-black">الباقات والأسعار <ArrowLeft size={14} /></Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bb-card group rounded-2xl border p-5 transition hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <span className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-xl border"><Icon size={21} /></span>
                <div>
                  <h3 className="bb-text-primary text-sm font-black">{title}</h3>
                  <p className="bb-text-tertiary mt-2 text-xs leading-6">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-9">
          <div className="text-center">
            <div className="bb-text-accent mb-2 flex items-center justify-center gap-3 text-xs font-black"><Sparkles size={14} /> كيف تعمل المنصة؟ <Sparkles size={14} /></div>
            <h2 className="bb-text-primary text-3xl font-black">ثلاث خطوات من الفكرة إلى مشروع ناجح</h2>
            <p className="bb-text-tertiary mt-2 text-sm">مسار واضح يبقي أدواتك ومخرجاتك داخل سياق مشروع واحد.</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {STEPS.map(({ number, icon: Icon, title, text }, stepIndex) => (
              <article key={number} className="bb-card relative rounded-2xl border p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-xl border"><Icon size={21} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="bb-text-primary font-black">{title}</h3>
                      <span className="bb-text-accent text-2xl font-black">{number}</span>
                    </div>
                    <p className="bb-text-secondary mt-2 text-xs leading-6">{text}</p>
                  </div>
                </div>
                {stepIndex < STEPS.length - 1 && <span className="bb-text-disabled absolute -left-5 top-1/2 hidden -translate-y-1/2 text-3xl lg:block">←</span>}
              </article>
            ))}
          </div>
        </section>

        <section dir="ltr" className="bb-panel mt-8 grid overflow-hidden rounded-[28px] border lg:grid-cols-[.8fr_1.2fr]">
          <div className="relative min-h-64 overflow-hidden bg-[linear-gradient(135deg,var(--bb-surface-1),var(--bb-surface-2))] p-6 sm:p-8">
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#f31325]/10 blur-3xl" />
            <div className="relative mx-auto flex h-full max-w-md items-end justify-center">
              <div className="bb-surface-2 relative w-full rounded-[22px] border bb-border p-4 shadow-[var(--bb-shadow-md)]">
                <div className="bb-surface-1 mx-auto grid aspect-[16/9] max-w-[340px] place-items-center overflow-hidden rounded-xl border bb-border-subtle">
                  <div className="text-center">
                    <Image src="/brandbox-logo.png" alt="Brand Box" width={58} height={58} className="mx-auto h-14 w-14 object-contain" />
                    <div className="bb-text-primary mt-2 text-lg font-black">Brand <span className="bb-text-accent">Box</span></div>
                  </div>
                </div>
                <div className="mx-auto mt-3 h-2 w-24 rounded-full bg-[var(--bb-border)]" />
              </div>
            </div>
          </div>

          <div dir="rtl" className="p-6 sm:p-9 lg:p-10">
            <div className="bb-accent-soft inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black">قصتنا</div>
            <h2 className="bb-text-primary mt-4 text-3xl font-black">بكل فكرة، نصنع فرقًا.</h2>
            <p className="bb-text-secondary mt-4 text-sm leading-8">Brand Box وُلد من شغفنا بالإبداع وحاجتنا إلى منصة عربية تجمع كل ما يحتاجه المبدع ورواد الأعمال في مكان واحد. نهدف إلى تمكينك من تحويل أفكارك إلى مشاريع ذات أثر، بأسهل الطرق وأذكى الأدوات.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/contact" className="bb-button-secondary inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-black">تواصل معنا <ArrowLeft size={15} /></Link>
              <span className="bb-text-tertiary flex items-center gap-2 text-xs"><Workflow size={15} className="bb-text-accent" /> مشروعك وسياقه ومخرجاته في مساحة واحدة.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
