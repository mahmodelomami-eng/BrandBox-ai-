'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const FALLBACK_PLANS = [
  { id: 'free', name: 'المجانية', description: 'مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.', priceMonthlyLYD: 0, monthlyCredits: 50, maxProjects: 2, videoAccess: false, brandKitAccess: true, commercialUsage: false },
  { id: 'starter', name: 'الأساسية', description: 'للمستقلين وصناع المحتوى الناشئين.', priceMonthlyLYD: 45, monthlyCredits: 200, maxProjects: 5, videoAccess: false, brandKitAccess: true, commercialUsage: true },
  { id: 'pro', name: 'الاحترافية', description: 'الخيار الأفضل للشركات الناشئة والمصممين المحترفين.', priceMonthlyLYD: 145, monthlyCredits: 1000, maxProjects: 25, videoAccess: true, brandKitAccess: true, commercialUsage: true },
  { id: 'business', name: 'الأعمال', description: 'للوكالات الرقمية والفرق التسويقية التنافسية.', priceMonthlyLYD: 395, monthlyCredits: 5000, maxProjects: 100, videoAccess: true, brandKitAccess: true, commercialUsage: true },
];

function features(plan) {
  return [
    `${plan.monthlyCredits.toLocaleString('ar-LY')} نقطة شهريًا`,
    `حتى ${plan.maxProjects.toLocaleString('ar-LY')} مشروع`,
    plan.brandKitAccess ? 'مدير الهوية البصرية Brand Kit' : 'أدوات الهوية الأساسية',
    plan.videoAccess ? 'الوصول إلى أدوات الفيديو AI' : 'الصور AI وشات AI',
    plan.commercialUsage ? 'استخدام تجاري للمخرجات' : 'مناسبة للتجربة الشخصية',
  ];
}

