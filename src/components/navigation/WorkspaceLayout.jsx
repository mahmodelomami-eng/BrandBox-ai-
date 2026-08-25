'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';

export default function WorkspaceLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auth Guard: preserve route protection across workspace screens
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth?next=%2Fdashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white flex flex-col items-center justify-center space-y-4">
        <div className="relative h-12 w-44">
          <Image src="/brandbox-logo.png" alt="BrandBox AI" fill sizes="176px" className="object-contain" priority unoptimized />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
          <span>جاري التحقق من الجلسة وتحميل بيانات الحساب...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-gray-100 font-sans selection:bg-[#FF2E4C] selection:text-white">
      <main className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
