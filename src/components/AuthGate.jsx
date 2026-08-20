'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Menu, Phone, Sparkles, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function LandingPage({ openAuth }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['الرئيسية', '#home'], ['الاستوديو', '#studio'], ['القوالب', '#templates'],
    ['الأسعار', '#pricing'], ['المصادر', '#resources'],
  ];
  return (
    <main id="home" dir="rtl" className="min-h-screen overflow-hidden bg-[#050506] text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#050506]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#home" aria-label="BrandBox AI" className="relative h-12 w-44 shrink-0">
            <Image src="/brandbox-logo.png" alt="BrandBox AI" fill priority sizes="176px" className="object-contain object-right" unoptimized />
          </a>
          <nav className="hidden items-center gap-8 lg:flex">
            {links.map(([label, href]) => <a key={href} href={href} className="text-sm font-bold text-gray-300 transition hover:text-white">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <button onClick={() => openAuth('login')} className="rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5">تسجيل الدخول</button>
            <button onClick={() => openAuth('signup')} className="rounded-xl bg-[#f31325] px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_34px_rgba(243,19,37,0.28)] transition hover:bg-[#ff2637]">إنشاء حساب</button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl border border-white/10 p-2.5 sm:hidden" aria-label="فتح القائمة">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menuOpen && <div className="border-t border-white/5 bg-[#0b0c0f] px-5 py-4 sm:hidden">
          <div className="grid gap-2">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5">{label}</a>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => openAuth('login')} className="rounded-xl border border-white/10 py-3 text-sm font-bold">دخول</button><button onClick={() => openAuth('signup')} className="rounded-xl bg-[#f31325] py-3 text-sm font-bold">إنشاء حساب</button></div>
        </div>}
      </header>

      <section className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 pb-20 pt-32 lg:px-8">
        <div className="absolute -right-32 top-52 h-72 w-72 rounded-full bg-[#f31325]/10 blur-3xl" />
        <div className="grid w-full items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 text-center lg:text-right">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-bold text-red-300"><Sparkles size={15} /> منصة الإبداع المدعومة بالذكاء الاصطناعي</div>
            <h1 className="text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl">إبداعك بلا حدود.<br /><span className="text-[#f31325]">تجربتك متكاملة.</span></h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-gray-400 lg:mx-0 lg:text-lg">اصنع تصاميم احترافية، وطوّر هوية علامتك، وحوّل أفكارك إلى محتوى مميز من مكان واحد.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <button onClick={() => openAuth('signup')} className="flex items-center justify-center gap-2 rounded-xl bg-[#f31325] px-8 py-4 font-extrabold shadow-[0_16px_45px_rgba(243,19,37,0.3)] transition hover:bg-[#ff2637]">ابدأ مجانًا <ArrowLeft size={19} /></button>
              <button onClick={() => openAuth('login')} className="rounded-xl border border-white/15 px-8 py-4 font-bold text-gray-200 transition hover:border-white/30 hover:bg-white/5">لدي حساب بالفعل</button>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-5 text-xs text-gray-500 lg:justify-start"><span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-red-400" /> 50 نقطة مجانية</span><span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-red-400" /> بدون بطاقة دفع</span><span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-red-400" /> واجهة عربية</span></div>
          </div>
          <div id="studio" className="relative">
            <div className="absolute inset-8 bg-[#f31325]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-red-500/50 bg-[#101217] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
              <Image src="/brandbox-dashboard-preview.jpg" alt="معاينة لوحة BrandBox AI" width={1625} height={1340} priority className="h-auto w-full rounded-[22px] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section id="templates" className="border-y border-white/5 bg-[#090a0d] px-5 py-16"><div className="mx-auto grid max-w-6xl gap-8 text-center md:grid-cols-3"><div><div className="text-3xl font-black text-[#f31325]">+20</div><div className="mt-2 text-sm text-gray-400">نموذج ذكاء اصطناعي</div></div><div><div className="text-3xl font-black text-[#f31325]">+100</div><div className="mt-2 text-sm text-gray-400">قالب احترافي</div></div><div><div className="text-3xl font-black text-[#f31325]">24/7</div><div className="mt-2 text-sm text-gray-400">إبداع متواصل</div></div></div></section>
      <section id="pricing" className="px-5 py-20 text-center"><h2 className="text-3xl font-black">ابدأ رحلتك الإبداعية اليوم</h2><p className="mt-3 text-gray-400">أنشئ حسابك واختر الخطة المناسبة عندما تكون جاهزًا.</p><button onClick={() => openAuth('signup')} className="mt-7 rounded-xl bg-[#f31325] px-9 py-4 font-extrabold">إنشاء حساب مجاني</button></section>
      <footer id="resources" className="border-t border-white/5 px-5 py-8 text-center text-xs text-gray-600">© 2026 BrandBox AI — جميع الحقوق محفوظة</footer>
    </main>
  );
}

function AuthShell({ children }) {
  const supabase = createBrowserSupabaseClient();
  const [mode, setMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!email.trim() || password.length < 6) {
        throw new Error('أدخل بريداً إلكترونياً وكلمة مرور من 6 أحرف على الأقل.');
      }

      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      if (mode === 'signup' && (!firstName.trim() || !lastName.trim() || !/^\+?\d{8,15}$/.test(normalizedPhone))) {
        throw new Error('أدخل الاسم الأول واسم العائلة ورقم هاتف صحيحاً.');
      }

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
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

        if (!data.session) {
          setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.');
          setMode('login');
        }
      }
    } catch (err) {
      setError(err?.message || 'تعذر إتمام عملية المصادقة.');
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('أدخل بريدك الإلكتروني أولًا لإرسال رابط استعادة كلمة المرور.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) setError(resetError.message);
    else setMessage('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center">
        <div className="text-sm text-gray-400">جاري التحقق من جلسة Supabase...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage openAuth={(nextMode) => { setMode(nextMode); setError(''); setMessage(''); setAuthOpen(true); }} />
        {authOpen && <div dir="rtl" className="fixed inset-0 z-50 overflow-y-auto bg-[#050506]">
          <div className="grid min-h-screen lg:grid-cols-2">
            <section className="relative flex items-center justify-center bg-[#101114] px-5 py-12 sm:px-10 lg:px-14">
              <button onClick={() => setAuthOpen(false)} aria-label="إغلاق" className="absolute left-5 top-5 z-10 rounded-xl border border-white/10 bg-black/20 p-2.5 text-gray-400 transition hover:border-white/25 hover:text-white"><X size={20} /></button>
              <div className="w-full max-w-xl">
                <div className="relative mb-8 h-16 w-56"><Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="224px" className="object-contain object-right" unoptimized /></div>
                <h2 className="text-4xl font-black text-white sm:text-5xl">مرحبًا بعودتك</h2>
                <p className="mt-3 text-base text-gray-400">{mode === 'login' ? 'سجّل الدخول للمتابعة إلى BrandBox AI' : 'أنشئ حسابك وابدأ رحلتك الإبداعية'}</p>
                <div className="mt-8 flex rounded-2xl border border-white/10 bg-[#0b0c0f] p-1.5">
                  <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${mode === 'login' ? 'bg-[#f31325] text-white shadow-[0_8px_30px_rgba(243,19,37,.24)]' : 'text-gray-500 hover:text-white'}`}>تسجيل الدخول</button>
                  <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${mode === 'signup' ? 'bg-[#f31325] text-white shadow-[0_8px_30px_rgba(243,19,37,.24)]' : 'text-gray-500 hover:text-white'}`}>إنشاء حساب</button>
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  {mode === 'signup' && <div className="grid grid-cols-2 gap-4">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="الاسم الأول" autoComplete="given-name" required className="rounded-2xl border border-white/20 bg-[#15171c] p-4 text-sm text-white outline-none transition focus:border-[#f31325]" />
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="اسم العائلة" autoComplete="family-name" required className="rounded-2xl border border-white/20 bg-[#15171c] p-4 text-sm text-white outline-none transition focus:border-[#f31325]" />
                  </div>}
                  {mode === 'signup' && <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
                    <Phone size={20} className="shrink-0 text-gray-500" />
                    <input type="tel" dir="ltr" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2189XXXXXXXX" pattern="\+?[0-9\s()-]{8,20}" required className="w-full bg-transparent py-4 text-left text-sm text-white outline-none placeholder:text-gray-500" />
                  </label>}
                  <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
                    <Mail size={20} className="shrink-0 text-gray-500" />
                    <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500" required />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
                    <LockKeyhole size={20} className="shrink-0 text-gray-500" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500" minLength={6} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="shrink-0 text-gray-500 hover:text-white">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </label>
                  {mode === 'login' && <div className="flex items-center justify-between text-xs sm:text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-gray-400"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded" /> تذكرني</label>
                    <button type="button" onClick={resetPassword} className="font-bold text-[#f31325] hover:text-[#ff4654]">نسيت كلمة المرور؟</button>
                  </div>}
                  {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
                  {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>}
                  <button disabled={submitting} className="w-full rounded-2xl bg-[#c20f1d] py-4 text-base font-extrabold text-white shadow-[0_18px_45px_rgba(243,19,37,.32)] transition hover:bg-[#e31627] disabled:opacity-50">{submitting ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
                </form>
                <p className="mt-7 text-center text-sm text-gray-500">{mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="font-extrabold text-[#f31325]">{mode === 'login' ? 'أنشئ حسابًا' : 'سجّل الدخول'}</button></p>
              </div>
            </section>
            <section className="relative hidden min-h-screen overflow-hidden lg:block">
              <Image src="/brandbox-login-visual.jpg" alt="BrandBox AI" fill priority sizes="50vw" className="object-cover" unoptimized />
            </section>
          </div>
        </div>}
      </>
    );
  }

  return (
    <>
      {children}
      <button onClick={signOut} className="fixed bottom-4 left-4 z-[60] bg-[#121520] border border-[#1F2438] hover:border-red-500/50 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl">
        تسجيل الخروج
      </button>
    </>
  );
}

export default function AuthGate({ children }) {
  return <AuthShell>{children}</AuthShell>;
}
