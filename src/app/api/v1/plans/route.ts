import { NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const FALLBACK_PLANS = [
  { id: 'free', name: 'المجانية', description: 'مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.', priceMonthlyLYD: 0, monthlyCredits: 50, maxProjects: 2, videoAccess: false, brandKitAccess: true, commercialUsage: false, rolloverEnabled: false, rolloverCapPct: 0, rolloverMaxCycles: 0, renewalGraceDays: 0, metadata: { pricing_status: 'pilot_v1' } },
  { id: 'starter', name: 'الأساسية', description: 'للأفراد وصناع المحتوى.', priceMonthlyLYD: 49, monthlyCredits: 300, maxProjects: 5, videoAccess: false, brandKitAccess: true, commercialUsage: true, rolloverEnabled: true, rolloverCapPct: 100, rolloverMaxCycles: 1, renewalGraceDays: 7, metadata: { pricing_status: 'pilot_v1' } },
  { id: 'pro', name: 'الاحترافية', description: 'للمحترفين والشركات الصغيرة.', priceMonthlyLYD: 149, monthlyCredits: 1200, maxProjects: 25, videoAccess: true, brandKitAccess: true, commercialUsage: true, rolloverEnabled: true, rolloverCapPct: 100, rolloverMaxCycles: 1, renewalGraceDays: 7, metadata: { pricing_status: 'pilot_v1' } },
  { id: 'business', name: 'الأعمال', description: 'للفرق والوكالات.', priceMonthlyLYD: 449, monthlyCredits: 4000, maxProjects: 100, videoAccess: true, brandKitAccess: true, commercialUsage: true, rolloverEnabled: true, rolloverCapPct: 100, rolloverMaxCycles: 1, renewalGraceDays: 7, metadata: { pricing_status: 'pilot_v1' } },
];

export async function GET() {
  try {
    const database = createPrivilegedSupabaseClient();
    const { data, error } = await database
      .from('plans')
      .select('id,name,description,price_monthly_lyd,monthly_credits,max_projects,video_access,brand_kit_access,commercial_usage,is_active,rollover_enabled,rollover_cap_pct,rollover_max_cycles,renewal_grace_days,monthly_bonus_credits,bonus_valid_days,metadata')
      .eq('is_active', true)
      .order('price_monthly_lyd', { ascending: true });

    if (error) throw error;
    const plans = (data || []).map((plan) => ({
      id: plan.id,
      name: String(plan.name || '').replace(/\s*\([^)]*\)\s*$/, ''),
      description: plan.description || '',
      priceMonthlyLYD: Number(plan.price_monthly_lyd || 0),
      monthlyCredits: Number(plan.monthly_credits || 0),
      maxProjects: Number(plan.max_projects || 0),
      videoAccess: Boolean(plan.video_access),
      brandKitAccess: Boolean(plan.brand_kit_access),
      commercialUsage: Boolean(plan.commercial_usage),
      rolloverEnabled: Boolean(plan.rollover_enabled),
      rolloverCapPct: Number(plan.rollover_cap_pct || 0),
      rolloverMaxCycles: Number(plan.rollover_max_cycles || 0),
      renewalGraceDays: Number(plan.renewal_grace_days || 0),
      monthlyBonusCredits: Number(plan.monthly_bonus_credits || 0),
      bonusValidDays: Number(plan.bonus_valid_days || 0),
      metadata: plan.metadata || {},
    }));
    return NextResponse.json({ plans: plans.length ? plans : FALLBACK_PLANS });
  } catch {
    return NextResponse.json({ plans: FALLBACK_PLANS });
  }
}
