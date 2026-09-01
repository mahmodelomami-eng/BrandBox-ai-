'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { isActiveProfileStatus } from '../../lib/auth/user-status';

function safeNextPath() {
  if (typeof window === 'undefined') return '/dashboard';
  const fromUrl = new URLSearchParams(window.location.search).get('next');
  const stored = localStorage.getItem('brandbox.oauth.next');
  const value = fromUrl || stored || '/dashboard';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

function accountAccessMessage(status) {
  if (status === 'suspended') return 'تم إيقاف هذا الحساب مؤقتًا. تواصل مع الدعم إذا كنت تعتقد أن ذلك حدث بالخطأ.';
  if (status === 'pending') return 'هذا الحساب قيد المراجعة حاليًا. ستتمكن من الدخول بعد تفعيله.';
  return 'تعذر التحقق من أن الحساب مفعّل. أعد المحاولة لاحقًا أو تواصل مع الدعم.';
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingWhatsapp, setOnboardingWhatsapp] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    const initialParams = new URLSearchParams(window.location.search);
    const accountReason = initialParams.get('account');
    if (accountReason) window.setTimeout(() => active && setError(accountAccessMessage(accountReason)), 0);

    const resolveSession = async (session) => {
      if (!active || !session?.user) return;
      const params = new URLSearchParams(window.location.search);
      const socialRequested = localStorage.getItem('brandbox.oauth.onboarding') === '1' || params.get('social') === '1';
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status,phone,whatsapp_phone,onboarding_completed_at')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError || !isActiveProfileStatus(profile?.status)) {
        localStorage.removeItem('brandbox.oauth.onboarding');
        setOnboardingOpen(false);
        await supabase.auth.signOut();
        if (!active) return;
        setError(accountAccessMessage(profile?.status));
        return;
      }

      if (socialRequested && (!profile?.phone || !profile?.onboarding_completed_at)) {
        setOnboardingPhone(profile?.phone || '');
        setOnboardingWhatsapp(profile?.whatsapp_phone || '');
        setOnboardingOpen(true);
        return;
      }

      localStorage.removeItem('brandbox.oauth.onboarding');
      router.replace(safeNextPath());
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
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (!signInData.session?.user) throw new Error('تعذر إنشاء جلسة تسجيل الدخول.');

        const { data: loginProfile, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', signInData.session.user.id)
          .maybeSingle();

        if (profileError || !isActiveProfileStatus(loginProfile?.status)) {
          await supabase.auth.signOut();
          setError(accountAccessMessage(loginProfile?.status));
          return;
        }

        router.replace(safeNextPath());
        return;
      }

      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      const normalizedWhatsapp = whatsapp.trim().replace(/[\s()-]/g, '');
      if (!firstName.trim() || !lastName.trim() || !/^\+?\d{8,15}$/.test(normalizedPhone)) {
        throw new Error('أدخل الاسم الأول واسم العائلة ورقم هاتف صحيحًا.');
      }
      if (normalizedWhatsapp && !/^\+?\d{8,15}$/.test(normalizedWhatsapp)) {
        throw new Error('رقم واتساب غير صحيح.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: normalizedPhone,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        const response = await fetch('/api/v1/profile/onboarding', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: normalizedPhone, whatsappPhone: normalizedWhatsapp }),
        });
        if (!response.ok) throw new Error('تم إنشاء الحساب لكن تعذر حفظ بيانات الاتصال.');
        router.replace(safeNextPath());
      } else {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول للمتابعة.');
        setMode('login');
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

  async function saveSocialContact(event) {
    event.preventDefault();
    setOnboardingLoading(true);
    setError('');
    const normalizedPhone = onboardingPhone.trim().replace(/[\s()-]/g, '');
    const normalizedWhatsapp = onboardingWhatsapp.trim().replace(/[\s()-]/g, '');

    try {
      if (!/^\+?\d{8,15}$/.test(normalizedPhone)) throw new Error('رقم الهاتف مطلوب ويجب أن يكون صحيحًا.');
      if (normalizedWhatsapp && !/^\+?\d{8,15}$/.test(normalizedWhatsapp)) throw new Error('رقم واتساب غير صحيح.');

      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('انتهت جلسة تسجيل الدخول.');

      const response = await fetch('/api/v1/profile/onboarding', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone, whatsappPhone: normalizedWhatsapp }),
      });
      if (!response.ok) throw new Error('تعذر حفظ بيانات الاتصال.');

      localStorage.removeItem('brandbox.oauth.onboarding');
      setOnboardingOpen(false);
      router.replace(safeNextPath());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ بيانات الاتصال.');
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
            <p className="mt-12 max-w-md text-sm leading-8 text-gray-400">ادخل إلى مشاريعك وأدوات الذكاء الاصطناعي والباقات من حساب واحد.</p>
          </div>
          <div className="text-xs text-gray-600">التسجيل متاح بالبريد الإلكتروني أو Google أو Apple.</div>
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
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="الاسم الأول" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="اسم العائلة" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                </div>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
                <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="رقم واتساب للإشعارات - اختياري" dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none transition focus:border-[#f31325]" />
              </>
            )}

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4 transition focus-within:border-[#f31325]">
              <Mail size={18} className="text-gray-500" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني / Gmail" className="w-full bg-transparent py-4 text-sm outline-none" />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4 transition focus-within:border-[#f31325]">
              <LockKeyhole size={18} className="text-gray-500" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-4 text-sm outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-gray-500 transition hover:text-white" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </label>

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
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={saveSocialContact} className="relative w-full max-w-md rounded-[28px] border border-[#303747] bg-[#11151d] p-7 shadow-2xl">
            <button type="button" onClick={() => setOnboardingOpen(false)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={19} /></button>
            <div className="text-xs font-black text-[#ff3344]">إكمال الحساب</div>
            <h2 className="mt-2 text-2xl font-black">بيانات الاتصال</h2>
            <p className="mt-2 text-sm leading-7 text-gray-500">أضف رقم الهاتف. رقم واتساب اختياري لاستخدامه في الإشعارات.</p>

            <div className="mt-6 space-y-3">
              <input value={onboardingPhone} onChange={(event) => setOnboardingPhone(event.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              <input value={onboardingWhatsapp} onChange={(event) => setOnboardingWhatsapp(event.target.value)} placeholder="رقم واتساب - اختياري" dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
            </div>

            {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
            <button disabled={onboardingLoading} className="mt-5 w-full rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">{onboardingLoading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}</button>
          </form>
        </div>
      )}
    </main>
  );
}