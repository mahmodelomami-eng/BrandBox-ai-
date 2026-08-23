'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Gift, ImageIcon, MessageSquareText, Play, Sparkles, Video } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const fallbackBanners = [
  {
    id: 'welcome',
    title: 'إعلانات وعروض Brand Box',
    subtitle: 'مساحة متجددة للعروض، الخصومات والمسابقات',
    media_url: '/brandbox-dashboard-preview.jpg',
    media_type: 'image',
    duration_seconds: 7,
    link_url: '/pricing',
  },
  {
    id: 'creative',
    title: 'حوّل فكرتك إلى تصميم',
    subtitle: 'جرّب أدوات الصور والفيديو والشات بالذكاء الاصطناعي',
    media_url: '/brandbox-login-visual.jpg',
    media_type: 'image',
    duration_seconds: 7,
    link_url: '/projects/images',
  },
];

const fallbackTickers = [
  {
    id: 'default',
    text: 'خصومات ومسابقات وجوائز Brand Box • تابع أحدث العروض الحصرية',
    link_url: '/pricing',
    duration_seconds: 8,
  },
];

const tools = [
  {
    title: 'توليد الصور AI',
    desc: 'بوسترات، منتجات، حملات ومشاهد إبداعية',
    href: '/projects/images',
    icon: ImageIcon,
    tag: 'صور',
    preview: 'images',
  },
  {
    title: 'توليد الفيديو AI',
    desc: 'حوّل الأفكار والصور إلى فيديو جذاب',
    href: '/projects/video',
    icon: Video,
    tag: 'فيديو',
    preview: 'video',
  },
  {
    title: 'شات AI',
    desc: 'مساعدك للأفكار والمحتوى والتخطيط',
    href: '/projects/chat',
    icon: MessageSquareText,
    tag: 'محتوى',
    preview: 'chat',
  },
];

