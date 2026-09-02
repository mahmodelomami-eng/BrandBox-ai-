'use client';

import AuthGate from '../../../components/AuthGate';
import AdminTrendLabPanel from '../../../components/AdminTrendLabPanel';

export default function AdminTrendLabPage() {
  return (
    <AuthGate>
      <AdminTrendLabPanel />
    </AuthGate>
  );
}
