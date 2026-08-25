'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthGate({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) return;

    const nextPath = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/dashboard';

    router.replace(`/auth?next=${encodeURIComponent(nextPath)}`);
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050506] px-5 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-400 shadow-2xl">
          <Loader2 size={18} className="animate-spin text-[#f31325]" />
          {loading ? 'جاري التحقق من الجلسة...' : 'جاري فتح صفحة تسجيل الدخول...'}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
