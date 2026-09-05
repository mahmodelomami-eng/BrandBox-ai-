import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function source(path: string) {
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) throw new Error(`Missing required navigation/auth file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function assertContract(name: string, condition: boolean) {
  if (!condition) throw new Error(`Navigation/auth regression guard failed: ${name}`);
  console.log(`PASS: ${name}`);
}

const authContext = source('src/context/AuthContext.jsx');
const authGate = source('src/components/AuthGate.jsx');
const globalNavigation = source('src/components/GlobalNavigation.jsx');
const rootPage = source('src/app/page.jsx');
const dashboardPage = source('src/app/dashboard/page.jsx');
const projectsPage = source('src/app/projects/page.jsx');
const imageProjectsPage = source('src/app/projects/images/page.jsx');

assertContract(
  'modern auth starts unresolved with no synthetic user/profile',
  authContext.includes('const [user, setUser] = useState(null)') &&
    authContext.includes('const [profile, setProfile] = useState(null)') &&
    authContext.includes('const [loading, setLoading] = useState(true)'),
);

assertContract(
  'auth profile hydration rejects stale async responses across session changes',
  authContext.includes('const authRevisionRef = useRef(0)') &&
    authContext.includes('const revision = ++authRevisionRef.current') &&
    authContext.includes('authRevisionRef.current !== revision') &&
    authContext.includes('authRevisionRef.current === revision'),
);

assertContract(
  'a changed session user cannot temporarily retain a different user profile',
  authContext.includes('setProfile((currentProfile) => currentProfile?.id === sessionUserId ? currentProfile : null)') &&
    authContext.includes('setProfile(prof?.id === sessionUserId ? prof : null)') &&
    authContext.includes('const sessionUserId = session.user.id'),
);

assertContract(
  'manual profile refresh cannot overwrite a newer authenticated identity',
  authContext.includes('const revision = authRevisionRef.current') &&
    authContext.includes('prof?.id === userId') &&
    authContext.includes('authRevisionRef.current += 1'),
);

assertContract(
  'AuthGate waits for session and profile resolution while preserving pathname plus search',
  authGate.includes('if (loading) return;') &&
    authGate.includes('if (!user) {') &&
    authGate.includes('!profileResolved || activeProfile') &&
    authGate.includes('window.location.pathname') &&
    authGate.includes('window.location.search') &&
    authGate.includes('router.replace(`/auth?next=${encodeURIComponent(nextPath)}`)'),
);

assertContract(
  'global navigation is URL-driven and closes transient menus after route changes',
  globalNavigation.includes("import { usePathname, useRouter } from 'next/navigation'") &&
    globalNavigation.includes("href: '/projects/images'") &&
    globalNavigation.includes("href: '/projects/video'") &&
    globalNavigation.includes("href: '/projects/chat'") &&
    globalNavigation.includes("href: '/projects/audio'") &&
    globalNavigation.includes('setMobileOpen(false);') &&
    globalNavigation.includes('}, [pathname]);'),
);

assertContract(
  'dashboard and projects are real App Router pages rather than activeTab views',
  dashboardPage.includes('StableUserDashboard') &&
    projectsPage.includes('AuthGate') &&
    projectsPage.includes('ProjectsToolHub') &&
    imageProjectsPage.includes('AuthGate') &&
    imageProjectsPage.includes('ToolProjectsWorkspace'),
);

assertContract(
  'legacy view query parameters redirect into canonical routes without mounting root App.jsx',
  rootPage.includes('const LEGACY_VIEW_MAP') &&
    rootPage.includes("dashboard: '/dashboard'") &&
    rootPage.includes("projects: '/projects'") &&
    rootPage.includes("import { redirect } from 'next/navigation'") &&
    rootPage.includes('if (legacyTarget) redirect(legacyTarget)') &&
    !rootPage.includes('router.replace(legacyTarget)') &&
    !/from\s+['"][^'"]*\/?App(?:\.jsx)?['"]/.test(rootPage),
);

const appDir = join(repoRoot, 'src/app');
const legacyAppImport = collectSourceFiles(appDir).find((filePath) => {
  const contents = readFileSync(filePath, 'utf8');
  return /(?:from\s+|require\()['"][^'"]*(?:^|\/)App(?:\.jsx)?['"]/.test(contents);
});

assertContract(
  'no current App Router module imports the legacy repository-root App.jsx',
  !legacyAppImport,
);

console.log('Navigation/auth regression guard passed.');
