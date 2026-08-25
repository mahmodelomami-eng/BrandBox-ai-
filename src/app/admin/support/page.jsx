'use client';

import AuthGate from '../../../components/AuthGate';
import AdminSupportRequests from '../../../components/AdminSupportRequests';

export default function AdminSupportPage() {
  return (
    <AuthGate>
      <AdminSupportRequests />
    </AuthGate>
  );
}
