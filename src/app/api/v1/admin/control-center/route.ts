import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';

type Actor = {
  userId: string;
  email: string;
  role: AdminRole;
};

type QueryResult<T> = { data: T[] | null; error: { message?: string } | null };

const restrictedResult = <T>(): Promise<QueryResult<T>> => Promise.resolve({ data: [], error: null });

function canEnterControlCenter(role: AdminRole) {
  return checkPermission(role, 'analytics.read')
    || checkPermission(role, 'users.read')
    || checkPermission(role, 'projects.read')
    || checkPermission(role, 'subscriptions.read')
    || checkPermission(role, 'payments.read')
    || checkPermission(role, 'credits.read')
    || checkPermission(role, 'plans.read')
    || checkPermission(role, 'packages.read')
    || checkPermission(role, 'providers.read')
    || checkPermission(role, 'models.read')
    || checkPermission(role, 'generations.read')
    || checkPermission(role, 'assets.read')
    || checkPermission(role, 'audit.read')
    || checkPermission(role, 'settings.read')
    || checkPermission(role, 'support.read');
}

async function actorFromRequest(request: NextRequest): Promise<Actor | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== 'active') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role) || !canEnterControlCenter(role)) return null;

  return {
    userId: data.user.id,
    email: profile.email || data.user.email || '',
    role,
  };
}

