'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CircleUserRound, CreditCard, FolderOpen, ImageIcon, LayoutDashboard, Menu,
  MessageSquare, Palette, Printer, ShoppingBag, Sparkles, Video, WandSparkles, X
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const nav = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/projects', label: 'مشاريعي', icon: FolderOpen },
  { href: '/dashboard/studio', label: 'استوديو AI', icon: WandSparkles },
  { href: '/dashboard/brand', label: 'الهوية والعلامة', icon: Palette },
  { href: '/dashboard/marketing', label: 'التسويق والمحتوى', icon: Sparkles },
  { href: '/dashboard/print', label: 'الطباعة والإنتاج', icon: Printer },
  { href: '/dashboard/commerce', label: 'المتجر والمشتريات', icon: ShoppingBag },
  { href: '/dashboard/account', label: 'الحساب والرصيد', icon: CircleUserRound },
];

const tools = [
  { href: '/images-ai', label: 'الصور AI', text: 'توليد وتحرير الصور والتصاميم', icon: ImageIcon },
  { href: '/video-ai', label: 'الفيديو AI', text: 'إنشاء الفيديو والمشاهد', icon: Video },
  { href: '/chat-ai', label: 'شات AI', text: 'الكتابة والمساعدة الذكية', icon: MessageSquare },
  { href: '/projects', label: 'المشاريع', text: 'إدارة جميع أعمالك', icon: FolderOpen },
];

export default function StableUserDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ projects: 0, generations: 0, assets: 0 });

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => mounted && setResolved(true), 1800);

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const current = data.session || null;
        setSession(current);
        setResolved(true);
        if (!current?.user) return;

        const [profileRes, projectsRes, generationsRes, assetsRes] = await Promise.allSettled([
          supabase.from('profiles').select('first_name,last_name,avatar_url,role,credit_balance,status').eq('id', current.user.id).maybeSingle(),
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('generations').select('id', { count: 'exact', head: true }),
          supabase.from('assets').select('id', { count: 'exact', head: true }),
        ]);
        if (!mounted) return;
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data || null);
        setStats({
          projects: projectsRes.status === 'fulfilled' ? projectsRes.value.count || 0 : 0,
          generations: generationsRes.status === 'fulfilled' ? generationsRes.value.count || 0 : 0,
          assets: assetsRes.status === 'fulfilled' ? assetsRes.value.count || 0 : 0,
        });
      } catch (error) {
        console.error('Dashboard session load error:', error);
        if (mounted) setResolved(true);
      }
    };

    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next || null);
      setResolved(true);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || session?.user?.email?.split('@')[0] || 'المستخدم';
  const credits = Number(profile?.credit_balance || 0);
  const role = profile?.role || 'USER';
  const canAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role);

  if (resolved && !session?.user) {
    return (
      <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] px-5 py-12 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#10131a] p-8 text-center">
          <h1 className="text-2xl font-black">لوحة تحكم Brand Box</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">يلزم تسجيل الدخول لعرض لوحة التحكم الخاصة بك.</p>
          <Link href="/auth?next=%2Fdashboard" className="mt-6 inline-flex rounded-xl bg-[#f31325] px-6 py-3 text-sm font-black">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  return (
    <div dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#07090d] text-white">
      <div className="mx-auto flex max-w-[1700px]">
        <aside className="hidden min-h-[calc(100vh-5rem)] w-72 shrink-0 border-l border-white/5 bg-[#0b0d12] p-4 lg:flex lg:flex-col">
          <Sidebar displayName={displayName} role={role} canAdmin={canAdmin} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-20 z-30 border-b border-white/5 bg-[#07090d]/95 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl border border-white/10 p-2.5 lg:hidden" aria-label="فتح قائمة لوحة التحكم"><Menu size={20}/></button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-black sm:text-2xl">لوحة تحكم المستخدم</h1>
                <p className="mt-1 text-xs text-gray-500">مساحة العمل الرئيسية داخل Brand Box AI</p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <span className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-gray-300">{role}</span>
                <span className="rounded-xl border border-[#f31325]/20 bg-[#f31325]/10 px-3 py-2 text-xs font-black text-[#ff6674]">{credits.toLocaleString('ar-LY')} نقطة</span>
              </div>
            </div>
          </header>

          <div className="space-y-7 p-4 sm:p-6 lg:p-8">
            {!resolved && <div className="rounded-2xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs text-gray-400">جاري مزامنة بيانات الحساب...</div>}

            <section className="overflow-hidden rounded-3xl border border-[#f31325]/20 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_35%),#10131a] p-6 sm:p-8">
              <div className="text-xs font-black text-[#ff6674]">BRAND BOX WORKSPACE</div>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">مرحبًا {displayName}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">من هنا تدير مشاريعك وأدوات الذكاء الاصطناعي والهوية والتسويق والطباعة والمشتريات من مساحة واحدة.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/projects" className="rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black">فتح مشاريعي</Link>
                <Link href="/dashboard/studio" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black">استوديو AI</Link>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['الرصيد', credits.toLocaleString('ar-LY'), 'نقطة'],
                ['المشاريع', stats.projects.toLocaleString('ar-LY'), 'مشروع'],
                ['عمليات التوليد', stats.generations.toLocaleString('ar-LY'), 'عملية'],
                ['الأصول', stats.assets.toLocaleString('ar-LY'), 'ملف'],
              ].map(([label, value, unit]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#10131a] p-5"><div className="text-xs text-gray-500">{label}</div><div className="mt-3 text-3xl font-black">{value}</div><div className="mt-1 text-[11px] text-gray-600">{unit}</div></div>)}
            </section>

            <section>
              <h3 className="text-xl font-black">أدوات المنصة</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {tools.map(({ href, label, text, icon: Icon }) => <Link key={href} href={href} className="rounded-2xl border border-white/10 bg-[#10131a] p-5 transition hover:border-[#f31325]/40"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={21}/></span><div className="mt-4 font-black">{label}</div><div className="mt-2 text-xs leading-6 text-gray-500">{text}</div></Link>)}
              </div>
            </section>
          </div>
        </main>
      </div>

      {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[150] bg-black/70 lg:hidden" aria-label="إغلاق القائمة"/>}
      <aside className={`fixed right-0 top-20 z-[160] h-[calc(100vh-5rem)] w-[86vw] max-w-80 border-l border-white/10 bg-[#0b0d12] p-4 shadow-2xl transition-transform lg:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button type="button" onClick={() => setMenuOpen(false)} className="mb-4 rounded-xl border border-white/10 p-2.5" aria-label="إغلاق"><X size={20}/></button>
        <Sidebar displayName={displayName} role={role} canAdmin={canAdmin} onNavigate={() => setMenuOpen(false)} />
      </aside>
    </div>
  );
}

function Sidebar({ displayName, role, canAdmin, onNavigate }) {
  return <div className="flex h-full flex-col">
    <div className="mb-5 rounded-2xl border border-white/10 bg-[#11141b] p-4">
      <div className="text-sm font-black">{displayName}</div>
      <div className="mt-1 text-[10px] text-gray-500">{role}</div>
    </div>
    <nav className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-gray-400 transition hover:bg-white/5 hover:text-white"><Icon size={18}/><span>{label}</span></Link>)}
    </nav>
    <div className="mt-auto border-t border-white/5 pt-4">
      {canAdmin && <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 rounded-xl border border-[#f31325]/20 bg-[#f31325]/5 px-3 py-3 text-sm font-black text-[#ff6674]"><CreditCard size={18}/>مركز الإدارة</Link>}
    </div>
  </div>;
}
