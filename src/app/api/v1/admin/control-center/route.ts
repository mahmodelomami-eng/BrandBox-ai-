import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';

type Actor = {
  userId: string;
  email: string;
  role: AdminRole;
};

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

  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(role)) return null;

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
  const canViewCommercial = actor.role !== 'SUPPORT';
  const canViewAudit = actor.role !== 'SUPPORT';
  const canViewCredits = actor.role !== 'SUPPORT';

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
    database
      .from('profiles')
      .select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance,last_seen_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    database
      .from('projects')
      .select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,is_favorite,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(250),
    database
      .from('subscriptions')
      .select('id,user_id,plan_id,status,provider,current_period_start,current_period_end,auto_renew,cancelled_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(250),
    database
      .from('payment_transactions')
      .select('id,order_reference,user_id,provider,provider_tx_id,amount_lyd,currency,status,item_type,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(250),
    database
      .from('generations')
      .select('id,user_id,project_id,generation_type,provider,model,prompt,status,credits_consumed,result_url,error_message,duration_ms,created_at,provider_cost_usd,total_tokens')
      .order('created_at', { ascending: false })
      .limit(250),
    database
      .from('assets')
      .select('id,user_id,project_id,generation_id,name,file_path,mime_type,width,height,created_at')
      .order('created_at', { ascending: false })
      .limit(250),
    canViewCredits
      ? database
          .from('credit_transactions')
          .select('id,user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,created_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [], error: null }),
    canViewCommercial
      ? database
          .from('plans')
          .select('id,name,description,price_monthly_lyd,price_monthly_usd,monthly_credits,max_projects,video_access,brand_kit_access,commercial_usage,is_active,created_at,updated_at')
          .order('price_monthly_lyd', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    canViewCommercial
      ? database
          .from('credit_packages')
          .select('id,name,credits,purchased_credits,bonus_credits,bonus_valid_days,price_lyd,is_featured,is_active,sort_order,created_at,updated_at')
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    canViewAudit
      ? database
          .from('audit_logs')
          .select('id,actor_id,actor_role,action,resource,resource_id,before_state,after_state,metadata,created_at')
          .order('created_at', { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const sources = {
    profiles: profilesResult.error ? 'error' : 'ok',
    projects: projectsResult.error ? 'error' : 'ok',
    subscriptions: subscriptionsResult.error ? 'error' : 'ok',
    payments: paymentsResult.error ? 'error' : 'ok',
    generations: generationsResult.error ? 'error' : 'ok',
    assets: assetsResult.error ? 'error' : 'ok',
    credits: creditsResult.error ? 'error' : 'ok',
    plans: plansResult.error ? 'error' : 'ok',
    packages: packagesResult.error ? 'error' : 'ok',
    audit: auditResult.error ? 'error' : 'ok',
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
      manageUsers: actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN',
      manageCredits: actor.role === 'SUPER_ADMIN',
      changeRoles: actor.role === 'SUPER_ADMIN',
      deleteUsers: actor.role === 'SUPER_ADMIN',
      viewCommercial: canViewCommercial,
      viewAudit: canViewAudit,
      viewCredits: canViewCredits,
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
