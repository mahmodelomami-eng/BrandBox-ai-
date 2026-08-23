import AuthGate from '../../../components/AuthGate';
import ToolProjectsWorkspace from '../../../components/ToolProjectsWorkspace';

export default function VideoProjectsPage() {
  return (
    <AuthGate>
      <ToolProjectsWorkspace tool="video" />
    </AuthGate>
  );
}
