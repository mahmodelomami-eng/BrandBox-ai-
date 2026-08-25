'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const elevatedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);

export default function WorkspaceDashboardShell({ children, admin = false, title, subtitle }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth?next=%2Fdashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050608] text-white">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
          <span>جاري تجهيز مساحة العمل...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canAdmin = elevatedRoles.has(role);

  if (admin && !canAdmin) {
    return (
      <div dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050608] px-5 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/25 bg-[#11131a] p-8 text-center">
          <ShieldCheck className="mx-auto text-[#ff3344]" size={38} />
          <h1 className="mt-4 text-2xl font-black">هذه مساحة إدارية</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">حسابك الحالي بدور {role} ولا يملك صلاحية دخول مركز الإدارة.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-white/10 px-6 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-gray-100 font-sans selection:bg-[#FF2E4C] selection:text-white">
      <main className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
