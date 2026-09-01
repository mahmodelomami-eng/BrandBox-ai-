'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isActiveProfileStatus } from '../lib/auth/user-status';

export default function AuthGate({ children }) {
  const router = useRouter();
  const { user, profile, profileResolved, accountStatus, loading, signOut } = useAuth();
  const activeProfile = profileResolved && isActiveProfileStatus(profile?.status);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const nextPath = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/dashboard';
      router.replace(`/auth?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (!profileResolved || activeProfile) return;

    const accountReason = accountStatus === 'suspended'
      ? 'suspended'
      : accountStatus === 'pending'
        ? 'pending'
        : 'unavailable';
    void signOut(`/auth?account=${accountReason}`);
  }, [loading, user, profileResolved, activeProfile, accountStatus, signOut, router]);

  if (loading || !user || !profileResolved || !activeProfile) {
    const message = loading || (user && !profileResolved)
      ? 'جاري التحقق من الجلسة...'
      : user
        ? 'هذا الحساب غير متاح للدخول حالياً...'
        : 'جاري فتح صفحة تسجيل الدخول...';

    return (
      <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050506] px-5 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-400 shadow-2xl">
          <Loader2 size={18} className="animate-spin text-[#f31325]" />
          {message}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
