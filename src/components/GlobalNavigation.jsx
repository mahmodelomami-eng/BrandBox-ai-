'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Coins,
  ImageIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Mic2,
  Settings,
  ShieldCheck,
  UserPlus,
  Video,
  WandSparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  ['القوالب', '/templates'],
  ['خطط تسويقية', '/marketing-plans'],
  ['الأسعار', '/pricing'],
  ['المتجر', '/store'],
  ['المطبعة', '/print'],
  ['من نحن', '/about'],
  ['اتصل بنا', '/contact'],
];

const AI_TOOLS = [
  { label: 'الصور AI', href: '/projects/images', icon: ImageIcon },
  { label: 'الفيديو AI', href: '/projects/video', icon: Video },
  { label: 'شات AI', href: '/projects/chat', icon: MessageSquare },
  { label: 'الصوت AI', href: '/projects/audio', icon: Mic2 },
];

const ROLE_LABELS = {
  USER: 'مستخدم',
  SUPPORT: 'مشرف',
  ADMIN: 'مدير',
  SUPER_ADMIN: 'مدير عام',
};

function navClass(active) {
  return `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${active
    ? 'bg-[#f31325]/12 text-[#ff3344]'
    : 'text-gray-300 hover:bg-white/5 hover:text-white'}`;
}

function mobileNavClass(active) {
  return `flex min-h-11 items-center rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 ${active
    ? 'bg-[#f31325]/12 text-[#ff5360]'
    : 'text-gray-300 hover:bg-white/5 hover:text-white'}`;
}

