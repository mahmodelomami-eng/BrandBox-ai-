import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isActiveProfileStatus } from '../lib/auth/user-status';

const repoRoot = process.cwd();

function source(path: string) {
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) throw new Error(`Missing auth policy file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function assertContract(name: string, condition: boolean) {
  if (!condition) throw new Error(`Active-user auth policy failed: ${name}`);
  console.log(`PASS: ${name}`);
}

assertContract('active is the only allowed protected profile status',
  isActiveProfileStatus('active') &&
  !isActiveProfileStatus('suspended') &&
  !isActiveProfileStatus('pending') &&
  !isActiveProfileStatus(null) &&
  !isActiveProfileStatus(undefined),
);

const authContext = source('src/context/AuthContext.jsx');
const authGate = source('src/components/AuthGate.jsx');
const userAuth = source('src/lib/auth/user-auth.ts');

assertContract('client auth resolves profile before exposing protected content',
  authContext.includes('profileResolved') &&
  authContext.includes('isActiveProfileStatus(profile?.status)') &&
  authGate.includes('!profileResolved || !activeProfile') &&
  authGate.includes("accountStatus === 'suspended' ? 'suspended' : 'unavailable'"),
);

assertContract('non-active client profiles cannot carry role or credit authority',
  authContext.includes("const activeProfile = isActiveProfileStatus(profile?.status) ? profile : null") &&
  authContext.includes("const role = activeProfile?.role || 'USER'") &&
  authContext.includes('const creditBalance = activeProfile?.credit_balance ?? 0'),
);

assertContract('server bearer authentication requires a matching active profile',
  userAuth.includes(".select('id,role,status')") &&
  userAuth.includes('profile.id !== data.user.id') &&
  userAuth.includes('!isActiveProfileStatus(profile.status)'),
);

const protectedApiRoutes = [
  'src/app/api/v1/generations/route.ts',
  'src/app/api/v1/project-stats/route.ts',
  'src/app/api/v1/project-tool-items/route.ts',
  'src/app/api/v1/presence/route.ts',
  'src/app/api/v1/notifications/route.ts',
  'src/app/api/v1/profile/onboarding/route.ts',
  'src/app/api/v1/profile/avatar/route.ts',
];

for (const routePath of protectedApiRoutes) {
  const route = source(routePath);
  assertContract(`${routePath} uses centralized active-user authentication`,
    route.includes("from '@/lib/auth/user-auth'") &&
    route.includes('authenticateActiveUser(request)'),
  );
}

console.log('Active-user authentication policy guard passed.');
