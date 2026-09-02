'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Crown,
  Folder,
  ImageIcon,
  Layers3,
  Loader2,
  MessageSquare,
  Mic2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { setUserProjectFavorite } from '../lib/projects/projects-service';
import { useAuth } from '../context/AuthContext';

const TOOL_CARDS = [
  { href: '/projects/images', label: 'الصور AI', text: 'مشاريع توليد وتحرير الصور', icon: ImageIcon },
  { href: '/projects/video', label: 'الفيديو AI', text: 'مشاريع الفيديو والمشاهد', icon: Video },
  { href: '/projects/chat', label: 'الشات AI', text: 'محادثات ومشاريع المحتوى', icon: MessageSquare },
  { href: '/projects/audio', label: 'الصوت AI', text: 'مشاريع الصوت والتعليق الصوتي', icon: Mic2 },
];

const ROLE_LABELS = {
  USER: 'مستخدم',
  SUPPORT: 'مشرف',
  ADMIN: 'مدير',
  SUPER_ADMIN: 'مدير عام',
};

function projectTool(type = '') {
  if (/فيديو|video/i.test(type)) return 'video';
  if (/محادثة|chat|نص/i.test(type)) return 'chat';
  if (/صوت|audio/i.test(type)) return 'audio';
  return 'images';
}

function projectHref(project) {
  const tool = projectTool(project?.type);
  return `/projects/${tool}/workspace?project=${encodeURIComponent(project.id)}`;
}

function generationHref(item) {
  const type = item?.generation_type || 'image';
  const tool = type === 'video' ? 'video' : type === 'chat' ? 'chat' : type === 'audio' ? 'audio' : 'images';
  return item?.project_id
    ? `/projects/${tool}/workspace?project=${encodeURIComponent(item.project_id)}`
    : `/projects/${tool}`;
}

