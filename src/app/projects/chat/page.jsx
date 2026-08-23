import AuthGate from '../../../components/AuthGate';
import ToolProjectsWorkspace from '../../../components/ToolProjectsWorkspace';

export default function ChatProjectsPage() {
  return (
    <AuthGate>
      <ToolProjectsWorkspace tool="chat" />
    </AuthGate>
  );
}
