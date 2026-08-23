'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Gift, ImageIcon, LogIn, MessageSquareText, Play, Sparkles, UserPlus, Video, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const fallbackBanners = [
  { id: 'welcome', title: 'إعلانات وعروض Brand Box', subtitle: 'مساحة متجددة للعروض، الخصومات والمسابقات', media_url: '/brandbox-dashboard-preview.jpg', media_type: 'image', duration_seconds: 7, link_url: '/pricing' },
  { id: 'creative', title: 'حوّل فكرتك إلى تصميم', subtitle: 'جرّب أدوات الصور والفيديو والشات بالذكاء الاصطناعي', media_url: '/brandbox-login-visual.jpg', media_type: 'image', duration_seconds: 7, link_url: '/images-ai' },
];

const tools = [
  { title: 'توليد الصور AI', desc: 'بوسترات، منتجات، حملات ومشاهد إبداعية', href: '/images-ai', icon: ImageIcon, tag: 'صور', preview: 'images' },
  { title: 'توليد الفيديو AI', desc: 'حوّل الأفكار والصور إلى فيديو جذاب', href: '/video-ai', icon: Video, tag: 'فيديو', preview: 'video' },
  { title: 'شات AI', desc: 'مساعدك للأفكار والمحتوى والتخطيط', href: '/chat-ai', icon: MessageSquareText, tag: 'محتوى', preview: 'chat' },
];

const nav = [
  ['الرئيسية', '/'], ['الصور AI', '/images-ai'], ['الفيديو AI', '/video-ai'], ['شات AI', '/chat-ai'], ['القوالب', '/templates'], ['خطط تسويقية', '/marketing-plans'], ['الأسعار', '/pricing'], ['المتجر', '/store'], ['المطبعة', '/print'], ['من نحن', '/about'], ['اتصل بنا', '/contact'],
];

