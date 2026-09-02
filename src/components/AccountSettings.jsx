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

  if (loading) return <div className="bb-panel bb-text-secondary rounded-2xl border p-6 text-sm">جاري تحميل إعدادات الحساب...</div>;

  return (
    <form onSubmit={save} className="space-y-6" dir="rtl">
      <section className="bb-panel rounded-3xl border p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><UserRound className="bb-text-accent" size={20}/></span>
          <div><h2 className="bb-text-primary text-lg font-black">البيانات الشخصية</h2><p className="bb-text-tertiary mt-1 text-xs">عدّل الاسم وبيانات التواصل وصورة الحساب.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم الأول" value={form.firstName} onChange={set('firstName')} />
          <Field label="اسم العائلة" value={form.lastName} onChange={set('lastName')} />
          <Field label="رقم الهاتف" value={form.phone} onChange={set('phone')} />
          <Field label="رابط صورة المستخدم" value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://..." />
        </div>
      </section>

      <section className="bb-panel rounded-3xl border p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="bb-accent-soft grid h-10 w-10 place-items-center rounded-xl border"><LinkIcon className="bb-text-accent" size={20}/></span>
          <div><h2 className="bb-text-primary text-lg font-black">الروابط الخاصة بك</h2><p className="bb-text-tertiary mt-1 text-xs">أضف موقعك وحساباتك الاجتماعية المرتبطة بالبروفايل.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الموقع الإلكتروني" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://example.com" />
          <Field label="Facebook" value={form.facebookUrl} onChange={set('facebookUrl')} placeholder="https://facebook.com/..." />
          <Field label="Instagram" value={form.instagramUrl} onChange={set('instagramUrl')} placeholder="https://instagram.com/..." />
          <Field label="TikTok" value={form.tiktokUrl} onChange={set('tiktokUrl')} placeholder="https://tiktok.com/@..." />
          <Field label="LinkedIn" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="bb-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50"><Save size={17}/>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button>
        {message && <span className="bb-text-secondary text-sm" role="status">{message}</span>}
      </div>
    </form>
  );
}

function Field({ label, value, onChange, placeholder = '' }) {
  return <label className="block"><span className="bb-text-secondary mb-2 block text-xs font-black">{label}</span><input value={value} onChange={onChange} placeholder={placeholder} className="bb-input w-full rounded-xl border px-4 py-3 text-sm outline-none"/></label>;
}
