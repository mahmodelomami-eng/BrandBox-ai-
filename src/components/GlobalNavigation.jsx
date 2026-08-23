'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, FolderOpen, ImageIcon, LogIn, LogOut, Menu, MessageSquare, Mic2, UserPlus, Video, WandSparkles, X } from 'lucide-react';
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
  { label: 'الصور AI', href: '/images-ai', icon: ImageIcon },
  { label: 'الفيديو AI', href: '/video-ai', icon: Video },
  { label: 'شات AI', href: '/chat-ai', icon: MessageSquare },
  { label: 'الصوت AI', href: '/audio-ai', icon: Mic2 },
];

export default function GlobalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const next = data.session || null;
      setSession(next);
      if (next?.user) {
        const { data: nextProfile } = await supabase
          .from('profiles')
          .select('first_name,last_name,avatar_url,role')
          .eq('id', next.user.id)
          .maybeSingle();
        if (mounted) setProfile(nextProfile || null);
        try {
          const token = next.access_token;
          if (token) {
            const response = await fetch('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
              const result = await response.json();
              if (mounted) setUnreadCount((result.notifications || []).filter((item) => !item.is_read).length);
            }
          }
        } catch {}
      } else {
        setProfile(null);
        setUnreadCount(0);
      }
    }

    syncSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next || null);
      if (!next?.user) setProfile(null);
      else syncSession();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setOpen(false);
    setAiOpen(false);
  }, [pathname]);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'حسابي';

  async function signOut() {
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

        <div className="mr-auto hidden shrink-0 items-center gap-2 md:flex">
          {!session?.user ? <>
            <Link href="/auth?next=%2Fdashboard" className="flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-black"><LogIn size={16}/> تسجيل الدخول</Link>
            <Link href="/auth?next=%2Fdashboard" className="flex items-center gap-2 rounded-xl bg-[#f31325] px-3.5 py-2.5 text-xs font-black"><UserPlus size={16}/> اشتراك</Link>
          </> : <>
            <Link href="/projects" className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 hover:border-[#f31325]/40 hover:text-white 2xl:flex"><FolderOpen size={16}/> مشاريعي</Link>
            <Link href="/dashboard" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-2.5 py-2 hover:border-[#f31325]/35" title="لوحة التحكم">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover"/> : displayName.slice(0,1).toUpperCase()}</span>
              <span className="hidden max-w-28 truncate text-xs font-black lg:block">{displayName}</span>
            </Link>
            <Link href="/dashboard" className="relative rounded-xl border border-white/10 p-2.5 text-gray-300 hover:border-[#f31325]/40 hover:text-white" aria-label="الإشعارات"><Bell size={19}/>{unreadCount > 0 && <span className="absolute -left-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#f31325] px-1 text-[9px] font-black">{unreadCount > 99 ? '99+' : unreadCount}</span>}</Link>
            <button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-red-500/20 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/10"><LogOut size={16}/><span className="hidden 2xl:inline">خروج</span></button>
          </>}
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="mr-auto rounded-xl border border-white/10 p-2.5 text-white xl:hidden" aria-label="القائمة الرئيسية">{open ? <X size={22}/> : <Menu size={22}/>}</button>
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
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap gap-2 border-t border-white/10 pt-4 md:hidden">
          {!session?.user ? <>
            <Link href="/auth?next=%2Fdashboard" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">تسجيل الدخول</Link>
            <Link href="/auth?next=%2Fdashboard" onClick={() => setOpen(false)} className="rounded-xl bg-[#f31325] px-4 py-3 text-sm font-black">اشتراك</Link>
          </> : <>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">لوحة التحكم</Link>
            <Link href="/projects" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">مشاريعي</Link>
            <button onClick={signOut} className="rounded-xl border border-red-500/20 px-4 py-3 text-sm font-black text-red-300">تسجيل الخروج</button>
          </>}
        </div>
      </nav>}
    </header>
  );
}
