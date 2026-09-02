'use client';

import AuthGate from '../../../components/AuthGate';
import AdminTrendLabPanel from '../../../components/AdminTrendLabPanel';
import TrendAgentStatusCard from '../../../components/TrendAgentStatusCard';

export default function AdminTrendLabPage() {
  return (
    <AuthGate>
      <TrendAgentStatusCard />
      <AdminTrendLabPanel />
    </AuthGate>
  );
}
