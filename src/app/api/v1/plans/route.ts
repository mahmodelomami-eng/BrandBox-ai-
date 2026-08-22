import { NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const FALLBACK_PLANS = [
  { id: 'free', name: 'المجانية', description: 'مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.', priceMonthlyLYD: 0, monthlyCredits: 50, maxProjects: 2, videoAccess: false, brandKitAccess: true, commercialUsage: false },
  { id: 'starter', name: 'الأساسية', description: 'للمستقلين وصناع المحتوى الناشئين.', priceMonthlyLYD: 45, monthlyCredits: 200, maxProjects: 5, videoAccess: false, brandKitAccess: true, commercialUsage: true },
  { id: 'pro', name: 'الاحترافية', description: 'الخيار الأفضل للشركات الناشئة والمصممين المحترفين.', priceMonthlyLYD: 145, monthlyCredits: 1000, maxProjects: 25, videoAccess: true, brandKitAccess: true, commercialUsage: true },
  { id: 'business', name: 'الأعمال', description: 'للوكالات الرقمية والفرق التسويقية التنافسية.', priceMonthlyLYD: 395, monthlyCredits: 5000, maxProjects: 100, videoAccess: true, brandKitAccess: true, commercialUsage: true },
];

export async function GET() {
  try {
    const database = createPrivilegedSupabaseClient();
    const { data, error } = await database
      .from('plans')
      .select('id,name,description,price_monthly_lyd,monthly_credits,max_projects,video_access,brand_kit_access,commercial_usage,is_active')
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
    }));
    return NextResponse.json({ plans: plans.length ? plans : FALLBACK_PLANS });
  } catch {
    return NextResponse.json({ plans: FALLBACK_PLANS });
  }
}
