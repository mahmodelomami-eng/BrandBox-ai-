'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Gift, ImageIcon, LogIn, MessageSquareText, Play, Sparkles, UserPlus, Video } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const fallbackBanners = [
  { id: 'welcome', title: 'إعلانات وعروض Brand Box', subtitle: 'مساحة متجددة للعروض، الخصومات والمسابقات', media_url: '/brandbox-dashboard-preview.jpg', media_type: 'image', duration_seconds: 7, link_url: '/pricing' },
  { id: 'creative', title: 'حوّل فكرتك إلى تصميم', subtitle: 'جرّب أدوات الصور والفيديو والشات بالذكاء الاصطناعي', media_url: '/brandbox-login-visual.jpg', media_type: 'image', duration_seconds: 7, link_url: '/images-ai' },
];

const tools = [
  { title: 'توليد الصور AI', desc: 'بوسترات، منتجات، حملات ومشاهد إبداعية', href: '/images-ai', icon: ImageIcon, tag: 'صور' },
  { title: 'توليد الفيديو AI', desc: 'حوّل الأفكار والصور إلى فيديو جذاب', href: '/video-ai', icon: Video, tag: 'فيديو' },
  { title: 'شات AI', desc: 'مساعدك للأفكار والمحتوى والتخطيط', href: '/chat-ai', icon: MessageSquareText, tag: 'محتوى' },
];

const nav = [
  ['الرئيسية', '/'], ['الصور AI', '/images-ai'], ['الفيديو AI', '/video-ai'], ['شات AI', '/chat-ai'], ['القوالب', '/templates'], ['خطط تسويقية', '/marketing-plans'], ['الأسعار', '/pricing'], ['المتجر', '/store'], ['المطبعة', '/print'], ['من نحن', '/about'], ['اتصل بنا', '/contact'],
];

