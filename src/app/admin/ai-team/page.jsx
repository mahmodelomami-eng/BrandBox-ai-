'use client';

import AuthGate from '../../../components/AuthGate';
import AdminAITeamControlCenter from '../../../components/AdminAITeamControlCenter';

export default function AdminAITeamPage() {
  return (
    <AuthGate>
      <AdminAITeamControlCenter />
    </AuthGate>
  );
}
