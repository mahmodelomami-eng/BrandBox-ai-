'use client';

import React, { Suspense } from 'react';
import AuthGate from '../../components/AuthGate';
import AdminControlCenter from '../../components/AdminControlCenter';

function AdminLoadingState() {
  return (
    <main
      dir="rtl"
      className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#07090d] px-5 text-white"
    >
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
      </Suspense>
    </AuthGate>
  );
}
