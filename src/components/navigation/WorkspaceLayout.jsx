'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  Palette,
  Layers3,
  CreditCard,
  Settings,
  ShieldCheck,
  Coins,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  CheckCheck,
} from 'lucide-react';

export default function WorkspaceLayout({ children }) {
  const { user, profile, role, roleLabel, creditBalance, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  // Real Notifications Loader
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const result = await response.json();
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
    } catch (err) {
      console.error('[WorkspaceLayout] Error loading notifications:', err);
    }
  }, [user]);

  // Fetch notifications and poll every 60s
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    loadNotifications();

    const interval = setInterval(() => {
      if (mounted) loadNotifications();
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user, loadNotifications]);

  // Mark all notifications as read
  const markAllRead = async () => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (unreadCount === 0 || markingRead) return;

    setMarkingRead(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('[WorkspaceLayout] Error marking all read:', err);
    } finally {
      setMarkingRead(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#090A0F] text-white flex flex-col items-center justify-center space-y-4">
        <div className="relative h-12 w-44">
          <Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="176px" className="object-contain" priority unoptimized />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
          <span>جاري التحقق من الجلسة وتحميل بيانات الحساب...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || user.email?.split('@')[0] || 'المستخدم';
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=1f2438&textColor=ffffff`;
  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SUPPORT';
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const navGroups = [
    {
      title: 'منطقة العمل المركزية',
      items: [
        { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
        { href: '/projects', label: 'المشاريع (Projects)', icon: FolderOpen },
      ],
    },
    {
      title: 'أدوات الذكاء الاصطناعي',
      items: [
        { href: '/chat-ai', label: 'المساعد الذكي (AI Chat)', icon: MessageSquare },
        { href: '/images-ai', label: 'مولد الصور (AI Images)', icon: ImageIcon },
        { href: '/video-ai', label: 'مولد الفيديو (AI Video)', icon: Video },
        { href: '/audio-ai', label: 'مولد الصوت (AI Audio)', icon: Mic },
      ],
    },
    {
      title: 'أدوات الهوية والمحتوى',
      items: [
        { href: '/brand-kit', label: 'مدير الهوية (Brand Kit)', icon: Palette },
        { href: '/templates', label: 'مكتبة القوالب (Templates)', icon: Layers3 },
      ],
    },
    {
      title: 'الحساب والاشتراك',
      items: [
        { href: '/pricing', label: 'شراء رصيد', icon: CreditCard },
        { href: '/dashboard/account', label: 'إعدادات الحساب', icon: Settings },
      ],
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#090A0F] text-gray-100 font-sans flex flex-col selection:bg-[#FF2E4C] selection:text-white">
      {/* Global Header */}
      <header className="h-16 bg-[#0D0F17] border-b border-[#1F2438] px-4 lg:px-8 flex items-center justify-between z-40 sticky top-0">
        {/* Right side (RTL Start) */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition"
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/dashboard" className="hidden lg:flex items-center">
            <div className="relative h-9 w-36">
              <Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="144px" className="object-contain object-right" priority unoptimized />
            </div>
          </Link>
        </div>

        {/* Left side (RTL End) */}
        <div className="flex items-center gap-3">
          {/* Admin switcher button for privileged users */}
          {isSuperAdminOrAdmin && (
            <Link
              href="/admin"
              className={`text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition border shadow-lg ${
                pathname.startsWith('/admin')
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#FF2E4C]/15 hover:bg-[#FF2E4C]/25 text-[#FF2E4C] border-[#FF2E4C]/30'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">لوحة الإدارة</span>
            </Link>
          )}

          {/* Real Credits Badge */}
          <Link
            href="/pricing"
            className="flex items-center gap-2 bg-[#FF2E4C]/10 border border-[#FF2E4C]/30 px-3.5 py-1.5 rounded-xl hover:bg-[#FF2E4C]/20 transition"
          >
            <Coins className="w-4 h-4 text-[#FF2E4C]" />
            <span className="text-xs font-semibold text-gray-300 hidden sm:inline">الرصيد:</span>
            <span className="text-xs font-extrabold text-[#FF2E4C]">{creditBalance.toLocaleString('ar-LY')}</span>
          </Link>

          {/* Real Notifications dropdown toggle */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileDropdownOpen(false);
                if (!notificationsOpen) loadNotifications();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition relative"
              aria-label="الإشعارات"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#FF2E4C] px-1 text-[9px] font-black text-white ring-2 ring-[#0D0F17]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute left-0 mt-2 w-[min(90vw,380px)] rounded-2xl border border-[#1F2438] bg-[#121520] shadow-2xl z-50 animate-fade-in overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#1F2438] px-4 py-3 bg-[#0D0F17]">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#FF2E4C]" />
                      <span>الإشعارات</span>
                    </h4>
                    <span className="text-[10px] text-gray-400">
                      {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات غير مقروءة'}
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={markingRead}
                      className="flex items-center gap-1 text-[11px] text-[#FF2E4C] hover:underline font-bold disabled:opacity-50"
                      title="تحديد الكل كمقروء"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto p-3 space-y-2 text-xs">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500">
                      لا توجد إشعارات حالياً.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition ${
                          item.is_read
                            ? 'bg-[#0D0F17]/50 border-[#1F2438]/50 text-gray-400'
                            : 'bg-[#FF2E4C]/5 border-[#FF2E4C]/25 text-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              item.is_read ? 'bg-gray-600' : 'bg-[#FF2E4C]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-white truncate">
                              {item.title || 'إشعار'}
                            </div>
                            {item.body && (
                              <p className="mt-1 text-[11px] leading-5 text-gray-300">
                                {item.body}
                              </p>
                            )}
                            <span className="mt-1.5 block text-[9px] text-gray-500 font-mono">
                              {item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition"
              aria-label="قائمة الملف الشخصي"
            >
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-8 w-8 rounded-full border border-[#FF2E4C] object-cover bg-[#121520]"
              />
              <div className="hidden md:block text-right">
                <div className="text-xs font-extrabold text-white max-w-[120px] truncate">{fullName}</div>
                <div className="text-[10px] text-gray-400">{roleLabel}</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[#1F2438] bg-[#121520] p-2 shadow-2xl z-50 animate-fade-in divide-y divide-[#1F2438]">
                <div className="p-3">
                  <div className="font-extrabold text-white text-xs truncate">{fullName}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{user.email}</div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FF2E4C]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#FF2E4C] border border-[#FF2E4C]/30">
                    {roleLabel}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard/account"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0D0F17] rounded-xl transition"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>إعدادات الحساب</span>
                  </Link>

                  <Link
                    href="/pricing"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0D0F17] rounded-xl transition"
                  >
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span>شراء رصيد</span>
                  </Link>

                  {isSuperAdminOrAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>لوحة التحكم الإدارية</span>
                    </Link>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Global Sidebar Navigation */}
        <aside
          className={`w-64 bg-[#0D0F17] border-l border-[#1F2438] flex flex-col justify-between fixed lg:static inset-y-0 right-0 z-40 lg:z-30 transform ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } lg:translate-x-0 transition-transform duration-300 ease-in-out shrink-0`}
        >
          <div className="p-4 space-y-6 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between lg:hidden border-b border-[#1F2438] pb-4">
              <Link href="/dashboard" className="relative h-8 w-32">
                <Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="128px" className="object-contain object-right" priority unoptimized />
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className={`space-y-1 ${groupIdx > 0 ? 'pt-4 border-t border-[#1F2438]/60' : ''}`}>
                <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'text-white bg-[#FF2E4C]/15 border border-[#FF2E4C]/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-[#121520]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF2E4C]' : ''}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
