import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function GET(request: NextRequest) {
  if (!await authenticate(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { data, error } = await createPrivilegedSupabaseClient().from('credit_packages')
    .select('id,name,purchased_credits,bonus_credits,credits,price_lyd,bonus_valid_days,is_featured,is_active,sort_order')
    .order('sort_order');
  if (error) return NextResponse.json({ error: 'PACKAGES_UNAVAILABLE' }, { status: 500 });
  return NextResponse.json({ packages: data });
}
