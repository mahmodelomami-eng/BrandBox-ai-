'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronDown, FolderOpen, ImageIcon, LogIn, LogOut, Menu, MessageSquare, Mic2, UserPlus, Video, WandSparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const NAV_ITEMS = [
  ['الرئيسية', '/'],
  ['القوالب', '/templates'],
  ['خطط تسويقية', '/marketing-plans'],
  ['الأسعار', '/pricing'],
  ['المتجر', '/store'],
  ['المطبعة', '/print'],
  ['من نحن', '/about'],
  ['اتصل بنا', '/contact'],
];

const AI_TOOLS = [
  { label: 'الصور AI', description: 'إنشاء وتحرير الصور', href: '/images-ai', icon: ImageIcon },
  { label: 'الفيديو AI', description: 'إنشاء الفيديو بالذكاء الاصطناعي', href: '/video-ai', icon: Video },
  { label: 'شات AI', description: 'المساعد الذكي والمحادثات', href: '/chat-ai', icon: MessageSquare },
  { label: 'الصوت AI', description: 'الصوت والتعليق الصوتي', href: '/audio-ai', icon: Mic2 },
];

export default function GlobalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('first_name,last_name,avatar_url,role').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadNotifications() {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const result = await response.json();
    setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
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

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    setAiOpen(false);
    setNotificationsOpen(false);
    router.replace('/');
    router.refresh();
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
        await loadNotifications();
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (next?.user) await loadProfile(next.user.id);
      else {
        setProfile(null);
        setNotifications([]);
        setNotificationsOpen(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user) return;
    const timer = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, [session?.user?.id]);

  useEffect(() => {
    setAiOpen(false);
    setOpen(false);
  }, [pathname]);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'حسابي';
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const aiActive = AI_TOOLS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="brandbox-global-nav fixed inset-x-0 top-0 z-[100] border-b border-white/5 bg-[#050506]/95 backdrop-blur-xl" dir="rtl">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <Link href="/" aria-label="Brand Box" className="relative h-12 w-36 shrink-0 xl:w-40">
          <Image src="/brandbox-logo.png" alt="Brand Box" fill priority sizes="160px" className="object-contain object-right" unoptimized />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {NAV_ITEMS.slice(0, 1).map(([label, href]) => {
            const active = pathname === '/';
            return <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-bold transition ${active ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>{label}</Link>;
          })}

          <div className="relative" onMouseEnter={() => setAiOpen(true)} onMouseLeave={() => setAiOpen(false)}>
            <button type="button" onClick={() => setAiOpen((value) => !value)} aria-expanded={aiOpen} className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-bold transition ${aiActive || aiOpen ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <WandSparkles size={16}/> أدوات AI <ChevronDown size={14} className={`transition-transform ${aiOpen ? 'rotate-180' : ''}`}/>
            </button>
            {aiOpen && (
              <div className="absolute right-0 top-full z-[130] w-72 pt-2">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,.65)] backdrop-blur-xl">
                  <div className="px-3 pb-2 pt-1 text-[10px] font-black tracking-wider text-[#ff3344]">أدوات الذكاء الاصطناعي</div>
                  {AI_TOOLS.map(({ label, description, href, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return <Link key={href} href={href} onClick={() => setAiOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? 'bg-[#f31325]/12' : 'hover:bg-white/5'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-[#f31325]/40 bg-[#f31325]/15 text-[#ff3344]' : 'border-white/10 bg-white/[.03] text-gray-300 group-hover:border-[#f31325]/30 group-hover:text-[#ff3344]'}`}><Icon size={19}/></span><span><span className="block text-sm font-black text-white">{label}</span><span className="mt-0.5 block text-[10px] text-gray-500">{description}</span></span></Link>;
                  })}
                </div>
              </div>
            )}
          </div>

          {NAV_ITEMS.slice(1).map(([label, href]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-bold transition ${active ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>{label}</Link>;
          })}
        </nav>

        <div className="mr-auto hidden shrink-0 items-center gap-2 md:flex">
          {!session?.user ? <>
            <Link href="/auth?next=%2F" className="flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-black hover:border-[#f31325]"><LogIn size={16}/> تسجيل الدخول</Link>
            <Link href="/auth?next=%2F" className="flex items-center gap-2 rounded-xl bg-[#f31325] px-3.5 py-2.5 text-xs font-black"><UserPlus size={16}/> اشتراك</Link>
          </> : <>
            <Link href="/?view=projects" className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 hover:border-[#f31325]/40 hover:text-white 2xl:flex"><FolderOpen size={16}/> مشاريعي</Link>
            <button onClick={() => { const next = !notificationsOpen; setNotificationsOpen(next); if (next) loadNotifications(); }} className="relative rounded-xl border border-white/10 p-2.5 text-gray-300 hover:border-[#f31325]/40 hover:text-white" aria-label="الإشعارات"><Bell size={19}/>{unreadCount > 0 && <span className="absolute -left-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#f31325] px-1 text-[9px] font-black">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
            <Link href="/?view=dashboard" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-2.5 py-2 hover:border-[#f31325]/35" title="لوحة التحكم"><span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover"/> : displayName.slice(0,1).toUpperCase()}</span><span className="hidden max-w-28 truncate text-xs font-black lg:block">{displayName}</span></Link>
            <button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-red-500/20 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/10" title="تسجيل الخروج"><LogOut size={16}/><span className="hidden 2xl:inline">خروج</span></button>
          </>}
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="mr-auto rounded-xl border border-white/10 p-2.5 text-white xl:hidden" aria-label="القائمة الرئيسية">{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>

      {session?.user && notificationsOpen && <div className="absolute left-4 top-[72px] z-[120] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016]/98 shadow-[0_25px_80px_rgba(0,0,0,.55)] backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div className="flex items-center gap-2 font-black"><Bell size={17} className="text-[#ff3344]"/> الإشعارات {unreadCount > 0 && <span className="rounded-full bg-[#f31325] px-2 py-0.5 text-[10px]">{unreadCount}</span>}</div><div className="flex gap-2"><button onClick={markAllRead} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" title="تحديد الكل كمقروء"><CheckCheck size={15}/></button><button onClick={() => setNotificationsOpen(false)} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white"><X size={15}/></button></div></div><div className="max-h-[420px] overflow-y-auto p-2">{notifications.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">لا توجد إشعارات جديدة.</div> : notifications.map((item) => <div key={item.id} className={`mb-2 rounded-xl border p-4 ${item.is_read ? 'border-white/[.07] bg-white/[.02]' : 'border-[#f31325]/25 bg-[#f31325]/5'}`}><div className="flex items-start justify-between gap-3"><div className="text-sm font-black">{item.title}</div>{!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3344]"/>}</div>{item.body && <p className="mt-2 text-xs leading-6 text-gray-400">{item.body}</p>}<div className="mt-2 text-[10px] text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</div></div>)}</div></div>}

      {open && <nav className="max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-white/5 bg-[#090a0d] px-4 py-4 xl:hidden"><div className="mx-auto max-w-3xl"><Link href="/" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5">الرئيسية</Link><div className="my-1 rounded-2xl border border-white/10 bg-white/[.02] p-2"><div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#ff3344]"><WandSparkles size={17}/> أدوات AI</div><div className="grid gap-1 sm:grid-cols-2">{AI_TOOLS.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"><Icon size={17} className="text-[#ff3344]"/>{label}</Link>)}</div></div><div className="grid gap-1 sm:grid-cols-2">{NAV_ITEMS.slice(1).map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white">{label}</Link>)}</div></div><div className="mx-auto mt-4 flex max-w-3xl flex-wrap gap-2 border-t border-white/10 pt-4 md:hidden">{!session?.user ? <><Link href="/auth?next=%2F" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">تسجيل الدخول</Link><Link href="/auth?next=%2F" className="rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black">اشتراك</Link></> : <><Link href="/?view=dashboard" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">{displayName}</Link><Link href="/?view=projects" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">مشاريعي</Link><button onClick={signOut} className="rounded-xl border border-red-500/20 px-4 py-3 text-sm font-black text-red-300">تسجيل الخروج</button></>}</div></nav>}
    </header>
  );
}
