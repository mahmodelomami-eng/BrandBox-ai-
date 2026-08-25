'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '../../../components/AuthGate';
import { useAuth } from '../../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import { projectWorkspaceHref } from '../../../lib/projects/project-tools';

function ProjectRouteResolver({ params }) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user?.id || !projectId) return;
    let cancelled = false;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: project, error } = await supabase
        .from('projects')
        .select('id,type')
        .eq('id', projectId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !project) {
        router.replace('/projects');
        return;
      }

      router.replace(projectWorkspaceHref(project.id, project.type));
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, router, user?.id]);

  return (
    <main dir="rtl" className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#050608] text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1016] px-5 py-4 text-sm font-bold text-gray-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
        جاري فتح مساحة المشروع المناسبة...
      </div>
    </main>
  );
}

export default function ProjectWorkspaceCompatibilityPage({ params }) {
  return (
    <AuthGate>
      <ProjectRouteResolver params={params} />
    </AuthGate>
  );
}
