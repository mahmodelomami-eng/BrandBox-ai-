'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ChevronLeft,
  CircleUserRound,
  CreditCard,
  LayoutDashboard,
  Menu,
  Palette,
  Printer,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const userNav = [
  { href: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/projects', label: 'اختيار الأداة', icon: WandSparkles },
  { href: '/dashboard/brand', label: 'الهوية والعلامة التجارية', icon: Palette },
  { href: '/dashboard/marketing', label: 'التسويق والمحتوى', icon: BriefcaseBusiness },
  { href: '/dashboard/print', label: 'الطباعة والإنتاج', icon: Printer },
  { href: '/dashboard/commerce', label: 'المتجر والمشتريات', icon: ShoppingBag },
  { href: '/dashboard/account', label: 'الحساب والرصيد', icon: CircleUserRound },
];

const adminNav = [
  { href: '/admin', label: 'مركز الإدارة', icon: ShieldCheck },
  { href: '/admin/users', label: 'المستخدمون والصلاحيات', icon: Users },
  { href: '/admin/ai', label: 'الذكاء الاصطناعي والنماذج', icon: Sparkles },
  { href: '/admin/finance', label: 'المالية والاشتراكات', icon: CreditCard },
  { href: '/admin/content', label: 'المحتوى والتسويق', icon: Boxes },
  { href: '/admin/operations', label: 'التشغيل والتحليلات', icon: BarChart3 },
  { href: '/admin/settings', label: 'إعدادات المنصة', icon: Settings },
];

const elevatedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);

export default function WorkspaceDashboardShell({ children, admin = false, title, subtitle }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const nextSession = data.session || null;
      setSession(nextSession);

      if (nextSession?.user) {
        const { data: nextProfile } = await supabase
          .from('profiles')
          .select('first_name,last_name,avatar_url,role,credit_balance,status')
          .eq('id', nextSession.user.id)
          .maybeSingle();
        if (mounted) setProfile(nextProfile || null);
      }

      if (mounted) setLoading(false);
    })();

    return () => { mounted = false; };
  }, [supabase]);

  const role = profile?.role || 'USER';
  const canAdmin = elevatedRoles.has(role);
  const links = admin ? adminNav : userNav;
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || session?.user?.email?.split('@')[0]
    || 'المستخدم';

  if (loading) {
    return <div className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] text-white"><div className="rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm text-gray-400">جاري تجهيز لوحة التحكم...</div></div>;
  }

  if (!session?.user) {
    return (
      <div dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#10131a] p-8 text-center">
          <h1 className="text-2xl font-black">يلزم تسجيل الدخول</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">سجّل الدخول للوصول إلى لوحة التحكم ومساحات العمل الخاصة بك.</p>
          <Link href="/auth?next=%2Fdashboard" className="mt-6 inline-flex rounded-xl bg-[#f31325] px-6 py-3 text-sm font-black">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  if (admin && !canAdmin) {
    return (
      <div dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/25 bg-[#11131a] p-8 text-center">
          <ShieldCheck className="mx-auto text-[#ff3344]" size={38} />
          <h1 className="mt-4 text-2xl font-black">هذه مساحة إدارية</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">حسابك الحالي بدور {role} ولا يملك صلاحية دخول مركز الإدارة.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-white/10 px-6 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] text-white">
      <div className="mx-auto flex max-w-[1700px]">
        <aside className="hidden min-h-[calc(100vh-5rem)] w-72 shrink-0 border-l border-white/5 bg-[#0b0d12] p-4 lg:block">
          <Sidebar links={links} pathname={pathname} admin={admin} canAdmin={canAdmin} displayName={displayName} profile={profile} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-20 z-30 border-b border-white/5 bg-[#07090d] px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl border border-white/10 p-2.5 lg:hidden" aria-label="فتح قائمة لوحة التحكم"><Menu size={20} /></button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black sm:text-2xl">{title}</h1>
                {subtitle && <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>}
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-gray-300">{role}</span>
                <span className="rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 px-3 py-2 text-xs font-black text-[#ff6674]">{Number(profile?.credit_balance || 0).toLocaleString('ar-LY')} نقطة</span>
              </div>
            </div>
          </header>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[150] bg-black/70 lg:hidden" aria-label="إغلاق القائمة" />}
      <aside className={`fixed right-0 top-20 z-[160] h-[calc(100vh-5rem)] w-[86vw] max-w-80 border-l border-white/10 bg-[#0b0d12] p-4 shadow-2xl transition-transform lg:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button type="button" onClick={() => setMenuOpen(false)} className="mb-4 rounded-xl border border-white/10 p-2.5" aria-label="إغلاق"><X size={20} /></button>
        <Sidebar links={links} pathname={pathname} admin={admin} canAdmin={canAdmin} displayName={displayName} profile={profile} onNavigate={() => setMenuOpen(false)} />
      </aside>
    </div>
  );
}

function Sidebar({ links, pathname, admin, canAdmin, displayName, profile, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 rounded-2xl border border-white/10 bg-[#11141b] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-[#f31325] font-black">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="صورة المستخدم" className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0"><div className="truncate text-sm font-black">{displayName}</div><div className="mt-1 text-[10px] text-gray-500">{admin ? 'مساحة الإدارة' : 'مساحة المستخدم'}</div></div>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? 'bg-[#f31325] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} /><span className="flex-1">{label}</span>{active && <ChevronLeft size={15} />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 pt-4">
        {admin ? (
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><LayoutDashboard size={18} />لوحة المستخدم</Link>
        ) : canAdmin ? (
          <Link href="/?view=admin" onClick={onNavigate} className="flex items-center gap-3 rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-3 py-3 text-sm font-black text-[#ff6674]"><ShieldCheck size={18} />مركز الإدارة</Link>
        ) : null}
      </div>
    </div>
  );
}
