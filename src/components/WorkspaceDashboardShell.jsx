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
      <div dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center">
        <div className="bb-text-secondary flex items-center gap-2 text-xs">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bb-accent)] border-t-transparent" />
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
      <div dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center px-5">
        <div className="bb-panel max-w-lg rounded-3xl border p-8 text-center">
          <ShieldCheck className="bb-text-accent mx-auto" size={38} />
          <h1 className="bb-text-primary mt-4 text-2xl font-black">هذه مساحة إدارية</h1>
          <p className="bb-text-secondary mt-3 text-sm leading-7">حسابك الحالي بدور {role} ولا يملك صلاحية دخول مركز الإدارة.</p>
          <Link href="/dashboard" className="bb-button-secondary mt-6 inline-flex rounded-xl border px-6 py-3 text-sm font-black">العودة إلى لوحة المستخدم</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)] font-sans selection:bg-[var(--bb-accent)] selection:text-white">
      <main className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
