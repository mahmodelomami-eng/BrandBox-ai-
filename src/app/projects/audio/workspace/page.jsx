import AuthGate from '../../../../components/AuthGate';
import MediaProjectWorkspace from '../../../../components/MediaProjectWorkspace';
import ProjectWorkspaceGate from '../../../../components/ProjectWorkspaceGate';

function stringParam(value) {
  return typeof value === 'string' ? value : '';
}

export default async function AudioProjectPage({ searchParams }) {
  const params = await Promise.resolve(searchParams);
  const projectId = stringParam(params?.project);
  const initialPrompt = stringParam(params?.prompt);
  const templateSettings = {
    voice: stringParam(params?.voice),
    language: stringParam(params?.language),
    speed: stringParam(params?.speed),
  };

  return (
    <AuthGate>
      <ProjectWorkspaceGate tool="audio" projectId={projectId}>
        <MediaProjectWorkspace
          tool="audio"
          projectId={projectId}
          initialPrompt={initialPrompt}
          templateSettings={templateSettings}
        />
      </ProjectWorkspaceGate>
    </AuthGate>
  );
}
