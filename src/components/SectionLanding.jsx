import Link from 'next/link';

export default function SectionLanding({ eyebrow, title, description, actionHref = '/', actionLabel = 'العودة للرئيسية' }) {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050506] px-5 py-20 text-white">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.16),transparent_42%),#090a0d] px-6 py-16 sm:px-10 lg:px-16">
        <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-bold text-red-300">{eyebrow}</div>
        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">{description}</p>
        <Link href={actionHref} className="mt-8 inline-flex rounded-xl bg-[#f31325] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#ff2637]">{actionLabel}</Link>
      </section>
    </main>
  );
}
