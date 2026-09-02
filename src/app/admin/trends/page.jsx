'use client';

import AuthGate from '../../../components/AuthGate';
import AdminTrendLab from '../../../components/AdminTrendLab';

export default function AdminTrendLabPage() {
  return (
    <AuthGate>
      <AdminTrendLab />
    </AuthGate>
  );
}
