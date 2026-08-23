'use client';

import App from '../../../App';
import AuthGate from '../../components/AuthGate';
import LegacyWorkspaceStateBridge from '../../components/LegacyWorkspaceStateBridge';
import ProjectDeleteEnhancer from '../../components/ProjectDeleteEnhancer';
import AdminUserManagementEnhancer from '../../components/AdminUserManagementEnhancer';
import AdminNavigationStabilizer from '../../components/AdminNavigationStabilizer';
import UserExperienceEnhancer from '../../components/UserExperienceEnhancer';
import SidebarPricingEnhancer from '../../components/SidebarPricingEnhancer';
import PricingRouteIntentEnhancer from '../../components/PricingRouteIntentEnhancer';
import UserDashboardToolChooserEnhancer from '../../components/UserDashboardToolChooserEnhancer';
import AdminWorkspaceReturnFix from '../../components/AdminWorkspaceReturnFix';

export default function DashboardPage() {
  return (
    <AuthGate>
      <LegacyWorkspaceStateBridge view="dashboard">
        <ProjectDeleteEnhancer />
        <AdminNavigationStabilizer>
          <AdminUserManagementEnhancer />
        </AdminNavigationStabilizer>
        <AdminWorkspaceReturnFix />
        <UserExperienceEnhancer />
        <SidebarPricingEnhancer />
        <PricingRouteIntentEnhancer />
        <UserDashboardToolChooserEnhancer />
        <App />
      </LegacyWorkspaceStateBridge>
    </AuthGate>
  );
}
