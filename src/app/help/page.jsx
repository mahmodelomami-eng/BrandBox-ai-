import Link from 'next/link';
import { ArrowLeft, CalendarClock, Coins, Gift, RefreshCcw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

export const metadata = {
  title: 'دليل الاستخدام | Brand Box AI',
  description: 'شرح Credit والباقات والترحيل وتكلفة أدوات Brand Box AI.',
};

const Card = ({ icon: Icon, title, children }) => (
  <article className="rounded-[24px] border border-white/10 bg-[#10131a] p-6">
    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/[.08] text-amber-300"><Icon size={21} /></span>
    <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
    <div className="mt-3 text-sm leading-7 text-gray-400">{children}</div>
  </article>
);

export default function HelpPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] px-4 pb-20 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.12),transparent_34%),#0d1018] p-6 sm:p-10">
          <div className="text-xs font-black tracking-widest text-amber-300">BRAND BOX GUIDE</div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">كيف تعمل الباقات وCredit؟</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-gray-400">هذه الصفحة هي المرجع المختصر والواضح قبل الاشتراك أو تشغيل أي أداة. نعرض ما تحصل عليه، وما الذي ينتهي، وما الذي يترحل، وكيف يُخصم Credit.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-xs font-black">عرض الباقات <ArrowLeft size={15} /></Link>
            <Link href="/terms" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black text-gray-200">شروط الاستخدام <ShieldCheck size={15} /></Link>
          </div>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card icon={Coins} title="Credit هو رصيد الاستخدام">
            <p>كل أداة AI لها تكلفة Credit تختلف حسب النموذج والإعدادات. Credit ليس عملة نقدية ولا يمكن سحبه خارج Brand Box.</p>
          </Card>
          <Card icon={WalletCards} title="الاشتراك ليس هو الرصيد">
            <p>الاشتراك يمنحك مزايا الخطة لمدة الدورة الشهرية إضافة إلى كمية Credit. إذا نفد Credit تبقى الخطة فعالة ويمكنك شراء Top-up.</p>
          </Card>
          <Card icon={RefreshCcw} title="الترحيل لدورة واحدة">
            <p>في الخطط المدفوعة يترحل Credit الشهري غير المستخدم إلى الدورة التالية فقط، وبحد أقصى 100% من مخصص الخطة الجديدة. الرصيد المرحل لا يترحل مرة ثانية.</p>
          </Card>
          <Card icon={CalendarClock} title="مهلة تجديد 7 أيام">
            <p>بعد نهاية الدورة يتوقف Credit الشهري عن الاستهلاك. نحتفظ بالمبلغ المتبقي مؤقتًا لمدة تصل إلى 7 أيام لاستعادته كترحيل إذا تم التجديد خلال المهلة.</p>
          </Card>
          <Card icon={Gift} title="الهدايا واضحة ومحدودة">
            <p>أي Bonus يظهر قبل الدفع مع تاريخ انتهاء واضح. الحد النظامي للهدايا لا يتجاوز 20% من Credit المدفوع، ويمكن أن تكون العروض الفعلية أقل من ذلك.</p>
          </Card>
          <Card icon={Sparkles} title="فشل التوليد لا يعني خسارة الرصيد">
            <p>إذا فشلت العملية بسبب خطأ مؤكد من مزود AI أو نظام التنفيذ، تعيد المنصة Credit المحجوز للعملية تلقائيًا وتوثق العملية في السجل.</p>
          </Card>
        </section>

        <section className="mt-7 rounded-[26px] border border-white/10 bg-[#0d1018] p-6 sm:p-8">
          <h2 className="text-xl font-black">مثال بسيط على الترحيل</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ['بداية الشهر', '100 Credit'],
              ['المستخدم استهلك', '70 Credit'],
              ['المتبقي', '30 Credit'],
              ['عند التجديد', '100 + 30 = 130 Credit'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/[.08] bg-[#10131a] p-4">
                <div className="text-[11px] text-gray-500">{label}</div>
                <div className="mt-2 text-base font-black text-amber-200">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-gray-500">إذا بقي جزء من الـ30 Credit المرحّلة عند نهاية الشهر الثاني، لا تنتقل مرة ثالثة. أما Credit الذي اشتريته كرصيد إضافي مستقل فلا يختفي بسبب انتهاء الاشتراك.</p>
        </section>

        <section className="mt-7 rounded-[26px] border border-white/10 bg-[#0d1018] p-6 sm:p-8">
          <h2 className="text-xl font-black">ترتيب استهلاك الرصيد</h2>
          <ol className="mt-5 grid gap-3 text-sm leading-7 text-gray-300 md:grid-cols-4">
            <li className="rounded-2xl border border-white/[.08] bg-[#10131a] p-4"><strong className="text-amber-300">1.</strong> Credit الأقرب للانتهاء.</li>
            <li className="rounded-2xl border border-white/[.08] bg-[#10131a] p-4"><strong className="text-amber-300">2.</strong> الرصيد المرحل والهدايا حسب تاريخ الصلاحية.</li>
            <li className="rounded-2xl border border-white/[.08] bg-[#10131a] p-4"><strong className="text-amber-300">3.</strong> Credit الدورة الشهرية الحالية.</li>
            <li className="rounded-2xl border border-white/[.08] bg-[#10131a] p-4"><strong className="text-amber-300">4.</strong> Credit المشتَرى غير المنتهي أخيرًا.</li>
          </ol>
        </section>

        <section className="mt-7 rounded-[26px] border border-[#f31325]/20 bg-[#f31325]/[.035] p-6 sm:p-8">
          <h2 className="text-xl font-black">قبل كل عملية AI</h2>
          <p className="mt-3 text-sm leading-8 text-gray-300">ستعرض الأداة تكلفة العملية بالـCredit قبل التنفيذ قدر الإمكان. في الخدمات ذات التكلفة المتغيرة، نحسب حجزًا آمنًا ثم نسجل التكلفة الفعلية التي أعادها مزود الخدمة. أسعار النماذج قد تتغير، لذلك المرجع هو السعر الظاهر داخل الأداة وقت تنفيذ العملية.</p>
        </section>
      </div>
    </main>
  );
}
