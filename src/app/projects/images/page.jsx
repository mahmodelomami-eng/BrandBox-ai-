import AuthGate from '../../../components/AuthGate';
import ToolProjectsWorkspace from '../../../components/ToolProjectsWorkspace';

export default function ImageProjectsPage() {
  return (
    <AuthGate>
      <ToolProjectsWorkspace tool="images" />
    </AuthGate>
  );
}
