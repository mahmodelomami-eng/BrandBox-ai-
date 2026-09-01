import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { checkPermission } from '@/lib/auth/rbac-engine';

const REPOSITORY = 'mahmodelomami-eng/BrandBox-ai-';
const GITHUB_API = `https://api.github.com/repos/${REPOSITORY}`;
const CACHE_SECONDS = 300;

type GithubIssue = {
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

type GithubPull = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  head: { ref: string; sha: string };
  base: { ref: string };
};

type GithubRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  created_at: string;
  updated_at: string;
};

type GithubRuns = { workflow_runs: GithubRun[] };

type GithubCombinedStatus = {
  state: string;
  statuses: Array<{
    context: string;
    state: string;
    description: string | null;
    target_url: string | null;
    updated_at: string;
  }>;
};

type MonitorStatus = 'working' | 'testing' | 'reviewing' | 'deploying' | 'waiting' | 'blocked' | 'completed';

type AgentSnapshot = {
  id: string;
  name: string;
  specialty: string;
  status: MonitorStatus;
  task: string;
  note: string;
};

async function githubJson<T>(path: string, fresh: boolean): Promise<T> {
  const options: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'BrandBox-AI-Team-Control-Center',
    },
  };

  if (fresh) options.cache = 'no-store';
  else options.next = { revalidate: CACHE_SECONDS };

  const response = await fetch(`${GITHUB_API}${path}`, options);
  if (!response.ok) throw new Error(`GITHUB_MONITOR_${response.status}`);
  return response.json() as Promise<T>;
}

