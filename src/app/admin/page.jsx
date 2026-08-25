'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Headphones } from 'lucide-react';
import AuthGate from '../../components/AuthGate';
import AdminControlCenter from '../../components/AdminControlCenter';

function AdminLoadingState() {
  return (
    <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10131a] px-5 py-4 text-sm font-bold text-gray-400 shadow-2xl">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f31325] border-t-transparent" />
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
        <Link href="/admin/support" className="fixed bottom-5 left-5 z-[80] flex items-center gap-2 rounded-2xl border border-[#f31325]/35 bg-[#11131a] px-4 py-3 text-xs font-black text-white shadow-2xl transition hover:border-[#f31325] hover:bg-[#f31325]" title="فتح طلبات الدعم">
          <Headphones size={17} /> طلبات الدعم
        </Link>
      </Suspense>
    </AuthGate>
  );
}
