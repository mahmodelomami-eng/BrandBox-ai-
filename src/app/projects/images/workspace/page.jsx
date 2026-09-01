import { Suspense } from 'react';
import AuthGate from '../../../../components/AuthGate';
import ImageStudioWorkspace from '../../../../components/ImageStudioWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

export default async function ImageProjectWorkspacePage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project || '';

  return (
    <AuthGate>
      <Suspense fallback={<div className="min-h-[calc(100vh-5rem)] bg-[#050506]" />}>
        <ProjectWorkspaceGate tool="images" projectId={projectId}>
          <ImageStudioWorkspace />
        </ProjectWorkspaceGate>
      </Suspense>
    </AuthGate>
  );
}