function workflowState(run?: GithubRun) {
  if (!run) return 'unknown';
  if (['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(run.status)) return 'running';
  return run.conclusion === 'success' ? 'success' : 'failed';
}

function titleWithoutPriority(title: string) {
  return title.replace(/^\[[^\]]+\]\s*/, '').trim();
}

function deriveAgents(params: {
  currentIssue: GithubIssue | null;
  currentPull: GithubPull | null;
  releaseRun?: GithubRun;
  safetyRun?: GithubRun;
  vercel?: GithubCombinedStatus['statuses'][number];
}): AgentSnapshot[] {
  const { currentIssue, currentPull, releaseRun, safetyRun, vercel } = params;
  const task = currentPull
    ? `PR #${currentPull.number} · ${currentPull.title}`
    : currentIssue
      ? `#${currentIssue.number} · ${titleWithoutPriority(currentIssue.title)}`
      : 'لا توجد مهمة إطلاق مفتوحة';
  const text = `${currentPull?.title || ''} ${currentPull?.body || ''}`.toLowerCase();
  const issueNumber = currentIssue?.number || 0;
  const releaseState = workflowState(releaseRun);
  const safetyState = workflowState(safetyRun);
  const vercelState = vercel?.state === 'success' ? 'success' : vercel ? 'failed' : 'unknown';

  const frontendActive = /frontend|\bui\b|\bux\b|mobile|navigation|workspace|dashboard|rtl|screen/.test(text);
  const backendActive = /api|backend|auth|store|project|server|scope|payment|credit|route/.test(text);
  const aiActive = [88, 89, 90].includes(issueNumber) || /openrouter|generation|\bchat\b|image|video|model|provider/.test(text);
  const databaseActive = /database|migration|\bdb\b|rls|supabase|schema|index/.test(text);

  return [
    {
      id: 'manager',
      name: 'AI Tech Lead',
      specialty: 'إدارة التنفيذ والأولويات',
      status: currentIssue || currentPull ? 'working' : 'waiting',
      task,
      note: currentIssue ? `يتابع تسلسل الإطلاق من المهمة #${currentIssue.number}` : 'بانتظار مهمة إطلاق جديدة',
    },
    {
      id: 'frontend',
      name: 'Frontend Agent',
      specialty: 'Next.js · RTL · Mobile · UX',
      status: currentPull && frontendActive ? 'working' : 'waiting',
      task: currentPull && frontendActive ? task : 'بانتظار مهمة واجهة',
      note: currentPull && frontendActive ? 'تغييرات الواجهة مستنتجة من PR الحالي' : 'لا توجد إشارة لعمل واجهة في PR الحالي',
    },
    {
      id: 'backend',
      name: 'Backend Agent',
      specialty: 'API · Auth · Business Rules',
      status: currentPull && backendActive ? 'working' : 'waiting',
      task: currentPull && backendActive ? task : 'بانتظار مهمة Backend',
      note: currentPull && backendActive ? 'نشاط Backend مستنتج من عنوان ووصف PR' : 'لا توجد إشارة Backend نشطة',
    },
    {
      id: 'ai',
      name: 'AI Integration Agent',
      specialty: 'OpenRouter · Models · Generation',
      status: (currentPull && aiActive) || [88, 89, 90].includes(issueNumber) ? 'working' : 'waiting',
      task: (currentPull && aiActive) || [88, 89, 90].includes(issueNumber) ? task : 'بانتظار مهمة تكامل AI',
      note: 'يتابع مسارات المحادثة والصور والفيديو ومزودي النماذج',
    },
    {
      id: 'database',
      name: 'Database Agent',
      specialty: 'Supabase · RLS · Migrations',
      status: currentPull && databaseActive ? 'working' : 'waiting',
      task: currentPull && databaseActive ? task : 'بانتظار تغيير قاعدة بيانات',
      note: 'لا ينفذ تغييرات Production مدمرة',
    },
    {
      id: 'qa',
      name: 'QA Agent',
      specialty: 'Regression · Build · Acceptance',
      status: releaseState === 'failed' ? 'blocked' : releaseState === 'running' ? 'testing' : releaseState === 'success' ? 'completed' : 'waiting',
      task: currentPull ? `Release verification · PR #${currentPull.number}` : 'بانتظار PR للاختبار',
      note: releaseState === 'success' ? 'Release verification ناجح' : releaseState === 'failed' ? 'يوجد فشل في Release verification' : 'يتابع بوابة الاختبارات والبناء',
    },
    {
      id: 'security',
      name: 'Security Reviewer',
      specialty: 'Auth · RLS · Payments · Secrets',
      status: safetyState === 'failed' ? 'blocked' : safetyState === 'running' ? 'reviewing' : safetyState === 'success' ? 'completed' : 'waiting',
      task: currentPull ? `Safety Gate · PR #${currentPull.number}` : 'بانتظار PR للمراجعة',
      note: safetyState === 'success' ? 'Safety Gate ناجح' : 'يراجع حدود الأمان قبل الدمج',
    },
    {
      id: 'devops',
      name: 'DevOps Agent',
      specialty: 'CI/CD · Vercel · Preview',
      status: vercelState === 'failed' ? 'blocked' : vercelState === 'success' ? 'completed' : currentPull ? 'deploying' : 'waiting',
      task: currentPull ? `Vercel Preview · PR #${currentPull.number}` : 'بانتظار نشر Preview',
      note: vercel?.description || 'يتابع حالة النشر وPreview',
    },
  ];
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const role = auth.profile.role;
  const canView = role === 'SUPER_ADMIN' || checkPermission(role, 'audit.read') || checkPermission(role, 'settings.read');
  if (!canView) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

  try {
    const [pulls, issues, runs] = await Promise.all([
      githubJson<GithubPull[]>('/pulls?state=open&per_page=10&sort=updated&direction=desc', fresh),
      githubJson<GithubIssue[]>('/issues?state=all&per_page=100&sort=updated&direction=desc', fresh),
      githubJson<GithubRuns>('/actions/runs?per_page=30', fresh),
    ]);

    const openPulls = [...pulls].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const currentPull = openPulls[0] || null;
    const launchIssues = issues
      .filter((issue) => !issue.pull_request && issue.number >= 85 && issue.number <= 98)
      .sort((a, b) => a.number - b.number);
    const launchTasks = launchIssues.filter((issue) => issue.number <= 97);
    const currentIssue = launchTasks.find((issue) => issue.state === 'open') || null;
    const launchProgram = launchIssues.find((issue) => issue.number === 98) || null;

    const currentRuns = currentPull
      ? runs.workflow_runs.filter((run) => run.head_sha === currentPull.head.sha || run.head_branch === currentPull.head.ref)
      : [];
    const safetyRun = currentRuns.find((run) => run.name === 'AI PR Safety Gate');
    const releaseRun = currentRuns.find((run) => run.name === 'Release v1 verification');

    let combinedStatus: GithubCombinedStatus | null = null;
    if (currentPull) {
      combinedStatus = await githubJson<GithubCombinedStatus>(`/commits/${currentPull.head.sha}/status`, fresh);
    }
    const vercel = combinedStatus?.statuses.find((status) => status.context.toLowerCase() === 'vercel');

    const agents = deriveAgents({ currentIssue, currentPull, releaseRun, safetyRun, vercel });
    const statusCounts = agents.reduce<Record<string, number>>((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {});

    const timeline = [
      ...runs.workflow_runs.slice(0, 10).map((run) => ({
        id: `run-${run.id}`,
        type: 'workflow',
        title: `${run.name} #${run.run_number}`,
        status: workflowState(run),
        at: run.updated_at,
        url: run.html_url,
      })),
      ...openPulls.slice(0, 5).map((pull) => ({
        id: `pr-${pull.number}`,
        type: 'pull_request',
        title: `PR #${pull.number} · ${pull.title}`,
        status: pull.draft ? 'draft' : 'open',
        at: pull.updated_at,
        url: pull.html_url,
      })),
      ...launchIssues.slice(0, 8).map((issue) => ({
        id: `issue-${issue.number}`,
        type: 'launch_issue',
        title: `#${issue.number} · ${titleWithoutPriority(issue.title)}`,
        status: issue.state,
        at: issue.updated_at,
        url: issue.html_url,
      })),
    ]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 16);

    const completedTasks = launchTasks.filter((issue) => issue.state === 'closed').length;

    return NextResponse.json({
      repository: {
        name: REPOSITORY,
        url: `https://github.com/${REPOSITORY}`,
      },
      launch: {
        program: launchProgram,
        currentIssue,
        total: launchTasks.length,
        completed: completedTasks,
        open: launchTasks.length - completedTasks,
      },
      currentPull: currentPull
        ? {
            number: currentPull.number,
            title: currentPull.title,
            url: currentPull.html_url,
            branch: currentPull.head.ref,
            sha: currentPull.head.sha,
            updatedAt: currentPull.updated_at,
          }
        : null,
      pullRequests: openPulls.map((pull) => ({
        number: pull.number,
        title: pull.title,
        url: pull.html_url,
        branch: pull.head.ref,
        draft: pull.draft,
        updatedAt: pull.updated_at,
      })),
      ci: {
        safety: { state: workflowState(safetyRun), url: safetyRun?.html_url || null },
        release: { state: workflowState(releaseRun), url: releaseRun?.html_url || null },
        vercel: {
          state: vercel?.state || (currentPull ? 'pending' : 'unknown'),
          description: vercel?.description || null,
          url: vercel?.target_url || null,
        },
      },
      agents,
      statusCounts,
      timeline,
      snapshotAt: new Date().toISOString(),
      cacheSeconds: fresh ? 0 : CACHE_SECONDS,
      statusSource: 'GitHub activity inference',
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'GITHUB_MONITOR_UNAVAILABLE';
    console.error('[admin/ai-team] GitHub monitoring failed', { code });
    return NextResponse.json({ error: 'GITHUB_MONITOR_UNAVAILABLE' }, { status: 503 });
  }
}