export default function GlobalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, profile: authProfile, roleLabel: authRoleLabel, creditBalance: authCredits, signOut: authSignOut } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const accountRef = useRef(null);
  const notificationsRef = useRef(null);
  const aiRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  async function loadNotifications() {
    if (!authUser?.id) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const result = await response.json();
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
    } catch {}
  }

  useEffect(() => {
    if (!authUser?.id) {
      setNotifications([]);
      return undefined;
    }
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60000);
    return () => window.clearInterval(timer);
  }, [authUser?.id]);

  useEffect(() => {
    setMobileOpen(false);
    setAiOpen(false);
    setAccountOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setNotificationsOpen(false);
      if (aiRef.current && !aiRef.current.contains(event.target)) setAiOpen(false);
    };
    document.addEventListener('pointerdown', closeMenus);
    return () => document.removeEventListener('pointerdown', closeMenus);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  const currentUser = authUser;
  const currentProfile = authProfile;
  const currentCredits = authCredits ?? 0;
  const displayName = [currentProfile?.first_name, currentProfile?.last_name].filter(Boolean).join(' ')
    || currentUser?.email?.split('@')[0]
    || 'حسابي';
  const roleLabel = authRoleLabel || (currentProfile?.role ? (ROLE_LABELS[currentProfile.role] || 'مستخدم') : 'مستخدم');
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const dashboardHref = currentUser ? '/dashboard' : '/auth?next=%2Fdashboard';
  const canOpenAdmin = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(currentProfile?.role);
  const projectsActive = pathname === '/projects' || pathname.startsWith('/projects/');

  async function markAllRead() {
    if (!authUser?.id || unreadCount === 0) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (response.ok) {
        setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
      }
    } catch {}
  }

  async function signOut() {
    setAccountOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);
    if (authSignOut) {
      await authSignOut();
    } else {
      await supabase.auth.signOut();
      router.replace('/');
      router.refresh();
    }
  }

  return (
    <header className="brandbox-global-nav fixed inset-x-0 top-0 z-[100] border-b border-white/[.07] bg-[#050506] shadow-[0_10px_35px_rgba(0,0,0,.28)]" dir="rtl">
      <div className="mx-auto flex min-h-20 max-w-[1660px] items-center gap-3 px-4 lg:px-6">
        <Link href="/" aria-label="Brand Box" className="relative h-12 w-36 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 xl:w-40">
          <Image src="/brandbox-logo.png" alt="Brand Box" fill priority sizes="160px" className="object-contain object-right" unoptimized />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label="التنقل الرئيسي">
          <Link href="/" className={navClass(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined}>الرئيسية</Link>
          <Link href={dashboardHref} className={navClass(pathname.startsWith('/dashboard'))} aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}>لوحة تحكم المستخدم</Link>

          <div ref={aiRef} className="relative">
            <button
              type="button"
              onClick={() => setAiOpen((value) => !value)}
              className={navClass(projectsActive)}
              aria-expanded={aiOpen}
              aria-haspopup="menu"
            >
              <span className="flex items-center gap-1.5"><WandSparkles size={16} /> أدوات AI <ChevronDown size={14} className={`transition ${aiOpen ? 'rotate-180' : ''}`} /></span>
            </button>
            {aiOpen && (
              <div className="absolute right-0 top-full z-[130] w-72 pt-2" role="menu">
                <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-2 shadow-[0_24px_70px_rgba(0,0,0,.72)]">
                  {AI_TOOLS.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link key={href} href={href} onClick={() => setAiOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70" role="menuitem" aria-current={active ? 'page' : undefined}>
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={18} /></span>
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {NAV_ITEMS.map(([label, href]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={navClass(active)} aria-current={active ? 'page' : undefined}>{label}</Link>;
          })}
        </nav>

        <div className="mr-auto hidden shrink-0 items-center gap-3 md:flex">
          {!currentUser ? (
            <>
              <Link href="/auth?next=%2Fdashboard" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-black transition hover:border-[#f31325]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><LogIn size={16} /> تسجيل الدخول</Link>
              <Link href="/auth?next=%2Fdashboard" className="flex min-h-11 items-center gap-2 rounded-xl bg-[#f31325] px-3.5 py-2.5 text-xs font-black transition hover:bg-[#ff2637] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><UserPlus size={16} /> إنشاء حساب</Link>
            </>
          ) : (
            <>
              <Link
                href="/pricing"
                className="flex min-h-10 items-center gap-1.5 rounded-xl border border-[#f31325]/30 bg-[#f31325]/10 px-3 py-1.5 text-xs font-extrabold text-[#ff3344] transition hover:bg-[#f31325]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"
                title="الرصيد المتاح - اضغط لشحن الرصيد"
              >
                <Coins size={15} className="text-[#ff3344]" />
                <span className="hidden text-[11px] text-gray-400 sm:inline">الرصيد:</span>
                <span>{currentCredits.toLocaleString('ar-LY')}</span>
              </Link>

              <div ref={accountRef} className="relative flex items-center gap-1">
                <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-1 py-1 text-right transition hover:bg-white/[.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70" title="فتح لوحة تحكم المستخدم">
                  <div className="min-w-0">
                    <div className="max-w-36 truncate text-xs font-black text-white">{displayName}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-gray-500">{roleLabel}</div>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f31325] text-xs font-black ring-2 ring-[#f31325]/65 ring-offset-2 ring-offset-[#050506]">
                    {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => { setAccountOpen((value) => !value); setNotificationsOpen(false); }}
                  className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"
                  aria-expanded={accountOpen}
                  aria-label="فتح قائمة الحساب"
                >
                  <ChevronDown size={15} className={`transition ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute left-0 top-full z-[135] mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016] p-2 shadow-[0_24px_70px_rgba(0,0,0,.72)]">
                    <Link href="/dashboard" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-gray-200 hover:bg-white/5 hover:text-white"><LayoutDashboard size={18} className="text-[#ff3344]" /> لوحة تحكم المستخدم</Link>
                    <Link href="/dashboard/account" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-gray-200 hover:bg-white/5 hover:text-white"><Settings size={18} className="text-gray-400" /> إعدادات الحساب</Link>
                    {canOpenAdmin && <Link href="/admin" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-amber-200 hover:bg-amber-500/10"><ShieldCheck size={18} /> لوحة الإدارة</Link>}
                    <div className="my-1 border-t border-white/10" />
                    <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-[#ff5b67] hover:bg-red-500/10"><LogOut size={18} /> تسجيل الخروج</button>
                  </div>
                )}
              </div>

              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setNotificationsOpen((value) => !value); setAccountOpen(false); if (!notificationsOpen) void loadNotifications(); }}
                  className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"
                  aria-label="الإشعارات"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={21} />
                  {unreadCount > 0 && <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#f31325] px-1 text-[9px] font-black text-white ring-2 ring-[#050506]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 top-full z-[135] mt-3 w-[min(90vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1016] shadow-[0_24px_70px_rgba(0,0,0,.72)]">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div><div className="text-sm font-black">الإشعارات</div><div className="mt-0.5 text-[10px] text-gray-500">{unreadCount ? `${unreadCount} غير مقروء` : 'لا توجد إشعارات غير مقروءة'}</div></div>
                      <button type="button" onClick={markAllRead} disabled={!unreadCount} className="grid h-10 w-10 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70" title="تحديد الكل كمقروء"><CheckCheck size={17} /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">لا توجد إشعارات حاليًا.</div>
                      ) : notifications.map((item) => (
                        <div key={item.id} className={`mb-2 rounded-xl p-3 ${item.is_read ? 'bg-white/[.02]' : 'bg-[#f31325]/7'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-gray-700' : 'bg-[#f31325]'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-white">{item.title || 'إشعار'}</div>
                              {item.body && <div className="mt-1 text-[11px] leading-5 text-gray-400">{item.body}</div>}
                              <div className="mt-2 text-[9px] text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileOpen((value) => !value);
            setAiOpen(false);
            setAccountOpen(false);
            setNotificationsOpen(false);
          }}
          className="mr-auto grid h-11 w-11 place-items-center rounded-xl text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70 xl:hidden"
          aria-label={mobileOpen ? 'إغلاق القائمة الرئيسية' : 'فتح القائمة الرئيسية'}
          aria-expanded={mobileOpen}
          aria-controls="brandbox-mobile-navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="brandbox-mobile-navigation" className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-white/[.07] bg-[#090a0d] px-4 py-4 xl:hidden" aria-label="التنقل على الهاتف">
          <div className="mx-auto max-w-3xl space-y-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className={mobileNavClass(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined}>الرئيسية</Link>
            <Link href={dashboardHref} onClick={() => setMobileOpen(false)} className={`${mobileNavClass(pathname.startsWith('/dashboard'))} gap-2`} aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}><LayoutDashboard size={17} className="text-[#ff3344]" /> لوحة تحكم المستخدم</Link>

            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#ff3344]"><WandSparkles size={17} /> أدوات AI</div>
              {AI_TOOLS.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`${mobileNavClass(active)} gap-3 px-3`} aria-current={active ? 'page' : undefined}><Icon size={17} className="text-[#ff3344]" /> {label}</Link>
                );
              })}
            </div>

            {NAV_ITEMS.map(([label, href]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={mobileNavClass(active)} aria-current={active ? 'page' : undefined}>{label}</Link>;
            })}

            <div className="mt-4 border-t border-white/10 pt-4 md:hidden">
              {!currentUser ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/auth?next=%2Fdashboard" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-3 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><LogIn size={16} /> تسجيل الدخول</Link>
                  <Link href="/auth?next=%2Fdashboard" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f31325] px-3 py-3 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><UserPlus size={16} /> إنشاء حساب</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/pricing"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center justify-between rounded-xl border border-[#f31325]/30 bg-[#f31325]/10 px-4 py-3 text-xs font-extrabold text-[#ff3344] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"
                  >
                    <span className="flex items-center gap-2">
                      <Coins size={16} />
                      <span>الرصيد المتاح</span>
                    </span>
                    <span>{currentCredits.toLocaleString('ar-LY')} نقطة</span>
                  </Link>
                  <Link href="/dashboard/account" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"><Settings size={17} /> إعدادات الحساب</Link>
                  {canOpenAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-black text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"><ShieldCheck size={17} /> لوحة الإدارة</Link>}
                  <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-black text-[#ff5b67] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><LogOut size={17} /> تسجيل الخروج</button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
