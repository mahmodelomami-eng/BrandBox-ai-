'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function AuthShell({ children }) {
  const supabase = createBrowserSupabaseClient();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center">
        <div className="text-sm text-gray-400">جاري التحقق من جلسة Supabase...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121520] border border-[#1F2438] rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#E50914] to-[#FF2E4C] flex items-center justify-center font-black text-2xl">B</div>
            <div>
              <div className="font-extrabold text-xl">BRAND <span className="text-[#FF2E4C]">BOX</span> AI</div>
              <div className="text-xs text-gray-500">مصادقة الحساب عبر Supabase</div>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === 'login' ? 'bg-[#FF2E4C] text-white' : 'bg-[#0D0F17] text-gray-400'}`}>تسجيل الدخول</button>
            <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === 'signup' ? 'bg-[#FF2E4C] text-white' : 'bg-[#0D0F17] text-gray-400'}`}>إنشاء حساب</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="الاسم الأول" className="bg-[#0D0F17] border border-[#1F2438] rounded-xl p-3 text-sm outline-none" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="اسم العائلة" className="bg-[#0D0F17] border border-[#1F2438] rounded-xl p-3 text-sm outline-none" />
              </div>
            )}
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full bg-[#0D0F17] border border-[#1F2438] rounded-xl p-3 text-sm outline-none" required />
            <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-[#0D0F17] border border-[#1F2438] rounded-xl p-3 text-sm outline-none" minLength={6} required />
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
            {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">{message}</div>}
            <button disabled={submitting} className="w-full bg-[#FF2E4C] hover:bg-[#E50914] disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm">
              {submitting ? 'جاري التنفيذ...' : mode === 'login' ? 'دخول إلى المنصة' : 'إنشاء الحساب'}
            </button>
          </form>
        </div>
      </div>
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
