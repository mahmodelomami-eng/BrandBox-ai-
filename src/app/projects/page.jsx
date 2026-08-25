import AuthGate from '../../components/AuthGate';
import ProjectsToolHub from '../../components/ProjectsToolHub';

export default function ProjectsPage() {
  return (
    <AuthGate>
      <ProjectsToolHub />
    </AuthGate>
  );
}
