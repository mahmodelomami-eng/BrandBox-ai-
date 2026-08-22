'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const nextPath = '/projects';

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) window.location.replace('/projects');
    });
  }, []);

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
        window.location.replace(nextPath);
        return;
      }

      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      if (!firstName.trim() || !lastName.trim() || !/^\+?\d{8,15}$/.test(normalizedPhone)) {
        throw new Error('أدخل الاسم الأول واسم العائلة ورقم هاتف صحيحًا.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: normalizedPhone } },
      });
      if (signUpError) throw signUpError;
      if (data.session) window.location.replace(nextPath);
      else {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول للمتابعة.');
        setMode('login');
      }
    } catch (err) {
      setError(err?.message || 'تعذر إتمام العملية.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] px-5 py-16 text-white">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-[#242936] bg-[#0d1018] shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-l border-[#242936] bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_40%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-black text-red-300">Brand Box AI</div>
            <h1 className="mt-7 text-4xl font-black leading-[1.35]">ابدأ من مشروعك،<br /><span className="text-[#f31325]">ثم ولّد كل شيء.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-gray-400">نحفظ الصور والفيديو والمحادثات داخل المشروع نفسه حتى تبقى الهوية والنتائج منظمة وقابلة للعودة إليها.</p>
          </div>
          <div className="text-xs text-gray-600">تسجيل الدخول مطلوب فقط عند بدء التوليد الفعلي.</div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-7 flex rounded-2xl border border-white/10 bg-[#080a0f] p-1.5">
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'login' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>تسجيل الدخول</button>
            <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${mode === 'signup' ? 'bg-[#f31325] text-white' : 'text-gray-500'}`}>إنشاء حساب</button>
          </div>

          <h2 className="text-3xl font-black">{mode === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}</h2>
          <p className="mt-2 text-sm text-gray-500">بعد الدخول سننقلك مباشرة إلى شاشة المشاريع.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'signup' && <>
              <div className="grid grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="الاسم الأول" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="اسم العائلة" className="rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
              </div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف +218..." dir="ltr" className="w-full rounded-2xl border border-[#303747] bg-[#151923] p-4 text-sm outline-none focus:border-[#f31325]" />
            </>}

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4">
              <Mail size={18} className="text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full bg-transparent py-4 text-sm outline-none" />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#151923] px-4">
              <LockKeyhole size={18} className="text-gray-500" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-transparent py-4 text-sm outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-gray-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </label>

            {error && <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-300">{message}</div>}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f31325] py-4 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50">
              <UserPlus size={18} /> {loading ? 'جاري التنفيذ...' : mode === 'login' ? 'دخول إلى المشاريع' : 'إنشاء الحساب والمتابعة'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
