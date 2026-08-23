'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronDown, ImageIcon, LogIn, LogOut, Menu, MessageSquare, Mic2, Settings, UserPlus, Video, WandSparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  { label: 'الصور AI', href: '/images-ai', icon: ImageIcon },
  { label: 'الفيديو AI', href: '/video-ai', icon: Video },
  { label: 'شات AI', href: '/chat-ai', icon: MessageSquare },
  { label: 'الصوت AI', href: '/audio-ai', icon: Mic2 },
];

const ROLE_LABELS = {
  USER: 'مستخدم',
  SUPPORT: 'مشرف',
  ADMIN: 'مدير',
  SUPER_ADMIN: 'مدير عام',
};

export default function GlobalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const accountRef = useRef(null);
  const notificationsRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);

  async function loadNotifications(accessToken) {
    if (!accessToken) return;
    try {
      const response = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const result = await response.json();
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
    } catch {}
  }

  async function syncSession() {
    const { data } = await supabase.auth.getSession();
    const next = data.session || null;
    setSession(next);
    if (!next?.user) {
      setProfile(null);
      setNotifications([]);
      return;
    }

    const { data: nextProfile } = await supabase
      .from('profiles')
      .select('first_name,last_name,avatar_url,role')
      .eq('id', next.user.id)
      .maybeSingle();
    setProfile(nextProfile || null);
    await loadNotifications(next.access_token);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await syncSession();
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next || null);
      if (!next?.user) {
        setProfile(null);
        setNotifications([]);
      } else {
        window.setTimeout(() => syncSession(), 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user || !session.access_token) return;
    const timer = window.setInterval(() => loadNotifications(session.access_token), 60000);
    return () => window.clearInterval(timer);
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    setOpen(false);
    setAiOpen(false);
    setAccountOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'حسابي';
  const roleLabel = ROLE_LABELS[profile?.role] || 'مستخدم';
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function markAllRead() {
    if (!session?.access_token || unreadCount === 0) return;
    try {
      const response = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    } catch {}
  }

  async function signOut() {
    setAccountOpen(false);
    setNotificationsOpen(false);
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <header className="brandbox-global-nav fixed inset-x-0 top-0 z-[100] border-b border-white/5 bg-[#050506]/95 backdrop-blur-xl" dir="rtl">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <Link href="/" aria-label="Brand Box" className="relative h-12 w-36 shrink-0 xl:w-40">
          <Image src="/brandbox-logo.png" alt="Brand Box" fill priority sizes="160px" className="object-contain object-right" unoptimized />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          <Link href="/" className={`rounded-lg px-2.5 py-2 text-[13px] font-bold ${pathname === '/' ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>الرئيسية</Link>
          <div className="relative">
            <button type="button" onClick={() => setAiOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold text-gray-300 hover:bg-white/5 hover:text-white">
              <WandSparkles size={16}/> أدوات AI <ChevronDown size={14}/>
            </button>
            {aiOpen && <div className="absolute right-0 top-full z-[130] w-64 pt-2"><div className="rounded-2xl border border-white/10 bg-[#0d1016] p-2 shadow-2xl">{AI_TOOLS.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setAiOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"><Icon size={18} className="text-[#ff3344]"/>{label}</Link>)}</div></div>}
          </div>
          {NAV_ITEMS.slice(1).map(([label, href]) => <Link key={href} href={href} className={`rounded-lg px-2.5 py-2 text-[13px] font-bold ${pathname === href || pathname.startsWith(`${href}/`) ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>{label}</Link>)}
        </nav>

        <div className="mr-auto hidden shrink-0 items-center gap-3 md:flex">
          {!session?.user ? <>
            <Link href="/auth?next=%2Fdashboard" className="flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-black"><LogIn size={16}/> تسجيل الدخول</Link>
            <Link href="/auth?next=%2Fdashboard" className="flex items-center gap-2 rounded-xl bg-[#f31325] px-3.5 py-2.5 text-xs font-black"><UserPlus size={16}/> اشتراك</Link>
          </> : <>
            <div ref={accountRef} className="relative">
              <button type="button" onClick={() => { setAccountOpen((v) => !v); setNotificationsOpen(false); }} className="flex items-center gap-2 bg-transparent px-1 py-1 text-right outline-none" aria-expanded={accountOpen} aria-label="قائمة المستخدم">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="max-w-32 truncate text-xs font-black text-white">{displayName}</span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${accountOpen ? 'rotate-180' : ''}`}/>
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-gray-500">{roleLabel}</div>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black ring-2 ring-[#f31325]/70 ring-offset-2 ring-offset-[#050506]">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover"/> : displayName.slice(0,1).toUpperCase()}
                </span>
              </button>

              {accountOpen && <div className="absolute left-0 top-full z-[135] mt-3 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016] p-2 shadow-[0_24px_70px_rgba(0,0,0,.65)]">
                <Link href="/dashboard/account" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-gray-200 hover:bg-white/5 hover:text-white"><Settings size={18} className="text-gray-400"/><span>إعدادات الحساب</span></Link>
                <div className="my-1 border-t border-white/10"/>
                <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-[#ff5b67] hover:bg-red-500/10"><LogOut size={18}/><span>تسجيل الخروج</span></button>
              </div>}
            </div>

            <div ref={notificationsRef} className="relative">
              <button type="button" onClick={() => { setNotificationsOpen((v) => !v); setAccountOpen(false); if (!notificationsOpen) loadNotifications(session.access_token); }} className="relative grid h-10 w-10 place-items-center bg-transparent text-gray-300 transition hover:text-white" aria-label="الإشعارات" aria-expanded={notificationsOpen}>
                <Bell size={21}/>
                {unreadCount > 0 && <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#f31325] px-1 text-[9px] font-black text-white ring-2 ring-[#050506]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>

              {notificationsOpen && <div className="absolute left-0 top-full z-[135] mt-3 w-[min(90vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016] shadow-[0_24px_70px_rgba(0,0,0,.65)]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div><div className="text-sm font-black">الإشعارات</div><div className="mt-0.5 text-[10px] text-gray-500">{unreadCount ? `${unreadCount} غير مقروء` : 'لا توجد إشعارات غير مقروءة'}</div></div>
                  <button type="button" onClick={markAllRead} disabled={!unreadCount} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30" title="تحديد الكل كمقروء"><CheckCheck size={17}/></button>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                  {notifications.length === 0 ? <div className="px-4 py-10 text-center text-sm text-gray-500">لا توجد إشعارات حاليًا.</div> : notifications.map((item) => <div key={item.id} className={`mb-2 rounded-xl p-3 ${item.is_read ? 'bg-white/[.02]' : 'bg-[#f31325]/7'}`}>
                    <div className="flex items-start gap-2"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-gray-700' : 'bg-[#f31325]'}`}/><div className="min-w-0 flex-1"><div className="text-xs font-black text-white">{item.title || 'إشعار'}</div>{item.body && <div className="mt-1 text-[11px] leading-5 text-gray-400">{item.body}</div>}<div className="mt-2 text-[9px] text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</div></div></div>
                  </div>)}
                </div>
              </div>}
            </div>
          </>}
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="mr-auto rounded-xl p-2.5 text-white xl:hidden" aria-label="القائمة الرئيسية">{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>

      {open && <nav className="max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-white/5 bg-[#090a0d] px-4 py-4 xl:hidden">
        <div className="mx-auto max-w-3xl space-y-1">
          <Link href="/" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5">الرئيسية</Link>
          <div className="rounded-2xl border border-white/10 bg-white/[.02] p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#ff3344]"><WandSparkles size={17}/> أدوات AI</div>
            {AI_TOOLS.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"><Icon size={17} className="text-[#ff3344]"/>{label}</Link>)}
          </div>
          {NAV_ITEMS.slice(1).map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5">{label}</Link>)}
        </div>
        <div className="mx-auto mt-4 border-t border-white/10 pt-4 md:hidden">
          {!session?.user ? <div className="flex flex-wrap gap-2"><Link href="/auth?next=%2Fdashboard" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">تسجيل الدخول</Link><Link href="/auth?next=%2Fdashboard" onClick={() => setOpen(false)} className="rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black">اشتراك</Link></div> : <div className="space-y-2">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3"><span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover"/> : displayName.slice(0,1).toUpperCase()}</span><div><div className="text-sm font-black">{displayName}</div><div className="text-[10px] text-gray-500">{roleLabel}</div></div></Link>
            <Link href="/dashboard/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-gray-300 hover:bg-white/5"><Settings size={17}/> إعدادات الحساب</Link>
            <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-[#ff5b67] hover:bg-red-500/10"><LogOut size={17}/> تسجيل الخروج</button>
          </div>}
        </div>
      </nav>}
    </header>
  );
}
