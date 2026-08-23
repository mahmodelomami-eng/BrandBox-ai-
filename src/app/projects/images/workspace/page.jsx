import AuthGate from '../../../../components/AuthGate';
import ImageStudioWorkspace from '../../../../components/ImageStudioWorkspace';

export default function ImageProjectWorkspacePage() {
  return (
    <AuthGate>
      <ImageStudioWorkspace />
    </AuthGate>
  );
}
