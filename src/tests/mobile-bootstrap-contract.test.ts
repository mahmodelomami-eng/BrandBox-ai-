import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/v1/mobile/bootstrap/route.ts');
const source = readFileSync(routePath, 'utf8');

const assertions: Array<[boolean, string]> = [
  [source.includes("authenticateActiveUser(request)"), 'mobile bootstrap must require an active authenticated user'],
  [source.includes(".eq('owner_id', auth.user.id)"), 'project reads must remain owner-scoped'],
  [source.includes(".eq('user_id', auth.user.id)"), 'subscription reads must remain user-scoped'],
  [source.includes('{ data: subscription, error: subscriptionError }'), 'subscription lookup errors must be captured'],
  [source.includes("if (subscriptionError) return NextResponse.json({ error: 'SUBSCRIPTION_UNAVAILABLE' }, { status: 503 });"), 'subscription lookup failures must fail closed with a stable public error code'],
  [!source.includes('subscriptionError.message'), 'mobile bootstrap must not reflect raw subscription errors'],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Mobile bootstrap contract regression: ${message}`);
}

console.log('Mobile bootstrap contract regression guard passed.');
