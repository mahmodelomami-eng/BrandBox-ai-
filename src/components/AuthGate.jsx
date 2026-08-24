'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, LockKeyhole, Mail, Phone } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';

export function AuthModalContent({ mode = 'login', onSuccess }) {
  const supabase = createBrowserSupabaseClient();
  const [currentMode, setCurrentMode] = useState(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSocial(provider) {
    setError('');
    setMessage('');
    try {
      localStorage.setItem('brandbox.oauth.next', '/dashboard');
      localStorage.setItem('brandbox.oauth.onboarding', '1');
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent('/dashboard')}&social=1`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err?.message || `تعذر تسجيل الدخول عبر ${provider}.`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!email.trim() || password.length < 6) {
        throw new Error('أدخل بريداً إلكترونياً وكلمة مرور من 6 أحرف على الأقل.');
      }

      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      if (currentMode === 'signup' && (!firstName.trim() || !lastName.trim() || !/^\+?\d{8,15}$/.test(normalizedPhone))) {
        throw new Error('أدخل الاسم الأول واسم العائلة ورقم هاتف صحيحاً.');
      }

      if (currentMode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (onSuccess) onSuccess();
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
          setCurrentMode('login');
        } else if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      setError(err?.message || 'تعذر إتمام عملية المصادقة.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('أدخل بريدك الإلكتروني أولًا لإرسال رابط استعادة كلمة المرور.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (resetError) setError(resetError.message);
    else setMessage('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
  }

  return (
    <div className="w-full max-w-xl">
      <div className="relative mb-8 h-16 w-56">
        <Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="224px" className="object-contain object-right" priority unoptimized />
      </div>
      <h2 className="text-3xl font-black text-white sm:text-4xl">ابدأ تجربتك مع Brand Box AI</h2>
      <p className="mt-3 text-sm text-gray-400">
        {currentMode === 'login' ? 'سجّل الدخول للوصول إلى مساحة عملك' : 'أنشئ حسابك وابدأ تجربتك الإبداعية'}
      </p>

      <div className="mt-8 flex rounded-2xl border border-white/10 bg-[#0b0c0f] p-1.5">
        <button
          type="button"
          onClick={() => { setCurrentMode('login'); setError(''); setMessage(''); }}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${currentMode === 'login' ? 'bg-[#f31325] text-white shadow-[0_8px_30px_rgba(243,19,37,.24)]' : 'text-gray-500 hover:text-white'}`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => { setCurrentMode('signup'); setError(''); setMessage(''); }}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${currentMode === 'signup' ? 'bg-[#f31325] text-white shadow-[0_8px_30px_rgba(243,19,37,.24)]' : 'text-gray-500 hover:text-white'}`}
        >
          إنشاء حساب
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {currentMode === 'signup' && (
          <div className="grid grid-cols-2 gap-4">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="الاسم الأول"
              autoComplete="given-name"
              required
              className="rounded-2xl border border-white/20 bg-[#15171c] p-4 text-sm text-white outline-none transition focus:border-[#f31325]"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="اسم العائلة"
              autoComplete="family-name"
              required
              className="rounded-2xl border border-white/20 bg-[#15171c] p-4 text-sm text-white outline-none transition focus:border-[#f31325]"
            />
          </div>
        )}

        {currentMode === 'signup' && (
          <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
            <Phone size={20} className="shrink-0 text-gray-500" />
            <input
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2189XXXXXXXX"
              pattern="\+?[0-9\s()-]{8,20}"
              required
              className="w-full bg-transparent py-4 text-left text-sm text-white outline-none placeholder:text-gray-500"
            />
          </label>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
          <Mail size={20} className="shrink-0 text-gray-500" />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500"
            required
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#15171c] px-4 transition focus-within:border-[#f31325]">
          <LockKeyhole size={20} className="shrink-0 text-gray-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500"
            minLength={6}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            className="shrink-0 text-gray-500 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </label>

        {currentMode === 'login' && (
          <div className="flex items-center justify-end text-xs sm:text-sm">
            <button type="button" onClick={resetPassword} className="font-bold text-[#f31325] hover:text-[#ff4654]">
              نسيت كلمة المرور؟
            </button>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>}

        <button
          disabled={submitting}
          className="w-full rounded-2xl bg-[#c20f1d] py-4 text-base font-extrabold text-white shadow-[0_18px_45px_rgba(243,19,37,.32)] transition hover:bg-[#e31627] disabled:opacity-50"
        >
          {submitting ? 'جاري التنفيذ...' : currentMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>
      </form>

      {/* Google Social Login */}
      <div className="my-6 flex items-center gap-3 text-xs text-gray-600">
        <span className="h-px flex-1 bg-white/10" />
        <span>أو</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial('google')}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-[#111318] py-4 text-sm font-extrabold text-white transition hover:border-[#4285F4]/60 hover:bg-white/[0.03]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-black text-[#4285F4]">G</span>
          المتابعة باستخدام Google
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-gray-500">
        {currentMode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
        <button
          type="button"
          onClick={() => { setCurrentMode(currentMode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
          className="font-extrabold text-[#f31325]"
        >
          {currentMode === 'login' ? 'أنشئ حسابًا' : 'سجّل الدخول'}
        </button>
      </p>
    </div>
  );
}

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050506] text-white flex items-center justify-center">
        <div className="text-xs text-gray-400">جاري التحقق من الجلسة...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 overflow-y-auto bg-[#050506]">
        <div className="grid min-h-screen lg:grid-cols-2">
          <section className="relative flex items-center justify-center bg-[#101114] px-5 py-12 sm:px-10 lg:px-14">
            <AuthModalContent />
          </section>
          <section className="relative hidden min-h-screen overflow-hidden lg:block">
            <Image src="/brandbox-login-visual.jpg" alt="BrandBox AI" fill priority sizes="50vw" className="object-cover" unoptimized />
          </section>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}