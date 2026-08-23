'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, UserRound, Link as LinkIcon } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function AccountSettings() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', avatarUrl: '',
    websiteUrl: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '', linkedinUrl: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        const [profileRes, linksRes] = await Promise.all([
          supabase.from('profiles').select('first_name,last_name,phone,avatar_url').eq('id', user.id).maybeSingle(),
          supabase.from('profile_links').select('website_url,facebook_url,instagram_url,tiktok_url,linkedin_url').eq('user_id', user.id).maybeSingle(),
        ]);

        if (!mounted) return;
        const p = profileRes.data || {};
        const l = linksRes.data || {};
        setForm({
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          phone: p.phone || '',
          avatarUrl: p.avatar_url || '',
          websiteUrl: l.website_url || '',
          facebookUrl: l.facebook_url || '',
          instagramUrl: l.instagram_url || '',
          tiktokUrl: l.tiktok_url || '',
          linkedinUrl: l.linkedin_url || '',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('يجب تسجيل الدخول أولاً.');

      const { error: profileError } = await supabase.rpc('update_own_profile', {
        p_first_name: form.firstName.trim(),
        p_last_name: form.lastName.trim(),
        p_phone: form.phone.trim(),
        p_avatar_url: form.avatarUrl.trim(),
      });
      if (profileError) throw profileError;

      const { error: linksError } = await supabase.from('profile_links').upsert({
        user_id: user.id,
        website_url: form.websiteUrl.trim() || null,
        facebook_url: form.facebookUrl.trim() || null,
        instagram_url: form.instagramUrl.trim() || null,
        tiktok_url: form.tiktokUrl.trim() || null,
        linkedin_url: form.linkedinUrl.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (linksError) throw linksError;

      setMessage('تم حفظ التغييرات بنجاح.');
    } catch (error) {
      setMessage(error?.message || 'تعذر حفظ التغييرات.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-2xl border border-white/10 bg-[#10131a] p-6 text-sm text-gray-400">جاري تحميل إعدادات الحساب...</div>;

  return (
    <form onSubmit={save} className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-white/10 bg-[#10131a] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><UserRound className="text-[#ff3344]" size={22}/><div><h2 className="text-lg font-black">البيانات الشخصية</h2><p className="mt-1 text-xs text-gray-500">عدّل الاسم وبيانات التواصل وصورة الحساب.</p></div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم الأول" value={form.firstName} onChange={set('firstName')} />
          <Field label="اسم العائلة" value={form.lastName} onChange={set('lastName')} />
          <Field label="رقم الهاتف" value={form.phone} onChange={set('phone')} />
          <Field label="رابط صورة المستخدم" value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://..." />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#10131a] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><LinkIcon className="text-[#ff3344]" size={22}/><div><h2 className="text-lg font-black">الروابط الخاصة بك</h2><p className="mt-1 text-xs text-gray-500">أضف موقعك وحساباتك الاجتماعية المرتبطة بالبروفايل.</p></div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الموقع الإلكتروني" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://example.com" />
          <Field label="Facebook" value={form.facebookUrl} onChange={set('facebookUrl')} placeholder="https://facebook.com/..." />
          <Field label="Instagram" value={form.instagramUrl} onChange={set('instagramUrl')} placeholder="https://instagram.com/..." />
          <Field label="TikTok" value={form.tiktokUrl} onChange={set('tiktokUrl')} placeholder="https://tiktok.com/@..." />
          <Field label="LinkedIn" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#f31325] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save size={17}/>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button>
        {message && <span className="text-sm text-gray-400">{message}</span>}
      </div>
    </form>
  );
}

function Field({ label, value, onChange, placeholder = '' }) {
  return <label className="block"><span className="mb-2 block text-xs font-black text-gray-300">{label}</span><input value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-[#0b0d12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-[#f31325]/50"/></label>;
}
