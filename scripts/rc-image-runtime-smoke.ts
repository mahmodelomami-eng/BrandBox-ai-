import { GenerationEngine } from '../src/lib/generations/generation-engine';
import { createPrivilegedSupabaseClient } from '../src/lib/supabase/server';

const TARGET_BRANCH = 'launch/97-image-runtime-smoke';
const STAGING_PROJECT_REF = 'coiprfontulttcjhnhlp';
const TEST_USER_ID = 'a9f2b8ee-f042-4fe9-9f46-72bdbd001cca';
const TEST_USER_EMAIL = 'store.test.staging@brandbox.ai';
const MODEL_ID = 'bytedance-seed/seedream-5-0-lite';
const REQUEST_ID = 'rc_image_smoke_20260905_01';

const isTargetPreview = process.env.VERCEL === '1'
  && process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

if (!isTargetPreview) {
  console.log('RC image runtime smoke: skipped outside the dedicated Vercel Preview branch.');
  process.exit(0);
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
if (!supabaseUrl.includes(`${STAGING_PROJECT_REF}.supabase.co`)) {
  console.error('RC image runtime smoke: refusing to run outside the dedicated staging Supabase project.');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('RC image runtime smoke: privileged staging database access is unavailable.');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error('RC image runtime smoke: OpenRouter Preview key is unavailable.');
  process.exit(1);
}

const database = createPrivilegedSupabaseClient();
const { data: profile, error: profileError } = await database
  .from('profiles')
  .select('id,email,status,credit_balance')
  .eq('id', TEST_USER_ID)
  .eq('email', TEST_USER_EMAIL)
  .maybeSingle();
if (profileError || !profile || profile.status !== 'active') {
  console.error('RC image runtime smoke: dedicated active staging test profile is unavailable.');
  process.exit(1);
}

const { data: model, error: modelError } = await database
  .from('ai_model_catalog')
  .select('model_id,minimum_credits,is_enabled,is_visible_to_users')
  .eq('provider', 'openrouter')
  .eq('generation_type', 'image')
  .eq('model_id', MODEL_ID)
  .maybeSingle();
if (modelError || !model || !model.is_enabled || !model.is_visible_to_users) {
  console.error('RC image runtime smoke: launch image model is not enabled in the staging catalog.');
  process.exit(1);
}

const unitCredits = Math.trunc(Number(model.minimum_credits));
if (!Number.isFinite(unitCredits) || unitCredits < 1 || Number(profile.credit_balance) < unitCredits) {
  console.error('RC image runtime smoke: staging test balance or server-authoritative model pricing is invalid.');
  process.exit(1);
}

const result = await GenerationEngine.executeGeneration(
  { userId: TEST_USER_ID, email: TEST_USER_EMAIL, role: 'USER' },
  {
    generationType: 'image',
    modelId: MODEL_ID,
    prompt: 'A clean studio product photograph of a matte black cube on a neutral light background, soft diffused lighting, no text, centered composition.',
    requestId: REQUEST_ID,
    settings: { count: 1, aspectRatio: '1:1', resolution: '1K' },
  },
  { unitCredits }
);

const safeResult = {
  success: result.success,
  generationId: result.generationId,
  status: result.status,
  creditsConsumed: result.creditsConsumed,
  remainingBalance: result.remainingBalance,
  assetCount: Array.isArray(result.storagePaths) ? result.storagePaths.length : 0,
  errorCode: result.success ? undefined : String(result.errorMessage || 'GENERATION_FAILED').split(':')[0],
};
console.log(`RC image runtime smoke: ${JSON.stringify(safeResult)}`);

if (!result.success || result.status !== 'completed' || safeResult.assetCount !== 1 || result.creditsConsumed !== unitCredits) {
  process.exit(1);
}
