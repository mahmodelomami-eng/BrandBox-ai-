import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const database = createServerSupabaseClient();
    const { data, error } = await database
      .from('plans')
      .select('id,name,description,price_monthly_lyd,monthly_credits,monthly_bonus_credits,max_projects,video_access,brand_kit_access,commercial_usage,rollover_enabled,rollover_cap_pct,rollover_max_cycles,renewal_grace_days,is_active')
      .eq('is_active', true)
      .order('price_monthly_lyd', { ascending: true });

    if (error) throw error;

    const plans = (data || []).map((plan) => ({
      id: plan.id,
      name: String(plan.name || '').replace(/\s*\([^)]*\)\s*$/, ''),
      description: plan.description || '',
      priceMonthlyLYD: Number(plan.price_monthly_lyd || 0),
      monthlyCredits: Number(plan.monthly_credits || 0),
      monthlyBonusCredits: Number(plan.monthly_bonus_credits || 0),
      maxProjects: Number(plan.max_projects || 0),
      videoAccess: Boolean(plan.video_access),
      brandKitAccess: Boolean(plan.brand_kit_access),
      commercialUsage: Boolean(plan.commercial_usage),
      rolloverEnabled: Boolean(plan.rollover_enabled),
      rolloverCapPct: Number(plan.rollover_cap_pct || 0),
      rolloverMaxCycles: Number(plan.rollover_max_cycles || 0),
      renewalGraceDays: Number(plan.renewal_grace_days || 0),
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('[Plans API] Active plan catalog unavailable:', error);
    return NextResponse.json(
      { error: 'PLAN_CATALOG_UNAVAILABLE', plans: [] },
      { status: 503 },
    );
  }
}
