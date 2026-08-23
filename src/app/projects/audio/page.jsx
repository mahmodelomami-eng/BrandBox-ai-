import AuthGate from '../../../components/AuthGate';
import ToolProjectsWorkspace from '../../../components/ToolProjectsWorkspace';

export default function AudioProjectsPage() {
  return (
    <AuthGate>
      <ToolProjectsWorkspace tool="audio" />
    </AuthGate>
  );
}