function ToolPreview({ type }) {
  if (type === 'images') {
    return (
      <div className="absolute inset-0 grid grid-cols-3 gap-1.5 p-3">
        <div className="relative col-span-2 row-span-2 overflow-hidden rounded-xl border border-white/10">
          <Image src="/brandbox-dashboard-preview.jpg" alt="مثال تصميم AI" fill className="object-cover transition duration-700 group-hover:scale-105" unoptimized />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <Image src="/brandbox-login-visual.jpg" alt="مثال تصميم AI" fill className="object-cover transition duration-700 group-hover:scale-110" unoptimized />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <Image src="/brandbox-dashboard-preview.jpg" alt="مثال تصميم AI" fill className="object-cover object-right transition duration-700 group-hover:scale-110" unoptimized />
        </div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="absolute inset-0 p-3">
        <div className="relative h-full overflow-hidden rounded-xl border border-white/10">
          <Image src="/brandbox-dashboard-preview.jpg" alt="مثال فيديو AI" fill className="object-cover opacity-80 transition duration-700 group-hover:scale-105" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-[#f31325]/90 shadow-2xl transition group-hover:scale-110">
              <Play size={22} fill="currentColor" />
            </span>
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-black">مشهد إعلاني مولّد بالذكاء الاصطناعي</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2 p-4 text-[10px] leading-5">
      <div className="mr-auto max-w-[82%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.06] px-3 py-2 text-gray-300">اكتب لي فكرة حملة إعلانية لعلامة قهوة جديدة.</div>
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm border border-[#f31325]/30 bg-[#f31325]/10 px-3 py-2 text-gray-100">سأبني لك الفكرة، الرسالة، الجمهور، ونصوص الإعلانات في خطة واحدة.</div>
      <div className="mr-auto max-w-[72%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.06] px-3 py-2 text-gray-400">واجعل الأسلوب عصريًا ومناسبًا للسوق الليبي.</div>
    </div>
  );
}

export default function HomeExperience() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [banners, setBanners] = useState(fallbackBanners);
  const [index, setIndex] = useState(0);
  const [tickers, setTickers] = useState(fallbackTickers);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);

      const now = new Date().toISOString();
      const [{ data: slides }, { data: tickerRows }] = await Promise.all([
        supabase.from('home_banners').select('*').eq('is_active', true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order('sort_order').order('created_at'),
        supabase.from('home_tickers').select('*').eq('is_active', true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order('sort_order').order('created_at'),
      ]);

      if (mounted && slides?.length) setBanners(slides);
      if (mounted && tickerRows?.length) setTickers(tickerRows);
    }

    void boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const seconds = Math.max(3, Number(banners[index]?.duration_seconds) || 7);
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % banners.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [banners, index]);

  useEffect(() => {
    if (tickers.length < 2) return undefined;
    const seconds = Math.max(3, Number(tickers[tickerIndex]?.duration_seconds) || 8);
    const timer = window.setTimeout(() => setTickerIndex((value) => (value + 1) % tickers.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [tickers, tickerIndex]);

  const openProtected = (href) => {
    router.push(session?.user ? href : `/auth?next=${encodeURIComponent(href)}`);
  };

  const openManagedLink = (href) => {
    if (!href) return;
    const protectedProjectRoute = href === '/projects' || href.startsWith('/projects/');
    if (protectedProjectRoute && !session?.user) {
      router.push(`/auth?next=${encodeURIComponent(href)}`);
      return;
    }
    router.push(href);
  };

  const slide = banners[index] || fallbackBanners[0];
  const ticker = tickers[tickerIndex] || fallbackTickers[0];

  return (
    <main dir="rtl" className="min-h-screen bg-[#050506] text-white selection:bg-[#f31325]">
      <div className="overflow-hidden bg-[#f31325] text-white">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4 text-xs font-black sm:text-sm">
          <Gift size={17} className="shrink-0" />
          <button type="button" onClick={() => openManagedLink(ticker.link_url)} className="relative flex-1 overflow-hidden whitespace-nowrap text-right">
            <span key={ticker.id} className="inline-block">{ticker.text}</span>
          </button>
          {ticker.link_url && (
            <button type="button" onClick={() => openManagedLink(ticker.link_url)} className="rounded-full bg-white px-4 py-1.5 text-[11px] text-[#c50f1d]">اكتشف العرض</button>
          )}
        </div>
      </div>

      <section className="mx-auto grid max-w-[1600px] gap-0 border-x border-white/[.06] lg:grid-cols-[1.05fr_.95fr]">
        <div className="order-2 border-t border-white/[.06] p-4 sm:p-7 lg:order-1 lg:border-l lg:border-t-0">
          <div className="group relative h-[280px] overflow-hidden rounded-[26px] border border-[#f31325]/45 bg-[#0a0a0c] sm:h-[340px]">
            {slide.media_type === 'video' ? (
              <video key={slide.media_url} src={slide.media_url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-55" />
            ) : (
              <img key={slide.media_url} src={slide.media_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-[1.02]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <button type="button" onClick={() => openManagedLink(slide.link_url)} className="absolute inset-x-0 bottom-0 z-10 p-6 text-right sm:p-8">
              <div className="mb-2 text-xs font-black text-red-300">إعلانات وعروض</div>
              <h2 className="text-3xl font-black sm:text-4xl">{slide.title}</h2>
              <p className="mt-2 max-w-xl text-sm text-gray-300">{slide.subtitle}</p>
            </button>

            {banners.length > 1 && (
              <>
                <button type="button" onClick={(event) => { event.stopPropagation(); setIndex((index - 1 + banners.length) % banners.length); }} className="absolute right-4 top-1/2 z-20 rounded-full bg-black/70 p-2" aria-label="البنر السابق"><ChevronRight /></button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setIndex((index + 1) % banners.length); }} className="absolute left-4 top-1/2 z-20 rounded-full bg-black/70 p-2" aria-label="البنر التالي"><ChevronLeft /></button>
              </>
            )}

            <div className="absolute bottom-4 left-5 z-20 flex gap-1.5">
              {banners.map((item, bannerIndex) => (
                <button key={item.id} type="button" onClick={() => setIndex(bannerIndex)} className={`h-1.5 rounded-full transition-all ${bannerIndex === index ? 'w-7 bg-[#f31325]' : 'w-2 bg-white/40'}`} aria-label={`بنر ${bannerIndex + 1}`} />
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tools.map((tool) => (
              <button key={tool.href} type="button" onClick={() => openProtected(tool.href)} className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0f13] text-right transition hover:-translate-y-1 hover:border-[#f31325]/55">
                <div className="relative h-40 overflow-hidden bg-[#111318]">
                  <ToolPreview type={tool.preview} />
                  <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-black">{tool.tag}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2"><tool.icon size={17} className="text-[#ff3344]" /><h3 className="font-black">{tool.title}</h3></div>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500">{tool.desc}</p>
                  <div className="mt-3 text-[11px] font-black text-[#ff3344]">{session?.user ? 'عرض المشاريع ←' : 'سجّل الدخول للمتابعة ←'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 relative flex min-h-[520px] items-center overflow-hidden p-7 sm:p-12 lg:order-2 lg:min-h-[720px] lg:p-16">
          <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-[#f31325]/10 blur-3xl" />
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.06] px-4 py-2 text-xs font-black text-red-300"><Sparkles size={15} /> منصة الإبداع المدعومة بالذكاء الاصطناعي</div>
            <h1 className="mt-8 text-5xl font-black leading-[1.22] sm:text-6xl">إبداعك بلا حدود.<br /><span className="text-[#f31325]">تجربتك متكاملة.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-gray-400">اصنع تصاميم احترافية، وطوّر هوية علامتك، وحوّل أفكارك إلى محتوى مميز من مكان واحد.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {session?.user ? (
                <>
                  <button type="button" onClick={() => router.push('/projects')} className="rounded-2xl bg-[#f31325] px-7 py-4 text-sm font-black shadow-[0_18px_50px_rgba(243,19,37,.25)]">مشاريعي</button>
                  <button type="button" onClick={() => router.push('/projects/images')} className="rounded-2xl border border-white/15 px-7 py-4 text-sm font-black transition hover:border-[#f31325]/45">ابدأ الإبداع</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => router.push('/auth?next=%2Fdashboard')} className="rounded-2xl bg-[#f31325] px-7 py-4 text-sm font-black shadow-[0_18px_50px_rgba(243,19,37,.25)]">ابدأ مجانًا ←</button>
                  <button type="button" onClick={() => router.push('/auth?next=%2Fdashboard')} className="rounded-2xl border border-white/15 px-7 py-4 text-sm font-black transition hover:border-[#f31325]/45">لدي حساب بالفعل</button>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-[11px] text-gray-500"><span>◉ 50 نقطة مجانية</span><span>◉ بدون بطاقة دفع</span><span>◉ واجهة عربية</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
