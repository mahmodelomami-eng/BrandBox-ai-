'use client';
import WorkspaceDashboardShell from '../../../components/WorkspaceDashboardShell';
import AdminDepartmentDashboard from '../../../components/AdminDepartmentDashboard';
export default function Page(){return <WorkspaceDashboardShell admin title="المستخدمون والصلاحيات" subtitle="إدارة الحسابات والأدوار والوصول"><AdminDepartmentDashboard type="users"/></WorkspaceDashboardShell>;}
