'use client';

import { Suspense } from 'react';
import AdminControlCenter from '../../components/AdminControlCenter';

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-5rem)] bg-[#07090d]" />}>
      <AdminControlCenter />
    </Suspense>
  );
}
