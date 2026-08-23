'use client';

import WorkspaceDashboardShell from '../../../components/WorkspaceDashboardShell';
import AccountSettings from '../../../components/AccountSettings';

export default function Page() {
  return (
    <WorkspaceDashboardShell title="إعدادات الحساب" subtitle="تعديل البروفايل والبيانات والروابط الخاصة بك">
      <AccountSettings />
    </WorkspaceDashboardShell>
  );
}
