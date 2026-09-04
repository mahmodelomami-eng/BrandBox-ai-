import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/v1/admin/store/readiness/route.ts');
if (!existsSync(routePath)) throw new Error('Missing Store readiness admin route');

const route = readFileSync(routePath, 'utf8');

if (!route.includes("from '@/lib/auth/user-status'")) {
  throw new Error('Store readiness admin route must use the shared active-profile policy');
}
if (!route.includes('!isActiveProfileStatus(profile.status)')) {
  throw new Error('Store readiness admin route must reject every non-active admin profile');
}
if (route.includes("profile.status === 'suspended'")) {
  throw new Error('Store readiness admin route must not use suspended-only authorization');
}

console.log('Store readiness active-admin regression guard passed.');
