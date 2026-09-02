'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Bot, Headphones } from 'lucide-react';
import AuthGate from '../../components/AuthGate';
import AdminControlCenter from '../../components/AdminControlCenter';

function AdminLoadingState() {
  return (
    <main dir="rtl" className="bb-app-canvas grid min-h-[calc(100vh-5rem)] place-items-center px-5">
      <div className="bb-panel bb-text-secondary flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold shadow-[var(--bb-shadow-md)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bb-accent)] border-t-transparent" />
        جاري تحميل مركز الإدارة الفعلي...
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGate>
      <Suspense fallback={<AdminLoadingState />}>
        <AdminControlCenter />
        <Link href="/admin/ai-team" className="bb-surface-elevated fixed bottom-20 left-5 z-[80] flex items-center gap-2 rounded-2xl border border-[var(--bb-info)] px-4 py-3 text-xs font-black text-[var(--bb-info)] shadow-[var(--bb-shadow-lg)] transition hover:bg-[var(--bb-info-soft)]" title="مراقبة فريق البرمجة الآلي">
          <Bot size={17} /> فريق AI
        </Link>
        <Link href="/admin/support" className="bb-button-primary fixed bottom-5 left-5 z-[80] flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-[var(--bb-shadow-lg)]" title="فتح طلبات الدعم">
          <Headphones size={17} /> طلبات الدعم
        </Link>
      </Suspense>
    </AuthGate>
  );
}