function ToolPreview({ type }) {
  if (type === 'images') {
    return (
      <div className="absolute inset-0 grid grid-cols-3 gap-1.5 p-3">
        <div className="relative col-span-2 row-span-2 overflow-hidden rounded-xl border border-white/10"><Image src="/brandbox-dashboard-preview.jpg" alt="مثال تصميم AI" fill className="object-cover transition duration-700 group-hover:scale-105" unoptimized /></div>
        <div className="relative overflow-hidden rounded-xl border border-white/10"><Image src="/brandbox-login-visual.jpg" alt="مثال تصميم AI" fill className="object-cover object-center transition duration-700 group-hover:scale-110" unoptimized /></div>
        <div className="relative overflow-hidden rounded-xl border border-white/10"><Image src="/brandbox-dashboard-preview.jpg" alt="مثال تصميم AI" fill className="object-cover object-right transition duration-700 group-hover:scale-110" unoptimized /></div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="absolute inset-0 p-3">
        <div className="relative h-full overflow-hidden rounded-xl border border-white/10">
          <Image src="/brandbox-dashboard-preview.jpg" alt="مثال فيديو AI" fill className="object-cover opacity-80 transition duration-700 group-hover:scale-105" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-[#f31325]/90 shadow-2xl transition group-hover:scale-110"><Play size={22} fill="currentColor" /></span></div>
          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-black">مشهد إعلاني مولّد بالذكاء الاصطناعي</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2 p-4 text-[10px] leading-5">
      <div className="mr-auto max-w-[82%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.06] px-3 py-2 text-gray-300">اكتب لي فكرة حملة إعلانية لعلامة قهوة جديدة.</div>
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm border border-[#f31325]/30 bg-[#f31325]/10 px-3 py-2 text-gray-100">بالطبع — سأبني لك الفكرة، الرسالة، الجمهور، ونصوص الإعلانات في خطة واحدة.</div>
      <div className="mr-auto max-w-[72%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.06] px-3 py-2 text-gray-400">واجعل الأسلوب عصريًا ومناسبًا للسوق الليبي.</div>
    </div>
  );
}

export default function HomeExperience() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [banners, setBanners] = useState(fallbackBanners);
  const [index, setIndex] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadNotifications() {
    const token = await getAccessToken();
    if (!token) return;
    setNotificationsLoading(true);
    try {
      const response = await fetch('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const result = await response.json();
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markAllRead() {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/v1/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }

  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) {
        const { data: p } = await supabase.from('profiles').select('first_name,last_name,avatar_url,role').eq('id', data.session.user.id).maybeSingle();
        if (mounted) setProfile(p || null);
        await loadNotifications();
      }
      const now = new Date().toISOString();
      const { data: slides } = await supabase.from('home_banners').select('*').eq('is_active', true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order('sort_order').order('created_at');
      if (mounted && slides?.length) setBanners(slides);
    }
    boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        setNotifications([]);
        setNotificationsOpen(false);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user) return;
    const timer = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, [session?.user?.id]);

  useEffect(() => {
    if (banners.length < 2) return;
    const seconds = Math.max(3, Number(banners[index]?.duration_seconds) || 7);
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % banners.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [banners, index]);

  const openTool = (href) => router.push(session?.user ? href : `/auth?next=${encodeURIComponent(href)}`);
  const slide = banners[index] || fallbackBanners[0];
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'حسابي';
  const unreadCount = notifications.filter((item) => !item.is_read).length;

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
              <button onClick={() => { const next = !notificationsOpen; setNotificationsOpen(next); if (next) loadNotifications(); }} className="relative rounded-xl border border-white/10 bg-white/[.03] p-2.5 text-gray-300 hover:border-[#f31325]/40 hover:text-white" aria-label="الإشعارات">
                <Bell size={19} />
                {unreadCount > 0 && <span className="absolute -left-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#f31325] px-1 text-[9px] font-black text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              <a href="/projects" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 hover:border-[#f31325]/35">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover" /> : displayName.slice(0,1).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate text-xs font-black sm:block">{displayName}</span>
              </a>
            </>}
          </div>
        </div>

        {session?.user && notificationsOpen && (
          <div className="absolute left-4 top-[76px] z-[70] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016]/98 shadow-[0_25px_80px_rgba(0,0,0,.55)] backdrop-blur-xl lg:left-7">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2 font-black"><Bell size={17} className="text-[#ff3344]" /> الإشعارات {unreadCount > 0 && <span className="rounded-full bg-[#f31325] px-2 py-0.5 text-[10px]">{unreadCount}</span>}</div>
              <div className="flex items-center gap-2"><button onClick={markAllRead} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" title="تحديد الكل كمقروء"><CheckCheck size={15} /></button><button onClick={() => setNotificationsOpen(false)} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" aria-label="إغلاق"><X size={15} /></button></div>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {notificationsLoading && notifications.length === 0 ? <div className="p-8 text-center text-xs text-gray-500">جاري تحميل الإشعارات...</div> : notifications.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">لا توجد إشعارات جديدة.</div> : notifications.map((item) => <div key={item.id} className={`mb-2 rounded-xl border p-4 ${item.is_read ? 'border-white/[.07] bg-white/[.02]' : 'border-[#f31325]/25 bg-[#f31325]/5'}`}><div className="flex items-start justify-between gap-3"><div className="text-sm font-black">{item.title}</div>{!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3344]" />}</div>{item.body && <p className="mt-2 text-xs leading-6 text-gray-400">{item.body}</p>}<div className="mt-2 text-[10px] text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</div></div>)}
            </div>
          </div>
        )}
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
            {tools.map((tool) => <button key={tool.href} onClick={() => openTool(tool.href)} className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0f13] text-right shadow-[0_14px_40px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1.5 hover:border-[#f31325]/55 hover:shadow-[0_18px_55px_rgba(243,19,37,.12)]">
              <div className="relative h-44 overflow-hidden bg-[#10131a]">
                <ToolPreview type={tool.preview} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0f13] via-transparent to-black/5" />
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-black backdrop-blur"><tool.icon size={12} /> {tool.tag}</span>
              </div>
              <div className="p-4"><h3 className="font-black">{tool.title}</h3><p className="mt-1.5 text-xs leading-5 text-gray-500">{tool.desc}</p><div className="mt-3 flex items-center justify-between"><span className="text-[11px] font-black text-[#ff3344]">{session?.user ? 'ابدأ التوليد ←' : 'سجّل الدخول للتجربة ←'}</span><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-gray-500">معاينة مباشرة</span></div></div>
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
