'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

function safeNextPath() {
  if (typeof window === 'undefined') return '/dashboard';
  const fromUrl = new URLSearchParams(window.location.search).get('next');
  const stored = localStorage.getItem('brandbox.oauth.next');
  const value = fromUrl || stored || '/dashboard';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[\s()-]/g, '');
}

function providerNameFallback(user) {
  const metadata = user?.user_metadata || {};
  const fullName = String(metadata.full_name || metadata.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: String(metadata.given_name || metadata.first_name || fullName[0] || '').trim(),
    lastName: String(metadata.family_name || metadata.last_name || fullName.slice(1).join(' ') || '').trim(),
  };
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingFirstName, setOnboardingFirstName] = useState('');
  const [onboardingLastName, setOnboardingLastName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingWhatsapp, setOnboardingWhatsapp] = useState('');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [onboardingLegalAccepted, setOnboardingLegalAccepted] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    const resolveSession = async (session) => {
      if (!active || !session?.user) return;

      try {
        const response = await fetch('/api/v1/profile/onboarding', {
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('تعذر التحقق من اكتمال بيانات الحساب.');
        const result = await response.json();
        if (!active) return;

        if (!result.complete) {
          const fallback = providerNameFallback(session.user);
          setOnboardingFirstName(result.profile?.firstName || fallback.firstName);
          setOnboardingLastName(result.profile?.lastName || fallback.lastName);
          setOnboardingPhone(result.profile?.phone || session.user.user_metadata?.phone || '');
          setOnboardingWhatsapp(result.profile?.whatsappPhone || session.user.user_metadata?.whatsapp_phone || '');
          setOnboardingEmail(result.profile?.email || session.user.email || '');
          setOnboardingLegalAccepted(false);
          setOnboardingOpen(true);
          return;
        }

        localStorage.removeItem('brandbox.oauth.onboarding');
        router.replace(safeNextPath());
      } catch (statusError) {
        if (active) setError(statusError instanceof Error ? statusError.message : 'تعذر التحقق من الحساب.');
      }
    };

    void supabase.auth.getSession().then(({ data }) => resolveSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.setTimeout(() => void resolveSession(session), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function saveOnboarding(session, values) {
    const response = await fetch('/api/v1/profile/onboarding', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر حفظ بيانات الحساب.');
    return result;
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const supabase = createBrowserSupabaseClient();

    try {
      if (!email.trim() || password.length < 6) {
        throw new Error('أدخل بريدًا إلكترونيًا وكلمة مرور من 6 أحرف على الأقل.');
      }

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        return;
      }

      const normalizedPhone = normalizePhone(phone);
      const normalizedWhatsapp = normalizePhone(whatsapp);
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('الاسم الأول واسم العائلة مطلوبان.');
      }
      if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
        throw new Error('أدخل رقم هاتف صحيحًا.');
      }
      if (!/^\+?\d{8,15}$/.test(normalizedWhatsapp)) {
        throw new Error('رقم واتساب مطلوب ويجب أن يكون صحيحًا.');
      }
      if (!legalAccepted) {
        throw new Error('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية لإنشاء الحساب.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: normalizedPhone,
            whatsapp_phone: normalizedWhatsapp,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        await saveOnboarding(data.session, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: normalizedPhone,
          whatsappPhone: normalizedWhatsapp,
          legalAccepted: true,
        });
        router.replace(safeNextPath());
      } else {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني؛ بعد التأكيد سنوثق الموافقة ونكمل بيانات الحساب قبل الدخول.');
        setMode('login');
        setPassword('');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر إتمام العملية.');
    } finally {
      setLoading(false);
    }
  }

  async function social(provider) {
    setError('');
    const supabase = createBrowserSupabaseClient();
    try {
      const nextPath = safeNextPath();
      localStorage.setItem('brandbox.oauth.next', nextPath);
      localStorage.setItem('brandbox.oauth.onboarding', '1');
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}&social=1`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (socialError) {
      setError(socialError instanceof Error ? socialError.message : `تعذر تسجيل الدخول عبر ${provider}.`);
    }
  }

  async function completeOnboarding(event) {
    event.preventDefault();
    setOnboardingLoading(true);
    setError('');

    const normalizedPhone = normalizePhone(onboardingPhone);
    const normalizedWhatsapp = normalizePhone(onboardingWhatsapp);

    try {
      if (!onboardingFirstName.trim() || !onboardingLastName.trim()) {
        throw new Error('الاسم الأول واسم العائلة مطلوبان.');
      }
      if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
        throw new Error('رقم الهاتف مطلوب ويجب أن يكون صحيحًا.');
      }
      if (!/^\+?\d{8,15}$/.test(normalizedWhatsapp)) {
        throw new Error('رقم واتساب مطلوب ويجب أن يكون صحيحًا.');
      }
      if (!onboardingLegalAccepted) {
        throw new Error('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.');
      }

      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('انتهت جلسة تسجيل الدخول.');

      await saveOnboarding(data.session, {
        firstName: onboardingFirstName.trim(),
        lastName: onboardingLastName.trim(),
        phone: normalizedPhone,
        whatsappPhone: normalizedWhatsapp,
        legalAccepted: true,
      });

      localStorage.removeItem('brandbox.oauth.onboarding');
      setOnboardingOpen(false);
      router.replace(safeNextPath());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ بيانات الحساب.');
    } finally {
      setOnboardingLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] px-4 pb-16 pt-28 text-white sm:px-6">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[30px] border border-[#242936] bg-[#0d1018] shadow-[0_35px_100px_rgba(0,0,0,.45)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-l border-[#242936] bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.22),transparent_42%),linear-gradient(145deg,#0d1018,#090b10)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-black text-red-300">Brand Box AI</div>
            <div className="mt-10 grid grid-cols-2 gap-3">
              <div className="h-28 rounded-3xl border border-white/[.06] bg-[linear-gradient(145deg,#171a22,#0b0d12)]" />
              <div className="h-28 translate-y-7 rounded-3xl border border-[#f31325]/20 bg-[linear-gradient(145deg,#301015,#0b0d12)] shadow-[0_18px_50px_rgba(243,19,37,.08)]" />
              <div className="h-28 -translate-y-2 rounded-3xl border border-[#f31325]/15 bg-[radial-gradient(circle_at_center,rgba(243,19,37,.2),transparent_50%),#0b0d12]" />
              <div className="h-28 translate-y-5 rounded-3xl border border-white/[.06] bg-[linear-gradient(145deg,#12151c,#090a0e)]" />
            </div>
            <p className="mt-12 max-w-md text-sm leading-8 text-gray-400">حساب واحد لمشاريعك وأدوات الذكاء الاصطناعي واشتراكك ومحفظة Credit.</p>
          </div>
          <div className="text-xs leading-6 text-gray-600">نطلب بيانات اتصال مكتملة ونوثق موافقتك على السياسات قبل دخول المنصة.</div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-7 flex rounded-2xl border border-white/10 bg-[#080a0f] p-1.5">
            <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'login' ? 'bg-[#f31325] text-white' : 'text-gray-500 hover:text-gray-300'}`}>تسجيل الدخول</button>
            <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'signup' ? 'bg-[#f31325] text-white' : 'text-gray-500 hover:text-gray-300'}`}>إنشاء حساب</button>
          </div>

          {mode === 'signup' && <h1 className="text-3xl font-black">أنشئ حسابك</h1>}
          <p className={`${mode === 'signup' ? 'mt-2' : ''} text-sm leading-7 text-gray-500`}>استخدم بريدك الإلكتروني أو حساب Google أو Apple.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="الاسم الأول" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                  <input required value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="اسم العائلة" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                </div>
                <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                <input required value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="رقم واتساب +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
              </>
            )}

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4 transition focus-within:border-[#f31325]">
              <Mail size={18} className="text-gray-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني / Gmail" className="w-full bg-transparent py-4 text-sm outline-none" />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4 transition focus-within:border-[#f31325]">
              <LockKeyhole size={18} className="text-gray-500" />
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-4 text-sm outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-gray-500 transition hover:text-white" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </label>

            {mode === 'signup' && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#303747] bg-[#101319] p-4 text-xs leading-6 text-gray-400">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${legalAccepted ? 'border-amber-400 bg-amber-400 text-black' : 'border-gray-600'}`}>
                  {legalAccepted && <Check size={14} strokeWidth={3} />}
                </span>
                <input className="sr-only" type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} />
                <span>
                  أوافق على <Link href="/terms" target="_blank" className="font-black text-white underline decoration-amber-400/60 underline-offset-4">شروط الاستخدام</Link> و<Link href="/privacy" target="_blank" className="font-black text-white underline decoration-amber-400/60 underline-offset-4">سياسة الخصوصية</Link> وأفهم طريقة استخدام Credit وسياسات الباقات.
                </span>
              </label>
            )}

            {error && !onboardingOpen && <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-300">{message}</div>}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:cursor-not-allowed disabled:opacity-50">
              {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب والمتابعة'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-600"><span className="h-px flex-1 bg-[#30343e]" /><span>أو</span><span className="h-px flex-1 bg-[#30343e]" /></div>
          <div className="space-y-3">
            <button type="button" onClick={() => social('google')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#3a3f49] bg-[#101319] py-4 text-sm font-black transition hover:border-[#f31325]/50 hover:bg-[#12161d]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black text-[#4285F4]">G</span> المتابعة باستخدام Google</button>
            <button type="button" onClick={() => social('apple')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#3a3f49] bg-[#101319] py-4 text-sm font-black transition hover:border-[#f31325]/50 hover:bg-[#12161d]"><span className="text-xl">●</span> المتابعة باستخدام Apple</button>
          </div>
        </section>
      </div>

      {onboardingOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center overflow-y-auto bg-black/90 p-4 py-8">
          <form onSubmit={completeOnboarding} className="w-full max-w-lg rounded-[28px] border border-[#303747] bg-[#11151d] p-7 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300"><ShieldCheck size={16} /> إكمال الحساب مطلوب</div>
            <h2 className="mt-2 text-2xl font-black">بيانات الحساب والموافقة</h2>
            <p className="mt-2 text-sm leading-7 text-gray-500">لن يتم فتح لوحة التحكم قبل اكتمال بيانات الاتصال والموافقة على السياسات الحالية.</p>

            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required value={onboardingFirstName} onChange={(event) => setOnboardingFirstName(event.target.value)} placeholder="الاسم الأول" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
                <input required value={onboardingLastName} onChange={(event) => setOnboardingLastName(event.target.value)} placeholder="اسم العائلة" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              </div>
              <input readOnly value={onboardingEmail} placeholder="البريد الإلكتروني" dir="ltr" className="w-full cursor-not-allowed rounded-2xl border border-[#303747] bg-[#0d1016] p-4 text-sm text-gray-500 outline-none" />
              <input required value={onboardingPhone} onChange={(event) => setOnboardingPhone(event.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              <input required value={onboardingWhatsapp} onChange={(event) => setOnboardingWhatsapp(event.target.value)} placeholder="رقم واتساب +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4 text-xs leading-6 text-gray-300">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${onboardingLegalAccepted ? 'border-amber-400 bg-amber-400 text-black' : 'border-gray-600'}`}>
                {onboardingLegalAccepted && <Check size={14} strokeWidth={3} />}
              </span>
              <input className="sr-only" type="checkbox" checked={onboardingLegalAccepted} onChange={(event) => setOnboardingLegalAccepted(event.target.checked)} />
              <span>أوافق على <Link href="/terms" target="_blank" className="font-black text-white underline">شروط الاستخدام</Link> و<Link href="/privacy" target="_blank" className="font-black text-white underline">سياسة الخصوصية</Link>.</span>
            </label>

            {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

            <button disabled={onboardingLoading} className="mt-5 w-full rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">{onboardingLoading ? 'جاري الحفظ...' : 'موافقة وحفظ والمتابعة'}</button>
          </form>
        </div>
      )}
    </main>
  );
}
