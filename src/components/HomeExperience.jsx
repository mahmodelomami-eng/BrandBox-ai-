'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  Globe2,
  ImageIcon,
  MessageSquareText,
  Play,
  Sparkles,
  Video,
} from 'lucide-react';
import MarketingDashboardPreview from './MarketingDashboardPreview';
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

function ChatPreview() {
  return (
    <div className="space-y-2 p-4 text-[10px] leading-5 sm:text-[11px]">
      <div className="bb-accent-soft mr-auto max-w-[88%] rounded-2xl rounded-bl-md border px-3 py-2.5">ساعدني في كتابة منشور تسويقي لمنتج عناية بالبشرة يستهدف النساء.</div>
      <div className="bb-surface-1 bb-text-secondary ml-auto max-w-[88%] rounded-2xl rounded-br-md border bb-border-subtle px-3 py-2.5">بكل سرور! إليك نصًا تسويقيًا جذابًا وجاهزًا للنشر.</div>
    </div>
  );
}

function VideoPreview() {
  return (
    <div className="p-3">
      <div className="bb-media-canvas relative h-28 overflow-hidden rounded-xl">
        <Image src="/brandbox-dashboard-preview.jpg" alt="معاينة فيديو AI" fill unoptimized className="object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f31325] text-white shadow-xl"><Play size={20} fill="currentColor" /></span></span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="bb-text-disabled text-[8px]">00:00</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bb-border-subtle)]"><div className="h-full w-[48%] rounded-full bg-[var(--bb-accent)]" /></div>
        <span className="bb-text-disabled text-[8px]">00:30</span>
      </div>
    </div>
  );
}

function ImagesPreview() {
  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {[
        ['/brandbox-dashboard-preview.jpg', 'تصميم AI 1', 'object-left'],
        ['/brandbox-login-visual.jpg', 'تصميم AI 2', 'object-center'],
        ['/brandbox-login-visual.jpg', 'تصميم AI 3', 'object-right'],
        ['/brandbox-dashboard-preview.jpg', 'تصميم AI 4', 'object-center'],
      ].map(([src, alt, position]) => (
        <div key={alt} className="relative h-16 overflow-hidden rounded-lg border bb-border-subtle">
          <Image src={src} alt={alt} fill unoptimized className={`object-cover ${position}`} />
        </div>
      ))}
    </div>
  );
}

const toolCards = [
  { title: 'شات AI', href: '/projects/chat', icon: MessageSquareText, Preview: ChatPreview, action: 'ابدأ المحادثة' },
  { title: 'فيديو AI', href: '/projects/video', icon: Video, Preview: VideoPreview, action: 'أنشئ فيديو الآن' },
  { title: 'صورة AI', href: '/projects/images', icon: ImageIcon, Preview: ImagesPreview, action: 'أنشئ صورة الآن' },
];

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
    <main dir="rtl" className="bb-app-canvas relative min-h-screen overflow-hidden selection:bg-[#f31325] selection:text-white">
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#f31325]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-6 left-8 h-28 w-28 opacity-30" style={{ backgroundImage: 'radial-gradient(var(--bb-accent) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

      <div className="relative mx-auto max-w-[1580px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="bb-panel mb-5 flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-[var(--bb-shadow-sm)]">
          <Gift size={17} className="bb-text-accent shrink-0" />
          <button type="button" onClick={() => openManagedLink(ticker.link_url)} className="bb-text-secondary min-w-0 flex-1 truncate text-right text-xs font-bold sm:text-sm">
            {ticker.text}
          </button>
          {ticker.link_url && <button type="button" onClick={() => openManagedLink(ticker.link_url)} className="bb-button-secondary hidden rounded-xl border px-3 py-2 text-[10px] font-black sm:block">اكتشف العرض</button>}
        </div>

        <section dir="ltr" className="grid items-center gap-8 xl:grid-cols-[.88fr_1.12fr] xl:gap-10">
          <div dir="rtl" className="px-1 py-8 text-center xl:text-right">
            <div className="bb-accent-soft mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black xl:mx-0"><Sparkles size={15} /> منصة الإبداع المدعومة بالذكاء الاصطناعي</div>
            <h1 className="bb-text-primary mt-8 text-[44px] font-black leading-[1.18] sm:text-6xl xl:text-[64px]">
              إبداعك بلا حدود.<br />
              <span className="bb-text-accent">تجربتك متكاملة.</span>
            </h1>
            <p className="bb-text-secondary mx-auto mt-6 max-w-xl text-sm leading-8 sm:text-base xl:mx-0">اصنع تصاميم احترافية، وطوّر هوية علامتك، وحوّل أفكارك إلى محتوى مميز من مكان واحد.</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 xl:justify-start">
              <button type="button" onClick={() => openProtected('/projects/images')} className="bb-button-secondary min-w-36 rounded-2xl border px-6 py-4 text-sm font-black">ابدأ الإبداع</button>
              <button type="button" onClick={() => openProtected('/projects')} className="bb-button-primary flex min-w-40 items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black shadow-[0_18px_45px_rgba(243,19,37,.2)]">
                {session?.user ? 'مشاريعي' : 'استكشف Brand Box'} <Sparkles size={16} />
              </button>
            </div>

            <div className="bb-text-tertiary mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] xl:justify-start">
              <span className="flex items-center gap-1.5"><Gift size={13} /> 50 نقطة مجانية</span>
              <span className="flex items-center gap-1.5"><CreditCard size={13} /> بدون بطاقة دفع</span>
              <span className="flex items-center gap-1.5"><Globe2 size={13} /> واجهة عربية</span>
            </div>
          </div>

          <div dir="rtl" className="min-w-0">
            <div className="relative">
              <MarketingDashboardPreview />

              <div className="bb-surface-elevated absolute bottom-4 right-4 hidden max-w-[260px] rounded-2xl border bb-border p-3 shadow-[var(--bb-shadow-md)] lg:block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="bb-text-accent text-[9px] font-black">إعلانات وعروض</div>
                    <div className="bb-text-primary mt-1 truncate text-xs font-black">{slide.title}</div>
                    <div className="bb-text-tertiary mt-1 line-clamp-2 text-[9px] leading-4">{slide.subtitle}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setIndex((index - 1 + banners.length) % banners.length)} className="bb-button-secondary grid h-7 w-7 place-items-center rounded-lg border" aria-label="العرض السابق"><ChevronRight size={13} /></button>
                    <button type="button" onClick={() => setIndex((index + 1) % banners.length)} className="bb-button-secondary grid h-7 w-7 place-items-center rounded-lg border" aria-label="العرض التالي"><ChevronLeft size={13} /></button>
                  </div>
                </div>
                {slide.link_url && <button type="button" onClick={() => openManagedLink(slide.link_url)} className="bb-text-accent mt-2 inline-flex items-center gap-1 text-[9px] font-black">فتح العرض <ArrowLeft size={11} /></button>}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {toolCards.map(({ title, href, icon: Icon, Preview, action }) => (
                <button key={href} type="button" onClick={() => openProtected(href)} className="bb-card group overflow-hidden rounded-[22px] border text-right transition hover:-translate-y-1">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="bb-text-primary flex items-center gap-2 text-sm font-black"><Icon size={17} className="bb-text-accent" /> {title}</div>
                  </div>
                  <Preview />
                  <div className="bb-text-accent flex items-center gap-1 px-4 pb-4 text-[10px] font-black">{action} <ArrowLeft size={12} /></div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