function sumNumber<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const canViewUsers = checkPermission(actor.role, 'users.read');
  const canViewProjects = checkPermission(actor.role, 'projects.read');
  const canViewSubscriptions = checkPermission(actor.role, 'subscriptions.read');
  const canViewPayments = checkPermission(actor.role, 'payments.read');
  const canViewCredits = checkPermission(actor.role, 'credits.read');
  const canViewPlans = checkPermission(actor.role, 'plans.read');
  const canViewPackages = checkPermission(actor.role, 'packages.read');
  const canViewCommercial = canViewPlans || canViewPackages;
  const canViewProviders = checkPermission(actor.role, 'providers.read');
  const canViewModels = checkPermission(actor.role, 'models.read');
  const canViewGenerations = checkPermission(actor.role, 'generations.read');
  const canViewAssets = checkPermission(actor.role, 'assets.read');
  const canViewAI = canViewProviders || canViewModels || canViewGenerations || canViewAssets;
  const canViewAudit = checkPermission(actor.role, 'audit.read');
  const canViewSettings = checkPermission(actor.role, 'settings.read');
  const canViewSupport = checkPermission(actor.role, 'support.read');

  const [
    profilesResult,
    projectsResult,
    subscriptionsResult,
    paymentsResult,
    generationsResult,
    assetsResult,
    creditsResult,
    plansResult,
    packagesResult,
    auditResult,
  ] = await Promise.all([
    canViewUsers
      ? database
          .from('profiles')
          .select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance,last_seen_at,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(1000)
      : restrictedResult<Record<string, unknown>>(),
    canViewProjects
      ? database
          .from('projects')
          .select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,is_favorite,created_at,updated_at')
          .order('updated_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewSubscriptions
      ? database
          .from('subscriptions')
          .select('id,user_id,plan_id,status,provider,current_period_start,current_period_end,auto_renew,cancelled_at,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewPayments
      ? database
          .from('payment_transactions')
          .select('id,order_reference,user_id,provider,provider_tx_id,amount_lyd,currency,status,item_type,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewGenerations
      ? database
          .from('generations')
          .select('id,user_id,project_id,generation_type,provider,model,prompt,status,credits_consumed,result_url,error_message,duration_ms,created_at,provider_cost_usd,total_tokens')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewAssets
      ? database
          .from('assets')
          .select('id,user_id,project_id,generation_id,name,file_path,mime_type,width,height,created_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewCredits
      ? database
          .from('credit_transactions')
          .select('id,user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,created_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
    canViewPlans
      ? database
          .from('plans')
          .select('id,name,description,price_monthly_lyd,price_monthly_usd,monthly_credits,max_projects,video_access,brand_kit_access,commercial_usage,is_active,created_at,updated_at')
          .order('price_monthly_lyd', { ascending: true })
      : restrictedResult<Record<string, unknown>>(),
    canViewPackages
      ? database
          .from('credit_packages')
          .select('id,name,credits,purchased_credits,bonus_credits,bonus_valid_days,price_lyd,is_featured,is_active,sort_order,created_at,updated_at')
          .order('sort_order', { ascending: true })
      : restrictedResult<Record<string, unknown>>(),
    canViewAudit
      ? database
          .from('audit_logs')
          .select('id,actor_id,actor_role,action,resource,resource_id,before_state,after_state,metadata,created_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : restrictedResult<Record<string, unknown>>(),
  ]);

  const sources = {
    profiles: canViewUsers ? (profilesResult.error ? 'error' : 'ok') : 'restricted',
    projects: canViewProjects ? (projectsResult.error ? 'error' : 'ok') : 'restricted',
    subscriptions: canViewSubscriptions ? (subscriptionsResult.error ? 'error' : 'ok') : 'restricted',
    payments: canViewPayments ? (paymentsResult.error ? 'error' : 'ok') : 'restricted',
    generations: canViewGenerations ? (generationsResult.error ? 'error' : 'ok') : 'restricted',
    assets: canViewAssets ? (assetsResult.error ? 'error' : 'ok') : 'restricted',
    credits: canViewCredits ? (creditsResult.error ? 'error' : 'ok') : 'restricted',
    plans: canViewPlans ? (plansResult.error ? 'error' : 'ok') : 'restricted',
    packages: canViewPackages ? (packagesResult.error ? 'error' : 'ok') : 'restricted',
    audit: canViewAudit ? (auditResult.error ? 'error' : 'ok') : 'restricted',
  };

  const profiles = profilesResult.data || [];
  const projects = projectsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];
  const generations = generationsResult.data || [];
  const assets = assetsResult.data || [];
  const credits = creditsResult.data || [];
  const plans = plansResult.data || [];
  const packages = packagesResult.data || [];
  const auditLogs = auditResult.data || [];

  const paidPayments = payments.filter((payment) => payment.status === 'paid');
  const completedGenerations = generations.filter((generation) => generation.status === 'completed');
  const failedGenerations = generations.filter((generation) => generation.status === 'failed');
  const creditIssued = credits.filter((transaction) => Number(transaction.amount) > 0);
  const creditConsumed = credits.filter((transaction) => Number(transaction.amount) < 0);

  return NextResponse.json({
    actor: {
      userId: actor.userId,
      email: actor.email,
      role: actor.role,
    },
    permissions: {
      viewUsers: canViewUsers,
      viewProjects: canViewProjects,
      viewSubscriptions: canViewSubscriptions,
      viewPayments: canViewPayments,
      viewCredits: canViewCredits,
      viewCommercial: canViewCommercial,
      viewAI: canViewAI,
      viewAudit: canViewAudit,
      viewSettings: canViewSettings,
      viewSupport: canViewSupport,
      manageUsers: checkPermission(actor.role, 'users.manage'),
      manageCredits: checkPermission(actor.role, 'credits.adjust'),
      changeRoles: checkPermission(actor.role, 'roles.assign'),
      deleteUsers: checkPermission(actor.role, 'users.delete'),
      manageProviders: checkPermission(actor.role, 'providers.manage'),
      manageModels: checkPermission(actor.role, 'models.manage'),
      manageModelPricing: checkPermission(actor.role, 'models.pricing_manage'),
      manageSettings: checkPermission(actor.role, 'settings.manage'),
    },
    metrics: {
      totalUsers: profiles.length,
      activeUsers: profiles.filter((profile) => profile.status === 'active').length,
      suspendedUsers: profiles.filter((profile) => profile.status === 'suspended').length,
      totalProjects: projects.length,
      activeSubscriptions: subscriptions.filter((subscription) => subscription.status === 'active').length,
      paidRevenueLYD: sumNumber(paidPayments, 'amount_lyd'),
      totalGenerations: generations.length,
      completedGenerations: completedGenerations.length,
      failedGenerations: failedGenerations.length,
      totalCreditsIssued: sumNumber(creditIssued, 'amount'),
      totalCreditsConsumed: Math.abs(sumNumber(creditConsumed, 'amount')),
      totalAssets: assets.length,
    },
    data: {
      profiles,
      projects,
      subscriptions,
      payments,
      generations,
      assets,
      credits,
      plans,
      packages,
      auditLogs,
    },
    sources,
    serverTime: new Date().toISOString(),
  });
}
