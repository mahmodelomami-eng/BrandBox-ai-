'use client';

import React from 'react';
import DashboardSpecialtyPage from '../../../components/DashboardSpecialtyPage';

export default function Page() {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardSpecialtyPage type="brand" />
      </div>
    </main>
  );
}
