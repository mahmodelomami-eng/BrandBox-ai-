import AuthGate from '../../../components/AuthGate';
import ProjectTrashWorkspace from '../../../components/ProjectTrashWorkspace';

export default function ProjectTrashPage() {
  return (
    <AuthGate>
      <ProjectTrashWorkspace />
    </AuthGate>
  );
}
