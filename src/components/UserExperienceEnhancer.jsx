'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Camera, CheckCheck, X } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function UserExperienceEnhancer() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const inputRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const pingPresence = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch('/api/v1/presence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => null);
  }, [getAccessToken]);

  const loadNotifications = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return;
    const result = await response.json();
    setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
  }, [getAccessToken]);

  async function markAllRead() {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/v1/notifications', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }

  useEffect(() => {
    void pingPresence();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pingPresence();
    }, 60_000);

    const handleFocus = () => { void pingPresence(); };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void pingPresence();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pingPresence]);

  useEffect(() => {
    let bellNode = null;
    let avatarNode = null;

    const handleBellClick = () => {
      setOpen((value) => !value);
      void loadNotifications();
    };
    const handleAvatarClick = () => inputRef.current?.click();

    const attach = () => {
      const nextBell = document.querySelector('svg.lucide-bell');
      if (nextBell && nextBell !== bellNode) {
        bellNode?.removeEventListener('click', handleBellClick);
        bellNode = nextBell;
        bellNode.style.cursor = 'pointer';
        bellNode.setAttribute('aria-label', 'الإشعارات');
        bellNode.addEventListener('click', handleBellClick);
      }

      const nextAvatar = document.querySelector('img[alt="صورة المستخدم"]');
      if (nextAvatar && nextAvatar !== avatarNode) {
        avatarNode?.removeEventListener('click', handleAvatarClick);
        avatarNode = nextAvatar;
        avatarNode.style.cursor = 'pointer';
        avatarNode.title = 'تغيير صورة الملف الشخصي';
        avatarNode.addEventListener('click', handleAvatarClick);
      }
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      bellNode?.removeEventListener('click', handleBellClick);
      avatarNode?.removeEventListener('click', handleAvatarClick);
    };
  }, [loadNotifications]);

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast('اختر ملف صورة فقط.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast('حجم الصورة يجب ألا يتجاوز 2MB.');
      return;
    }

    setUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('يجب تسجيل الدخول أولًا.');
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${userData.user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('profile-avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('profile-avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;
      const token = await getAccessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');

      const response = await fetch('/api/v1/profile/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl }),
      });
      if (!response.ok) throw new Error('تعذر حفظ صورة الملف الشخصي.');

      document.querySelectorAll('img[alt="صورة المستخدم"]').forEach((node) => {
        node.src = avatarUrl;
      });
      setToast('تم تحديث صورة الملف الشخصي.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'تعذر تحديث الصورة.');
    } finally {
      setUploading(false);
      window.setTimeout(() => setToast(''), 3500);
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadAvatar} />

      {uploading && (
        <div className="fixed left-5 top-28 z-[180] flex items-center gap-2 rounded-xl border border-[#ff3344]/30 bg-[#11151e] px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <Camera size={16} className="text-[#ff3344]" /> جاري رفع صورة الملف الشخصي...
        </div>
      )}

      {open && (
        <div dir="rtl" className="fixed right-4 top-28 z-[190] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[#2a3040] bg-[#10131b] text-white shadow-2xl lg:right-[280px]">
          <div className="flex items-center justify-between border-b border-[#252b3a] px-4 py-4">
            <div className="flex items-center gap-2 font-black"><Bell size={18} className="text-[#ff3344]" /> الإشعارات {unreadCount > 0 && <span className="rounded-full bg-[#f31325] px-2 py-0.5 text-[10px]">{unreadCount}</span>}</div>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" title="تحديد الكل كمقروء"><CheckCheck size={16} /></button>
              <button onClick={() => setOpen(false)} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" aria-label="إغلاق"><X size={16} /></button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">لا توجد إشعارات جديدة.</div>
            ) : notifications.map((item) => (
              <div key={item.id} className={`mb-2 rounded-xl border p-4 ${item.is_read ? 'border-[#252b3a] bg-[#0d1018]' : 'border-[#f31325]/25 bg-[#f31325]/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-black">{item.title}</div>
                  {!item.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ff3344]" />}
                </div>
                {item.body && <p className="mt-2 text-xs leading-6 text-gray-400">{item.body}</p>}
                <div className="mt-2 text-[10px] text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleString('ar-LY') : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-5 left-5 z-[200] rounded-xl border border-white/10 bg-[#11151e] px-4 py-3 text-xs font-bold text-white shadow-2xl">{toast}</div>}
    </>
  );
}
