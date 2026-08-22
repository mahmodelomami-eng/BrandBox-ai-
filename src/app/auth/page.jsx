'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserPlus, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

function safeNextPath() {
  if (typeof window === 'undefined') return '/projects';
  const fromUrl = new URLSearchParams(window.location.search).get('next');
  const stored = localStorage.getItem('brandbox.oauth.next');
  const value = fromUrl || stored || '/projects';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/projects';
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

    const resolveSession = async (session) => {
      if (!active || !session?.user) return;
      const socialRequested = localStorage.getItem('brandbox.oauth.onboarding') === '1' || new URLSearchParams(window.location.search).get('social') === '1';
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone,whatsapp_phone,onboarding_completed_at')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (socialRequested && (!profile?.phone || !profile?.onboarding_completed_at)) {
        setOnboardingPhone(profile?.phone || '');
        setOnboardingWhatsapp(profile?.whatsapp_phone || '');
        setOnboardingOpen(true);
        return;
      }
      localStorage.removeItem('brandbox.oauth.onboarding');
      router.replace(safeNextPath());
    };

    supabase.auth.getSession().then(({ data }) => resolveSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.setTimeout(() => resolveSession(session), 0);
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
      if (!email.trim() || password.length < 6) throw new Error('أدخل بريدًا إلكترونيًا وكلمة مرور من 6 أحرف على الأقل.');

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
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
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: normalizedPhone } },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        const response = await fetch('/api/v1/profile/onboarding', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalizedPhone, whatsappPhone: normalizedWhatsapp }),
        });
        if (!response.ok) throw new Error('تم إنشاء الحساب لكن تعذر حفظ بيانات الاتصال.');
        router.replace(safeNextPath());
      } else {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول للمتابعة.');
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
      localStorage.setItem('brandbox.oauth.next', safeNextPath());
      localStorage.setItem('brandbox.oauth.onboarding', '1');
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(safeNextPath())}&social=1`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : `تعذر تسجيل الدخول عبر ${provider}. تأكد من تفعيل المزود في إعدادات المصادقة.`);
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
        headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, whatsappPhone: normalizedWhatsapp }),
      });
      if (!response.ok) throw new Error('تعذر حفظ بيانات الاتصال.');
      localStorage.removeItem('brandbox.oauth.onboarding');
      setOnboardingOpen(false);
      router.replace(safeNextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ بيانات الاتصال.');
    } finally {
      setOnboardingLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] px-5 pb-16 pt-28 text-white">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-[#242936] bg-[#0d1018] shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-l border-[#242936] bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_40%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-black text-red-300">Brand Box AI</div>
            <h1 className="mt-7 text-4xl font-black leading-[1.35]">مرحبًا بعودتك،<br /><span className="text-[#f31325]">واصل إبداعك.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-gray-400">ادخل إلى مشاريعك وأدوات الذكاء الاصطناعي والباقات من حساب واحد.</p>
          </div>
          <div className="text-xs text-gray-600">يمكنك التسجيل بالبريد الإلكتروني أو Google أو Apple.</div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-7 flex rounded-2xl border border-white/10 bg-[#080a0f] p-1.5">
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'login' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>تسجيل الدخول</button>
            <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'signup' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>إنشاء حساب</button>
          </div>

          <h2 className="text-3xl font-black">{mode === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}</h2>
          <p className="mt-2 text-sm text-gray-500">سجّل بالبريد / Gmail أو استخدم حساب Google أو Apple.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'signup' && <>
              <div className="grid grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="الاسم الأول" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="اسم العائلة" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              </div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="رقم واتساب للإشعارات - اختياري" dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
            </>}

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4">
              <Mail size={18} className="text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني / Gmail" className="w-full bg-transparent py-4 text-sm outline-none" />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4">
              <LockKeyhole size={18} className="text-gray-500" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-4 text-sm outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-gray-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </label>

            {error && !onboardingOpen && <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-300">{message}</div>}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
              <UserPlus size={18} /> {loading ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب والمتابعة'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-600"><span className="h-px flex-1 bg-[#30343e]" /><span>أو</span><span className="h-px flex-1 bg-[#30343e]" /></div>
          <div className="space-y-3">
            <button type="button" onClick={() => social('google')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#3a3f49] bg-[#101319] py-4 text-sm font-black transition hover:border-[#f31325]/50"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black text-[#4285F4]">G</span> المتابعة باستخدام Google</button>
            <button type="button" onClick={() => social('apple')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#3a3f49] bg-[#101319] py-4 text-sm font-black transition hover:border-[#f31325]/50"><span className="text-xl">●</span> المتابعة باستخدام Apple</button>
          </div>
        </section>
      </div>

      {onboardingOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form onSubmit={saveSocialContact} className="relative w-full max-w-md rounded-[28px] border border-[#303747] bg-[#11151d] p-7 shadow-2xl">
            <button type="button" onClick={() => setOnboardingOpen(false)} className="absolute left-5 top-5 text-gray-500 hover:text-white"><X size={19} /></button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f31325]/10 text-[#ff3344]"><Phone size={23} /></div>
            <h3 className="mt-5 text-2xl font-black">أكمل بيانات الاتصال</h3>
            <p className="mt-2 text-xs leading-6 text-gray-500">رقم الهاتف مطلوب لإكمال حسابك. رقم واتساب اختياري ويمكن استخدامه لاستقبال الإشعارات المهمة.</p>
            <input value={onboardingPhone} onChange={(e) => setOnboardingPhone(e.target.value)} dir="ltr" placeholder="رقم الهاتف +218..." className="mt-5 w-full rounded-xl border border-[#303747] bg-[#181c25] p-4 text-sm outline-none focus:border-[#f31325]" />
            <input value={onboardingWhatsapp} onChange={(e) => setOnboardingWhatsapp(e.target.value)} dir="ltr" placeholder="رقم واتساب - اختياري" className="mt-3 w-full rounded-xl border border-[#303747] bg-[#181c25] p-4 text-sm outline-none focus:border-[#f31325]" />
            {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
            <button disabled={onboardingLoading} className="mt-5 w-full rounded-xl bg-[#f31325] py-3.5 text-sm font-black text-white disabled:opacity-50">{onboardingLoading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}</button>
          </form>
        </div>
      )}
    </main>
  );
}
