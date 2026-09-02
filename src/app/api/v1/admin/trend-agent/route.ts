import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { checkPermission } from '@/lib/auth/rbac-engine';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const role = auth.profile.role;
  if (!(role === 'SUPER_ADMIN' || checkPermission(role, 'settings.read') || checkPermission(role, 'audit.read'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database
    .from('trend_briefs')
    .select('id,title,trend_score,workflow_status,source_platform,discovered_at,updated_at')
    .not('workflow_status', 'in', '(rejected,published)')
    .order('trend_score', { ascending: false })
    .order('discovered_at', { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: 'TREND_AGENT_QUEUE_UNAVAILABLE' }, { status: 503 });

  const queue = data || [];
  const designing = queue.filter((item) => ['designing', 'testing', 'approved'].includes(item.workflow_status));
  const shortlisted = queue.filter((item) => item.workflow_status === 'shortlisted');
  const status = designing.length ? 'working' : shortlisted.length ? 'reviewing' : queue.length ? 'researching' : 'waiting';
  const next = designing[0] || shortlisted[0] || queue[0] || null;

  return NextResponse.json({
    agent: {
      id: 'trend-intelligence',
      name: 'Trend Intelligence & Prompt Research Agent',
      specialty: 'Trend Discovery · Prompt Research · Arabic Localization · Scoring',
      status,
      task: next ? `${next.title} · ${Math.round(Number(next.trend_score || 0))}/100` : 'البحث عن موجة ترند جديدة',
      note: next ? `الحالة: ${next.workflow_status} · المصدر: ${next.source_platform}` : 'لا توجد فكرة معلقة في المسار حاليًا.',
    },
    queue: {
      total: queue.length,
      shortlisted: shortlisted.length,
      designing: designing.length,
    },
    snapshotAt: new Date().toISOString(),
    statusSource: 'Trend Lab database workflow',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
