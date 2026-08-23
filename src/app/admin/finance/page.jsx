'use client';
import WorkspaceDashboardShell from '../../../components/WorkspaceDashboardShell';
import AdminDepartmentDashboard from '../../../components/AdminDepartmentDashboard';
export default function Page(){return <WorkspaceDashboardShell admin title="المالية والاشتراكات" subtitle="الباقات والأرصدة والمدفوعات"><AdminDepartmentDashboard type="finance"/></WorkspaceDashboardShell>;}
