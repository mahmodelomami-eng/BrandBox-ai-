'use client';

import WorkspaceDashboardShell from '../../components/WorkspaceDashboardShell';
import UserDashboardOverview from '../../components/UserDashboardOverview';

export default function DashboardPage() {
  return <WorkspaceDashboardShell title="لوحة تحكم المستخدم" subtitle="مساحة عملك الرئيسية داخل Brand Box AI"><UserDashboardOverview /></WorkspaceDashboardShell>;
}
