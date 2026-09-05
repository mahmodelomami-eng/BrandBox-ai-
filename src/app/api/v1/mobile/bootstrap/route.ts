import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  const [
    { data: profile, error: profileError },
    { data: projects, error: projectsError },
    { data: subscription, error: subscriptionError },
  ] = await Promise.all([
    database.from('profiles')
      .select('id,first_name,last_name,avatar_url,credit_balance,status')
      .eq('id', auth.user.id)
      .maybeSingle(),
    database.from('projects')
      .select('id,name,type,industry,thumbnail_url,created_at,updated_at')
      .eq('owner_id', auth.user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(100),
    database.from('subscriptions')
      .select('plan_id,status,current_period_end')
      .eq('user_id', auth.user.id)
      .in('status', ['active', 'past_due'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileError || !profile) return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 503 });
  if (projectsError) return NextResponse.json({ error: 'PROJECTS_UNAVAILABLE' }, { status: 503 });
  if (subscriptionError) return NextResponse.json({ error: 'SUBSCRIPTION_UNAVAILABLE' }, { status: 503 });

  return NextResponse.json({
    profile: {
      id: profile.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      avatarUrl: profile.avatar_url || null,
      creditBalance: Number(profile.credit_balance || 0),
      status: profile.status,
    },
    subscription: subscription ? {
      planId: subscription.plan_id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    } : null,
    projects: (projects || []).map((project) => ({
      id: project.id,
      name: project.name,
      type: project.type,
      industry: project.industry || null,
      thumbnailUrl: project.thumbnail_url || null,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    })),
  });
}
