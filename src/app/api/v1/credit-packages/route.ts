import { NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await createPrivilegedSupabaseClient()
    .from('credit_packages')
    .select('id,name,purchased_credits,bonus_credits,credits,price_lyd,bonus_valid_days,is_featured,is_active,sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) return NextResponse.json({ error: 'PACKAGES_UNAVAILABLE' }, { status: 500 });
  return NextResponse.json({ packages: data || [] });
}
