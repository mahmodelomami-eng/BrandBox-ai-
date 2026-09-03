import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { checkPermission } from '@/lib/auth/rbac-engine';

const REPOSITORY = 'mahmodelomami-eng/BrandBox-ai-';
const GITHUB_API = `https://api.github.com/repos/${REPOSITORY}`;
const CACHE_SECONDS = 180;

type GithubIssue = {
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
};

type GithubPull = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  draft: boolean;
  updated_at: string;
  head: { ref: string; sha: string };
};

type GithubRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  head_sha: string;
  updated_at: string;
};

type GithubRuns = { workflow_runs: GithubRun[] };

type MonitorStatus = 'working' | 'testing' | 'reviewing' | 'waiting' | 'blocked' | 'completed';

type MobileAgent = {
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
      'User-Agent': 'BrandBox-Mobile-AI-Team-Control-Center',
    },
  };
  if (fresh) options.cache = 'no-store';
  else options.next = { revalidate: CACHE_SECONDS };

  const response = await fetch(`${GITHUB_API}${path}`, options);
  if (!response.ok) throw new Error(`GITHUB_MOBILE_MONITOR_${response.status}`);
  return response.json() as Promise<T>;
}

function workflowState(run?: GithubRun): 'running' | 'success' | 'failed' | 'unknown' {
  if (!run) return 'unknown';
  if (['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(run.status)) return 'running';
  return run.conclusion === 'success' ? 'success' : 'failed';
}

function isMobilePull(pull: GithubPull) {
  const branch = pull.head.ref.toLowerCase();
  const text = `${pull.title} ${pull.body || ''}`.toLowerCase();
  return branch.includes('mobile')
    || /apps\/mobile|expo|react native|campaign composer|social oauth|social publishing|social scheduler|trend-to-campaign|mobile product/.test(text)
    || /#159\b|#163\b|#165\b|#167\b|#169\b|#172\b/.test(text);
}

function isMobileIssue(issue: GithubIssue) {
  if (issue.pull_request) return false;
  const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
  return issue.number === 159 || issue.number >= 163 && issue.number <= 172
    || /brand box mobile|mobile app|expo|react native|campaign composer|social oauth|social publishing|social scheduler|trend-to-campaign/.test(text);
}

function agentStatus(active: boolean, review: boolean, ciState: ReturnType<typeof workflowState>): MonitorStatus {
  if (ciState === 'failed') return 'blocked';
  if (ciState === 'running') return review ? 'reviewing' : 'testing';
  if (ciState === 'success' && !active) return 'completed';
  if (active) return review ? 'reviewing' : 'working';
  return 'waiting';
}

function deriveMobileAgents(params: {
  pull: GithubPull | null;
  issue: GithubIssue | null;
  mobileCi?: GithubRun;
  releaseRun?: GithubRun;
}) {
  const { pull, issue, mobileCi, releaseRun } = params;
  const task = pull
    ? `PR #${pull.number} · ${pull.title}`
    : issue
      ? `#${issue.number} · ${issue.title}`
      : 'بانتظار مهمة Mobile جديدة';
  const text = `${pull?.title || ''} ${pull?.body || ''} ${issue?.title || ''} ${issue?.body || ''}`.toLowerCase();
  const ciState = workflowState(mobileCi || releaseRun);
  const hasWork = Boolean(pull || issue);

  const product = hasWork && /product|ux|flow|navigation|rtl|accessibility|onboarding|project|trend|campaign|planner|store/.test(text);
  const expo = hasWork && /expo|react native|mobile|navigation|screen|deep link|router|android|ios|project|trend|campaign|planner/.test(text);
  const ai = hasWork && /ai|generation|chat|image|video|campaign composer|openrouter|model|prompt/.test(text);
  const trends = hasWork && /trend|opportunit|radar|signal|campaign/.test(text);
  const social = hasWork && /social|oauth|meta|tiktok|youtube|linkedin|publish|scheduler|planner/.test(text);
  const commerce = hasWork && /store|catalog|sku|checkout|purchase|entitlement|delivery|refund|subscription|gift card/.test(text);
  const backend = hasWork && /api|backend|server|database|supabase|rls|migration|auth|project|social|store/.test(text);
  const security = hasWork && /auth|oauth|token|secret|rls|security|permission|scope|checkout|publishing/.test(text);
  const qa = hasWork;

  const agents: MobileAgent[] = [
    {
      id: 'mobile-product-ux',
      name: 'Mobile Product/UX Lead',
      specialty: 'Information Architecture · Arabic RTL · Accessibility · Mobile UX',
      status: agentStatus(product, true, ciState),
      task: product ? task : 'مراجعة تجربة التطبيق وتدفقاته',
      note: product ? 'يراجع اكتمال التدفق، وضوح CTA، حالات loading/empty/error وتجربة العربية أولًا.' : 'جاهز لمراجعة أي تدفق Mobile جديد.',
    },
    {
      id: 'mobile-expo-engineer',
      name: 'Expo/React Native Engineer',
      specialty: 'Expo Router · React Native · Navigation · Performance · Release Builds',
      status: agentStatus(expo, false, ciState),
      task: expo ? task : 'بانتظار مهمة Expo/React Native',
      note: 'مسؤول عن تنفيذ شاشات التطبيق والتنقل والروابط العميقة وأداء iOS/Android.',
    },
    {
      id: 'mobile-ai-integration',
      name: 'Mobile AI Integration Engineer',
      specialty: 'Chat · Image · Video · Campaign Composer · Credits',
      status: agentStatus(ai, false, ciState),
      task: ai ? task : 'بانتظار مهمة AI داخل التطبيق',
      note: 'يربط أدوات الذكاء الاصطناعي بالخادم مع إبقاء الرصيد والتسعير والسلطة Server-side.',
    },
    {
      id: 'mobile-trends',
      name: 'Trends Intelligence Engineer',
      specialty: 'Trend Radar · Signal Integrity · Localization · Trend-to-Campaign',
      status: agentStatus(trends, false, ciState),
      task: trends ? task : 'بانتظار مهمة Trends',
      note: 'يمنع تقديم Preview على أنه Live ويغلق مسار Trend → Campaign باحترافية.',
    },
    {
      id: 'mobile-social',
      name: 'Social OAuth & Publishing Engineer',
      specialty: 'OAuth · Provider Adapters · Scheduler · Publishing · Token Security',
      status: agentStatus(social, false, ciState),
      task: social ? task : 'بانتظار مهمة Social',
      note: 'يتابع Meta/TikTok/YouTube/LinkedIn مع إبقاء التوكنات والأسرار خارج التطبيق.',
    },
    {
      id: 'mobile-commerce',
      name: 'Digital Commerce Engineer',
      specialty: 'Digital Catalog · Entitlements · Delivery · Refunds · Store Compliance',
      status: agentStatus(commerce, false, ciState),
      task: commerce ? task : 'بانتظار مهمة المتجر الرقمي',
      note: 'المتجر داخل التطبيق رقمي فقط ويظل الدفع الأصلي مقفلاً حتى مسار متوافق مع سياسات المتاجر.',
    },
    {
      id: 'mobile-backend-db',
      name: 'Mobile Backend/Database Engineer',
      specialty: 'APIs · Supabase · RLS · Tenant Isolation · Server Capabilities',
      status: agentStatus(backend, false, ciState),
      task: backend ? task : 'بانتظار مهمة Backend/Database للموبايل',
      note: 'ينفذ تغييرات إضافية آمنة ولا يمنح العميل سلطة على الملكية أو الأرصدة أو الصلاحيات.',
    },
    {
      id: 'mobile-security',
      name: 'Mobile Security Reviewer',
      specialty: 'Sessions · OAuth Secrets · Provider Tokens · Abuse Prevention',
      status: agentStatus(security, true, ciState),
      task: security ? task : 'بانتظار مراجعة أمن Mobile',
      note: 'يراجع حدود الجلسات والتوكنات والأسرار والمشتريات قبل الدمج أو التفعيل الخارجي.',
    },
    {
      id: 'mobile-qa-release',
      name: 'Mobile QA/Release Engineer',
      specialty: 'iOS/Android Regression · RTL · Error States · Typecheck · Release Readiness',
      status: ciState === 'failed' ? 'blocked' : ciState === 'running' ? 'testing' : ciState === 'success' ? 'completed' : qa ? 'testing' : 'waiting',
      task: pull ? `Mobile CI · PR #${pull.number}` : issue ? task : 'بانتظار Build أو PR للموبايل',
      note: ciState === 'success' ? 'Mobile CI ناجح لآخر مهمة Mobile مرصودة.' : ciState === 'failed' ? 'يوجد فشل في بوابة Mobile CI يحتاج إصلاحًا قبل الدمج.' : 'يتابع TypeScript وGuards وتجربة RTL وحالات الفشل.',
    },
  ];

  return { agents, ciState };
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
      githubJson<GithubPull[]>('/pulls?state=open&per_page=30&sort=updated&direction=desc', fresh),
      githubJson<GithubIssue[]>('/issues?state=open&per_page=100&sort=updated&direction=desc', fresh),
      githubJson<GithubRuns>('/actions/runs?per_page=50', fresh),
    ]);

    const mobilePulls = pulls.filter(isMobilePull).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const mobileIssues = issues.filter(isMobileIssue).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const currentPull = mobilePulls[0] || null;
    const currentIssue = mobileIssues.find((item) => item.number !== 159) || mobileIssues[0] || null;

    const currentRuns = currentPull
      ? runs.workflow_runs.filter((run) => run.head_sha === currentPull.head.sha || run.head_branch === currentPull.head.ref)
      : [];
    const mobileCi = currentRuns.find((run) => run.name === 'mobile-ci');
    const releaseRun = currentRuns.find((run) => run.name === 'Release v1 verification');
    const { agents, ciState } = deriveMobileAgents({ pull: currentPull, issue: currentIssue, mobileCi, releaseRun });

    const statusCounts = agents.reduce<Record<string, number>>((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      team: 'mobile',
      teamName: 'Mobile App Team',
      agentCount: agents.length,
      agents,
      statusCounts,
      currentIssue: currentIssue ? {
        number: currentIssue.number,
        title: currentIssue.title,
        url: currentIssue.html_url,
        updatedAt: currentIssue.updated_at,
      } : null,
      currentPull: currentPull ? {
        number: currentPull.number,
        title: currentPull.title,
        url: currentPull.html_url,
        branch: currentPull.head.ref,
        sha: currentPull.head.sha,
        updatedAt: currentPull.updated_at,
      } : null,
      ci: {
        state: ciState,
        url: mobileCi?.html_url || releaseRun?.html_url || null,
      },
      snapshotAt: new Date().toISOString(),
      cacheSeconds: fresh ? 0 : CACHE_SECONDS,
      statusSource: 'GitHub mobile work inference',
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'GITHUB_MOBILE_MONITOR_UNAVAILABLE';
    console.error('[admin/mobile-ai-team] monitoring failed', { code });
    return NextResponse.json({ error: 'GITHUB_MOBILE_MONITOR_UNAVAILABLE' }, { status: 503 });
  }
}