export default function HomeExperience() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [banners, setBanners] = useState(fallbackBanners);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) {
        const { data: p } = await supabase.from('profiles').select('first_name,last_name,avatar_url,role').eq('id', data.session.user.id).maybeSingle();
        if (mounted) setProfile(p || null);
      }
      const { data: slides } = await supabase.from('home_banners').select('*').eq('is_active', true).order('sort_order').order('created_at');
      if (mounted && slides?.length) setBanners(slides);
    }
    boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (banners.length < 2) return;
    const seconds = Math.max(3, Number(banners[index]?.duration_seconds) || 7);
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % banners.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [banners, index]);

  const openTool = (href) => {
    window.location.href = session?.user ? href : `/auth?next=${encodeURIComponent(href)}`;
  };
  const slide = banners[index] || fallbackBanners[0];
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'حسابي';

  return (
    <main dir="rtl" className="min-h-screen bg-[#050506] text-white selection:bg-[#f31325]">
      <div className="overflow-hidden bg-[#f31325] text-white">
        <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-3 px-4 text-xs font-black sm:text-sm">
          <Gift size={17} className="shrink-0" />
          <div className="relative flex-1 overflow-hidden whitespace-nowrap"><div className="animate-pulse">خصومات ومسابقات وجوائز Brand Box • تابع أحدث العروض الحصرية • عروض جديدة تظهر هنا مباشرة من الإدارة</div></div>
          <a href="/pricing" className="rounded-full bg-white px-4 py-1.5 text-[11px] text-[#c50f1d]">اكتشف العروض</a>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050506]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-5 px-4 lg:px-7">
          <a href="/" className="relative h-12 w-40 shrink-0"><Image src="/brandbox-logo.png" alt="Brand Box" fill className="object-contain object-right" unoptimized /></a>
          <nav className="hidden flex-1 items-center justify-center gap-5 xl:flex">{nav.map(([label, href], i) => <a key={href} href={href} className={`whitespace-nowrap text-[13px] font-bold transition hover:text-[#ff2637] ${i === 0 ? 'text-[#ff2637]' : 'text-gray-300'}`}>{label}</a>)}</nav>
          <div className="mr-auto flex shrink-0 items-center gap-2">
            {!session?.user ? <>
              <a href="/auth?next=%2F" className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black hover:border-[#f31325]"><LogIn size={16} /> تسجيل الدخول</a>
              <a href="/auth?next=%2F" className="hidden items-center gap-2 rounded-xl bg-[#f31325] px-4 py-2.5 text-xs font-black sm:flex"><UserPlus size={16} /> اشتراك</a>
            </> : <>
              <button className="relative rounded-xl border border-white/10 bg-white/[.03] p-2.5 text-gray-300 hover:text-white" aria-label="الإشعارات"><Bell size={19} /><span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[#f31325]" /></button>
              <a href="/projects" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : displayName.slice(0,1).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate text-xs font-black sm:block">{displayName}</span>
              </a>
            </>}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1600px] gap-0 border-x border-white/[.06] lg:grid-cols-[1.05fr_.95fr]">
        <div className="order-2 border-t border-white/[.06] p-4 sm:p-7 lg:order-1 lg:border-l lg:border-t-0">
          <div className="group relative h-[280px] overflow-hidden rounded-[26px] border border-[#f31325]/45 bg-[#0a0a0c] sm:h-[340px]">
            {slide.media_type === 'video' ? <video key={slide.media_url} src={slide.media_url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-55" /> : <img key={slide.media_url} src={slide.media_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-[1.02]" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><div className="mb-2 text-xs font-black text-red-300">إعلانات وعروض</div><h2 className="text-3xl font-black sm:text-4xl">{slide.title}</h2><p className="mt-2 max-w-xl text-sm text-gray-300">{slide.subtitle}</p></div>
            {banners.length > 1 && <><button onClick={() => setIndex((index - 1 + banners.length) % banners.length)} className="absolute right-4 top-1/2 rounded-full bg-black/60 p-2"><ChevronRight /></button><button onClick={() => setIndex((index + 1) % banners.length)} className="absolute left-4 top-1/2 rounded-full bg-black/60 p-2"><ChevronLeft /></button></>}
            <div className="absolute bottom-4 left-5 flex gap-1.5">{banners.map((item, i) => <button key={item.id} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-7 bg-[#f31325]' : 'w-2 bg-white/40'}`} aria-label={`بنر ${i+1}`} />)}</div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tools.map((tool, i) => <button key={tool.href} onClick={() => openTool(tool.href)} className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0f13] text-right transition hover:-translate-y-1 hover:border-[#f31325]/55">
              <div className={`relative h-32 overflow-hidden ${i === 0 ? 'bg-[radial-gradient(circle_at_30%_20%,#77232d,#111318_65%)]' : i === 1 ? 'bg-[radial-gradient(circle_at_70%_20%,#293f70,#111318_65%)]' : 'bg-[radial-gradient(circle_at_50%_10%,#563272,#111318_65%)]'}`}>
                <div className="absolute inset-0 flex items-center justify-center"><tool.icon size={48} className="text-white/80 transition group-hover:scale-110" /></div><span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-black">{tool.tag}</span><span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#f31325]"><Play size={15} fill="currentColor" /></span>
              </div>
              <div className="p-4"><h3 className="font-black">{tool.title}</h3><p className="mt-1.5 text-xs leading-5 text-gray-500">{tool.desc}</p><div className="mt-3 text-[11px] font-black text-[#ff3344]">{session?.user ? 'ابدأ التوليد ←' : 'سجّل الدخول للتجربة ←'}</div></div>
            </button>)}
          </div>
        </div>

        <div className="order-1 relative flex min-h-[520px] items-center overflow-hidden p-7 sm:p-12 lg:order-2 lg:min-h-[720px] lg:p-16">
          <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-[#f31325]/10 blur-3xl" />
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.06] px-4 py-2 text-xs font-black text-red-300"><Sparkles size={15} /> منصة الإبداع المدعومة بالذكاء الاصطناعي</div>
            <h1 className="mt-8 text-5xl font-black leading-[1.22] sm:text-6xl">إبداعك بلا حدود.<br/><span className="text-[#f31325]">تجربتك متكاملة.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-gray-400">اصنع تصاميم احترافية، وطوّر هوية علامتك، وحوّل أفكارك إلى محتوى مميز من مكان واحد.</p>
            <div className="mt-8 flex flex-wrap gap-3">{session?.user ? <><a href="/projects" className="rounded-2xl bg-[#f31325] px-7 py-4 text-sm font-black shadow-[0_18px_50px_rgba(243,19,37,.25)]">مشاريعي</a><button onClick={() => openTool('/images-ai')} className="rounded-2xl border border-white/15 px-7 py-4 text-sm font-black">ابدأ الإبداع</button></> : <><a href="/auth?next=%2F" className="rounded-2xl bg-[#f31325] px-7 py-4 text-sm font-black shadow-[0_18px_50px_rgba(243,19,37,.25)]">ابدأ مجانًا ←</a><a href="/auth?next=%2F" className="rounded-2xl border border-white/15 px-7 py-4 text-sm font-black">لدي حساب بالفعل</a></>}</div>
            <div className="mt-8 flex flex-wrap gap-5 text-[11px] text-gray-500"><span>◉ 50 نقطة مجانية</span><span>◉ بدون بطاقة دفع</span><span>◉ واجهة عربية</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
