import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  const supabase = createPrivilegedSupabaseClient();
  const { data: orders, error: ordersError } = await supabase
    .from('store_orders')
    .select(`
      id,
      order_number,
      status,
      payment_status,
      currency,
      total_lyd,
      paid_at,
      fulfilled_at,
      created_at,
      store_order_items (
        id,
        product_name_snapshot,
        sku_title_snapshot,
        quantity,
        line_total_lyd,
        fulfillment_mode
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (ordersError) return NextResponse.json({ error: 'PURCHASES_UNAVAILABLE' }, { status: 500 });

  const { data: entitlements, error: entitlementsError } = await supabase
    .from('store_entitlements')
    .select('id,order_item_id,entitlement_type,status,external_reference,starts_at,expires_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (entitlementsError) return NextResponse.json({ error: 'ENTITLEMENTS_UNAVAILABLE' }, { status: 500 });

  return NextResponse.json({ orders: orders ?? [], entitlements: entitlements ?? [] });
}
