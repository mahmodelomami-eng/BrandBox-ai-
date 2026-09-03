'use client';

import AuthGate from '../../../components/AuthGate';
import AdminAITeamControlCenter from '../../../components/AdminAITeamControlCenter';
import AdminMobileAITeamPanel from '../../../components/AdminMobileAITeamPanel';

export default function AdminAITeamPage() {
  return (
    <AuthGate>
      <AdminAITeamControlCenter />
      <AdminMobileAITeamPanel />
    </AuthGate>
  );
}
