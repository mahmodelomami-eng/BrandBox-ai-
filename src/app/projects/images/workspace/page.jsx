import { Suspense } from 'react';
import AuthGate from '../../../../components/AuthGate';
import ImageStudioWorkspace from '../../../../components/ImageStudioWorkspace';

export default function ImageProjectWorkspacePage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="min-h-[calc(100vh-5rem)] bg-[#050506]" />}>
        <ImageStudioWorkspace />
      </Suspense>
    </AuthGate>
  );
}