function MetricCard({ label, value, helper, action, href, icon: Icon, accent = false }) {
  return (
    <div className="bb-dashboard-metric rounded-[20px] border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="bb-text-secondary text-sm font-bold">{label}</div>
          <div className="bb-text-primary mt-4 text-3xl font-black tracking-tight">{value}</div>
          <div className="bb-text-tertiary mt-2 text-xs">{helper}</div>
        </div>
        <div className={`${accent ? 'bb-dashboard-icon-accent' : 'bb-dashboard-icon'} grid h-14 w-14 place-items-center rounded-2xl`}>
          <Icon size={27} />
        </div>
      </div>
      <div className="bb-divider mt-5 border-t pt-4">
        <Link href={href} className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-black focus-visible:outline-none ${accent ? 'bb-text-accent' : 'bb-text-secondary'}`}>
          {action}<ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bb-dashboard-skeleton h-20 animate-pulse rounded-xl border" />
      ))}
    </div>
  );
}

export default function StableUserDashboard() {
  const { user: authUser, profile: authProfile, roleLabel, creditBalance: authCredits, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [projects, setProjects] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState({ projects: 0, generations: 0 });
  const [favoriteBusy, setFavoriteBusy] = useState(() => new Set());
  const [error, setError] = useState('');
  const [errorOwnerId, setErrorOwnerId] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [dataOwnerId, setDataOwnerId] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (authLoading || !authUser?.id) return undefined;

    const targetUserId = authUser.id;

    const loadBusinessData = async () => {
      try {
        const [projectsRes, generationsRes, projectCountRes, generationCountRes, subscriptionRes] = await Promise.allSettled([
          supabase.from('projects').select('id,name,type,description,thumbnail_url,updated_at,is_favorite').eq('owner_id', targetUserId).is('deleted_at', null).order('is_favorite', { ascending: false }).order('updated_at', { ascending: false }).limit(4),
          supabase.from('generations').select('id,project_id,generation_type,prompt,created_at,result_url').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(4),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('owner_id', targetUserId).is('deleted_at', null),
          supabase.from('generations').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId),
          supabase.from('subscriptions').select('plan_id,status,created_at').eq('user_id', targetUserId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (!mounted) return;

        if (projectsRes.status === 'fulfilled' && !projectsRes.value.error) setProjects(projectsRes.value.data || []);
        if (generationsRes.status === 'fulfilled' && !generationsRes.value.error) setGenerations(generationsRes.value.data || []);
        if (subscriptionRes.status === 'fulfilled' && !subscriptionRes.value.error) setSubscription(subscriptionRes.value.data || null);
        setStats({
          projects: projectCountRes.status === 'fulfilled' && !projectCountRes.value.error ? projectCountRes.value.count || 0 : 0,
          generations: generationCountRes.status === 'fulfilled' && !generationCountRes.value.error ? generationCountRes.value.count || 0 : 0,
        });

        const hasPartialFailure = [projectsRes, generationsRes, projectCountRes, generationCountRes, subscriptionRes]
          .some((result) => result.status === 'rejected' || Boolean(result.value?.error));
        if (hasPartialFailure) {
          setErrorOwnerId(targetUserId);
          setError('تعذر تحديث بعض بيانات لوحة التحكم. يمكنك إعادة المحاولة دون مغادرة الصفحة.');
        } else {
          setErrorOwnerId(null);
          setError('');
        }
      } catch {
        if (mounted) {
          setErrorOwnerId(targetUserId);
          setError('تعذر تحميل بيانات لوحة التحكم. حاول مرة أخرى.');
        }
      } finally {
        if (mounted) {
          setDataOwnerId(targetUserId);
          setBusinessLoading(false);
        }
      }
    };

    void loadBusinessData();

    return () => {
      mounted = false;
    };
  }, [supabase, authUser?.id, authLoading, reloadTick]);

  const displayName = [authProfile?.first_name, authProfile?.last_name].filter(Boolean).join(' ')
    || authUser?.email?.split('@')[0]
    || 'المستخدم';
  const firstName = authProfile?.first_name || displayName.split(' ')[0] || 'المستخدم';
  const credits = authCredits ?? 0;
  const currentRoleLabel = roleLabel || (authProfile?.role ? (ROLE_LABELS[authProfile.role] || 'مستخدم') : 'مستخدم');
  const businessReady = Boolean(authUser?.id && dataOwnerId === authUser.id && !businessLoading);
  const visibleError = Boolean(authUser?.id && errorOwnerId === authUser.id && error);
  const planLabel = businessReady ? String(subscription?.plan_id || 'FREE').toUpperCase() : '—';
  const planHelper = businessReady
    ? (subscription ? 'الخطة النشطة في حسابك' : 'ابدأ بالخطة المناسبة لاحتياجك')
    : 'جار تحديث بيانات الخطة';
  const planAction = subscription ? 'عرض الباقات' : 'استكشف الباقات';

  function retryBusinessData() {
    setBusinessLoading(true);
    setDataOwnerId(null);
    setErrorOwnerId(null);
    setError('');
    setReloadTick((value) => value + 1);
  }

  async function toggleFavorite(project) {
    if (favoriteBusy.has(project.id)) return;
    setFavoriteBusy((current) => new Set(current).add(project.id));
    setErrorOwnerId(null);
    setError('');
    try {
      const updated = await setUserProjectFavorite(project.id, !project.is_favorite);
      setProjects((current) => current
        .map((item) => item.id === project.id ? { ...item, is_favorite: Boolean(updated?.is_favorite) } : item)
        .sort((a, b) => Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite)) || new Date(b.updated_at || 0) - new Date(a.updated_at || 0)));
    } catch {
      setErrorOwnerId(authUser?.id || null);
      setError('تعذر تحديث المفضلة. حاول مرة أخرى.');
    } finally {
      setFavoriteBusy((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  if (authLoading) {
    return (
      <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
        <div className="flex min-h-[65vh] items-center justify-center" aria-live="polite">
          <div className="bb-text-secondary flex items-center gap-3 text-sm font-bold"><Loader2 className="bb-text-accent h-7 w-7 animate-spin" /> جار تجهيز حسابك...</div>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)] px-5 py-12">
        <div className="bb-panel mx-auto max-w-lg rounded-3xl border p-8 text-center">
          <h1 className="bb-text-primary text-2xl font-black">لوحة تحكم Brand Box</h1>
          <p className="bb-text-secondary mt-3 text-sm leading-7">يلزم تسجيل الدخول لعرض مساحة العمل الخاصة بك.</p>
          <Link href="/auth?next=%2Fdashboard" className="bb-button-primary mt-6 inline-flex min-h-11 items-center rounded-xl px-6 py-3 text-sm font-black">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
        {visibleError && (
          <div className="bb-danger-surface mb-4 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
            <button type="button" onClick={retryBusinessData} className="bb-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition">
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          </div>
        )}

        <section className="bb-dashboard-hero relative overflow-hidden rounded-[24px] border px-6 py-8 sm:px-9 lg:min-h-[190px] lg:px-16 lg:py-10">
          <div className="bb-dashboard-hero-ornament absolute left-12 top-1/2 hidden h-28 w-28 -translate-y-1/2 rotate-45 rounded-[22px] border lg:block" />
          <div className="bb-accent-soft absolute left-28 top-1/2 hidden -translate-y-1/2 rounded-xl border px-3 py-2 text-xl font-black lg:block">AI</div>
          <div className="relative z-10 max-w-3xl">
            <div className="bb-text-accent mb-3 text-xs font-black">{currentRoleLabel} · {planLabel}</div>
            <h1 className="bb-text-primary text-3xl font-black sm:text-4xl lg:text-5xl">مرحبًا بك، {firstName}</h1>
            <p className="bb-text-secondary mt-4 text-sm leading-7 sm:text-base">ابدأ من الأداة المناسبة، أو افتح أحد مشاريعك الأخيرة وواصل العمل مباشرة.</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy={!businessReady}>
          <MetricCard label="الاشتراك" value={planLabel} helper={planHelper} action={planAction} href="/pricing" icon={Crown} accent />
          <MetricCard label="عمليات التوليد" value={businessReady ? stats.generations.toLocaleString('ar-LY') : '—'} helper={businessReady ? 'إجمالي العمليات في حسابك' : 'جار تحديث النشاط'} action="فتح المشاريع" href="/projects" icon={TrendingUp} accent />
          <MetricCard label="المشاريع" value={businessReady ? stats.projects.toLocaleString('ar-LY') : '—'} helper={businessReady ? 'المشاريع النشطة فقط' : 'جار تحديث المشاريع'} action="عرض المشاريع" href="/projects" icon={Folder} />
          <MetricCard label="الرصيد" value={credits.toLocaleString('ar-LY')} helper="نقطة متاحة للاستخدام" action="شحن الرصيد" href="/pricing" icon={Wallet} accent />
        </section>

        <section className="bb-panel mt-4 rounded-[22px] border p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><div className="bb-text-accent text-xs font-black">ابدأ الآن</div><h2 className="bb-text-primary mt-1 text-xl font-black">مساحات الذكاء الاصطناعي</h2></div>
            <Link href="/projects" className="bb-text-tertiary bb-hoverable inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-black transition focus-visible:outline-none">عرض كل المشاريع</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TOOL_CARDS.map(({ href, label, text, icon: Icon }) => (
              <Link key={href} href={href} className="bb-card group rounded-[18px] border p-5 transition hover:-translate-y-0.5 focus-visible:outline-none">
                <div className="flex items-start gap-4">
                  <div className="bb-accent-soft grid h-12 w-12 shrink-0 place-items-center rounded-2xl"><Icon size={25} /></div>
                  <div><h3 className="bb-text-primary text-lg font-black">{label}</h3><p className="bb-text-tertiary mt-1 text-xs leading-6">{text}</p></div>
                </div>
                <div className="bb-divider bb-text-accent mt-5 flex items-center gap-2 border-t pt-4 text-sm font-black">فتح المساحة <ArrowLeft size={15} /></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.65fr]">
          <div className="bb-panel rounded-[22px] border p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="bb-text-primary text-lg font-black">التوليدات الأخيرة</h3><Link href="/projects" className="bb-text-accent inline-flex min-h-10 items-center text-xs font-black">عرض المشاريع</Link></div>
            <div className="mt-4" aria-live="polite">
              {!businessReady ? (
                <LoadingRows />
              ) : generations.length === 0 ? (
                <div className="bb-dashboard-empty rounded-2xl border border-dashed px-4 py-8 text-center">
                  <div className="bb-text-secondary text-sm font-bold">لا توجد توليدات بعد.</div>
                  <Link href="/projects/images" className="bb-button-primary mt-4 inline-flex min-h-10 items-center rounded-xl px-4 text-xs font-black">ابدأ أول توليد</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((item) => (
                    <Link key={item.id} href={generationHref(item)} className="bb-dashboard-row flex items-center gap-3 rounded-xl border p-3 transition focus-visible:outline-none">
                      <div className="bb-media-canvas grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg">
                        {item.result_url && item.generation_type === 'image' ? <img src={item.result_url} alt="" className="h-full w-full object-cover" /> : item.generation_type === 'video' ? <PlayCircle size={25} /> : item.generation_type === 'chat' ? <MessageSquare size={23} /> : item.generation_type === 'audio' ? <Mic2 size={23} /> : <ImageIcon size={23} />}
                      </div>
                      <div className="min-w-0 flex-1"><div className="bb-text-primary truncate text-sm font-bold">{item.prompt || 'توليد جديد'}</div><div className="bb-text-tertiary mt-1 text-[11px]">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : 'أحدث نشاط'}</div></div>
                      <ArrowLeft size={16} className="bb-text-disabled shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bb-panel rounded-[22px] border p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="bb-text-primary text-lg font-black">المشاريع الأخيرة</h3><Link href="/projects" className="bb-text-accent inline-flex min-h-10 items-center text-xs font-black">عرض الكل</Link></div>
            {!businessReady ? (
              <div className="mt-4"><LoadingRows count={2} /></div>
            ) : projects.length === 0 ? (
              <Link href="/projects" className="bb-dashboard-empty mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed px-5 text-center text-sm font-bold transition focus-visible:outline-none">اختر مساحة AI وأنشئ أول مشروع</Link>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {projects.map((project) => (
                  <article key={project.id} className="bb-card group overflow-hidden rounded-xl border transition">
                    <div className="bb-media-canvas relative h-32 overflow-hidden">
                      <Link href={projectHref(project)} className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset">
                        {project.thumbnail_url ? <img src={project.thumbnail_url} alt={project.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center"><Sparkles size={38} /></div>}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(project)}
                        disabled={favoriteBusy.has(project.id)}
                        className={`absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full border transition focus-visible:outline-none ${project.is_favorite ? 'bb-button-primary' : 'bb-media-control'}`}
                        title={project.is_favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                        aria-label={project.is_favorite ? `إزالة ${project.name} من المفضلة` : `إضافة ${project.name} إلى المفضلة`}
                      >
                        {favoriteBusy.has(project.id) ? <Loader2 size={14} className="animate-spin" /> : <Star size={15} fill={project.is_favorite ? 'currentColor' : 'none'} />}
                      </button>
                    </div>
                    <Link href={projectHref(project)} className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset">
                      <div className="bb-text-primary truncate font-black">{project.name}</div>
                      <div className="bb-text-tertiary mt-1 text-[11px]">{project.type || 'مشروع'}</div>
                      <div className="bb-text-accent mt-3 flex items-center gap-1.5 text-xs font-black">فتح المشروع <ArrowLeft size={13} /></div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/templates" className="bb-card group rounded-[22px] border p-6 transition focus-visible:outline-none">
            <div className="flex items-center gap-4"><div className="bb-dashboard-icon grid h-12 w-12 place-items-center rounded-2xl"><Layers3 size={24} /></div><div><h3 className="bb-text-primary font-black">مكتبة القوالب</h3><p className="bb-text-tertiary mt-1 text-xs">ابدأ من قالب جاهز ثم خصّصه لمشروعك.</p></div></div>
          </Link>
          <Link href="/dashboard/account" className="bb-card group rounded-[22px] border p-6 transition focus-visible:outline-none">
            <div className="flex items-center gap-4"><div className="bb-accent-soft grid h-12 w-12 place-items-center rounded-2xl"><Sparkles size={24} /></div><div><h3 className="bb-text-primary font-black">إعدادات الحساب</h3><p className="bb-text-tertiary mt-1 text-xs">الصورة الشخصية وبيانات الاتصال وتفضيلات الحساب.</p></div></div>
          </Link>
        </section>
      </div>
    </main>
  );
}
