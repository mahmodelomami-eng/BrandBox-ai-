import AuthGate from '../../../components/AuthGate';
import AdminAIModelManager from '../../../components/AdminAIModelManager';
import OpenRouterHealthCard from '../../../components/OpenRouterHealthCard';

export default function AdminAIPage() {
  return (
    <AuthGate>
      <OpenRouterHealthCard />
      <AdminAIModelManager />
    </AuthGate>
  );
}