function AuthModal({ plan, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const supabase = createBrowserSupabaseClient();
    try {
      if (!email.trim() || password.length < 6) throw new Error('أدخل بريدًا إلكترونيًا وكلمة مرور من 6 أحرف على الأقل.');
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        onAuthenticated();
        return;
      }

      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      const normalizedWhatsapp = whatsapp.trim().replace(/[\s()-]/g, '');
      if (!firstName.trim() || !lastName.trim() || !/^\+?\d{8,15}$/.test(normalizedPhone)) {
        throw new Error('أدخل الاسم الأول واسم العائلة ورقم هاتف صحيحًا.');
      }
      if (normalizedWhatsapp && !/^\+?\d{8,15}$/.test(normalizedWhatsapp)) throw new Error('رقم واتساب غير صحيح.');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: normalizedPhone } },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        if (normalizedWhatsapp) {
          await supabase.from('profiles').update({ whatsapp_phone: normalizedWhatsapp, onboarding_completed_at: new Date().toISOString() }).eq('id', data.user.id);
        }
        onAuthenticated();
      } else {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول لإكمال الاشتراك.');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إتمام العملية.');
    } finally {
      setLoading(false);
    }
  }

  async function social(provider) {
    setError('');
    const supabase = createBrowserSupabaseClient();
    try {
      localStorage.setItem('brandbox.oauth.next', '/pricing');
      localStorage.setItem('brandbox.oauth.plan', plan.id);
      localStorage.setItem('brandbox.oauth.onboarding', '1');
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent('/pricing')}&social=1`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : `تعذر تسجيل الدخول عبر ${provider}. تأكد من تفعيل المزود.`);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" dir="rtl">
      <div className="relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#30343e] bg-[#101217] p-6 shadow-2xl sm:p-8">
        <button onClick={onClose} className="absolute left-5 top-5 rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="إغلاق"><X size={19} /></button>
        <div className="text-xs font-black text-[#ff3344]">إكمال الاشتراك في {plan.name}</div>
        <h2 className="mt-3 text-3xl font-black text-white">{mode === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}</h2>
        <p className="mt-2 text-sm text-gray-500">سجّل الدخول أولًا، ثم نحتفظ بالباقة التي اخترتها.</p>

        <div className="mt-6 flex rounded-xl border border-white/10 bg-[#090b10] p-1">
          <button onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2.5 text-xs font-black ${mode === 'login' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>تسجيل الدخول</button>
          <button onClick={() => setMode('signup')} className={`flex-1 rounded-lg py-2.5 text-xs font-black ${mode === 'signup' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>إنشاء حساب</button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === 'signup' && <>
            <div className="grid grid-cols-2 gap-3">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="الاسم الأول" className="rounded-xl border border-[#303747] bg-[#171a21] p-3.5 text-sm outline-none focus:border-[#f31325]" />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="اسم العائلة" className="rounded-xl border border-[#303747] bg-[#171a21] p-3.5 text-sm outline-none focus:border-[#f31325]" />
            </div>
            <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف +218..." className="w-full rounded-xl border border-[#303747] bg-[#171a21] p-3.5 text-sm outline-none focus:border-[#f31325]" />
            <input dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="رقم واتساب - اختياري" className="w-full rounded-xl border border-[#303747] bg-[#171a21] p-3.5 text-sm outline-none focus:border-[#f31325]" />
          </>}
          <label className="flex items-center gap-3 rounded-xl border border-[#303747] bg-[#171a21] px-4"><Mail size={17} className="text-gray-500" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني / Gmail" className="w-full bg-transparent py-3.5 text-sm outline-none" /></label>
          <label className="flex items-center gap-3 rounded-xl border border-[#303747] bg-[#171a21] px-4"><LockKeyhole size={17} className="text-gray-500" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-3.5 text-sm outline-none" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-500">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></label>
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">{message}</div>}
          <button disabled={loading} className="w-full rounded-xl bg-[#f31325] py-3.5 text-sm font-black text-white hover:bg-[#ff2637] disabled:opacity-50">{loading ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول والمتابعة' : 'إنشاء الحساب والمتابعة'}</button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-600"><span className="h-px flex-1 bg-[#30343e]" /><span>أو</span><span className="h-px flex-1 bg-[#30343e]" /></div>
        <div className="space-y-3">
          <button onClick={() => social('google')} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#363b47] bg-[#12151b] py-3.5 text-sm font-black text-white transition hover:border-[#f31325]/50"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-black text-[#4285F4]">G</span> المتابعة باستخدام Google</button>
          <button onClick={() => social('apple')} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#363b47] bg-[#12151b] py-3.5 text-sm font-black text-white transition hover:border-[#f31325]/50"><span className="text-xl">●</span> المتابعة باستخدام Apple</button>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [billing, setBilling] = useState('monthly');
  const [session, setSession] = useState(null);
  const [authPlan, setAuthPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserSupabaseClient();
    Promise.all([
      fetch('/api/v1/plans', { cache: 'no-store' }).then((response) => response.json()).catch(() => null),
      supabase.auth.getSession(),
    ]).then(([catalog, auth]) => {
      if (!mounted) return;
      if (catalog?.plans?.length) setPlans(catalog.plans);
      setSession(auth.data.session || null);
      const pendingPlanId = localStorage.getItem('brandbox.oauth.plan');
      if (auth.data.session && pendingPlanId) {
        const pending = (catalog?.plans || FALLBACK_PLANS).find((plan) => plan.id === pendingPlanId);
        if (pending) setSelectedPlan(pending);
        localStorage.removeItem('brandbox.oauth.plan');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  function subscribe(plan) {
    if (!session?.user) {
      setAuthPlan(plan);
      return;
    }
    localStorage.setItem('brandbox.pending.subscription.plan', plan.id);
    setSelectedPlan(plan);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#080a0e] px-4 pb-20 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="text-center">
          <div className="text-xs font-black text-[#ff3344]">خطط Brand Box AI</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">أسعار بسيطة وواضحة</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-500">اختر الباقة التي تناسب حجم عملك. الأسعار والنقاط تُقرأ من نظام الخطط الحالي للمنصة.</p>
          <div className="mx-auto mt-7 inline-flex rounded-xl border border-[#3a3f49] bg-[#111318] p-1">
            <button onClick={() => setBilling('monthly')} className={`rounded-lg px-7 py-2.5 text-xs font-black ${billing === 'monthly' ? 'bg-[#292d35] text-white' : 'text-gray-500'}`}>شهري</button>
            <button onClick={() => setBilling('yearly')} className={`rounded-lg px-7 py-2.5 text-xs font-black ${billing === 'yearly' ? 'bg-[#292d35] text-white' : 'text-gray-500'}`}>سنوي</button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const popular = plan.id === 'pro';
            const price = billing === 'yearly' ? plan.priceMonthlyLYD * 12 : plan.priceMonthlyLYD;
            return (
              <article key={plan.id} className={`relative flex min-h-[520px] flex-col rounded-[24px] border bg-[#11141a] p-6 shadow-[0_24px_70px_rgba(0,0,0,.28)] ${popular ? 'border-[#f31325] shadow-[0_0_42px_rgba(243,19,37,.12)]' : 'border-[#333842]'}`}>
                {popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-lg bg-[#f31325] px-6 py-2 text-[11px] font-black text-white">الأكثر شعبية</div>}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-[#ff3344]"><Crown size={20} /></div>
                <h2 className="mt-5 text-2xl font-black">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-xs leading-6 text-gray-500">{plan.description}</p>
                <div className="mt-5 flex items-end gap-2"><strong className="text-4xl font-black">{price.toLocaleString('ar-LY')}</strong><span className="pb-1 text-xs text-gray-500">د.ل / {billing === 'yearly' ? 'سنة' : 'شهر'}</span></div>
                {billing === 'yearly' && plan.priceMonthlyLYD > 0 && <div className="mt-2 text-[10px] text-gray-600">إجمالي 12 شهرًا دون خصم إضافي</div>}
                <div className="mt-7 space-y-3">
                  {features(plan).map((feature) => <div key={feature} className="flex items-center gap-3 text-xs text-gray-300"><Check size={16} className="shrink-0 text-[#ff3344]" /><span>{feature}</span></div>)}
                </div>
                <button onClick={() => subscribe(plan)} className={`mt-auto w-full rounded-xl py-3.5 text-sm font-black transition ${popular ? 'bg-[#f31325] text-white hover:bg-[#ff2637]' : 'border border-[#444a55] bg-[#0c0e12] text-white hover:border-[#f31325]'}`}>{plan.id === 'free' ? 'ابدأ مجانًا' : 'اشترك الآن'}</button>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid overflow-hidden rounded-2xl border border-[#30343e] bg-[#101217] sm:grid-cols-2 lg:grid-cols-4">
          {[['دفع محلي','الأسعار بالدينار الليبي'],['بيانات محمية','صلاحيات وحماية على الخادم'],['إلغاء مرن','إدارة خطتك من حسابك'],['دعم Brand Box','مساعدة عند الحاجة']].map(([title,sub]) => <div key={title} className="flex items-center gap-3 border-b border-[#30343e] p-5 last:border-b-0 sm:border-l lg:border-b-0"><ShieldCheck className="text-[#ff3344]" size={22} /><div><div className="text-xs font-black">{title}</div><div className="mt-1 text-[10px] text-gray-500">{sub}</div></div></div>)}
        </div>
      </div>

      {authPlan && <AuthModal plan={authPlan} onClose={() => setAuthPlan(null)} onAuthenticated={() => { setAuthPlan(null); setSession({ user: true }); localStorage.setItem('brandbox.pending.subscription.plan', authPlan.id); setSelectedPlan(authPlan); }} />}

      {selectedPlan && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" dir="rtl">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#30343e] bg-[#11141a] p-7 text-center shadow-2xl">
            <button onClick={() => setSelectedPlan(null)} className="absolute left-4 top-4 p-2 text-gray-500 hover:text-white"><X size={18} /></button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f31325]/10 text-[#ff3344]"><Sparkles size={28} /></div>
            <h3 className="mt-5 text-2xl font-black">تم اختيار باقة {selectedPlan.name}</h3>
            <p className="mt-3 text-sm leading-7 text-gray-500">تم حفظ اختيارك في حسابك الحالي. ستبقى عملية الدفع والتفعيل خاضعة لمسار الدفع المعتمد للمنصة.</p>
            <button onClick={() => window.location.assign('/')} className="mt-6 w-full rounded-xl bg-[#f31325] py-3.5 text-sm font-black text-white">العودة إلى حسابي</button>
          </div>
        </div>
      )}
    </main>
  );
}
