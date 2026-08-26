import AuthGate from '../../../components/AuthGate';
import AdminAIModelManager from '../../../components/AdminAIModelManager';

export default function AdminAIPage() {
  return (
    <AuthGate>
      <AdminAIModelManager />
    </AuthGate>
  );
}
