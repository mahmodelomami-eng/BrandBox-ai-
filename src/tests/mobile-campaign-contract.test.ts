import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(join(process.cwd(), 'src/app/api/v1/mobile/campaigns/compose/route.ts'), 'utf8');

function assertContract(name: string, condition: boolean) {
  if (!condition) throw new Error(`Mobile campaign contract failed: ${name}`);
  console.log(`PASS: ${name}`);
}

assertContract('campaign composer requires centralized active-user auth and owner-scoped project context',
  route.includes('authenticateActiveUser(request)') &&
  route.includes(".eq('owner_id', auth.user.id)") &&
  route.includes(".eq('user_id', auth.user.id)"),
);

assertContract('brand kit lookup failures fail closed with a stable public code',
  route.includes('{ data: brandKit, error: brandKitError }') &&
  route.includes("if (brandKitError) return NextResponse.json({ error: 'BRAND_KIT_UNAVAILABLE' }, { status: 503 });") &&
  !route.includes('brandKitError.message'),
);

assertContract('model pricing and generation authority stay server-side',
  route.includes(".select('model_id,minimum_credits,sort_order')") &&
  route.includes('const unitCredits = Math.max(1, Math.trunc(minimumCredits));') &&
  route.includes('GenerationEngine.executeGeneration('),
);

console.log('Mobile campaign backend contract guard passed.');
