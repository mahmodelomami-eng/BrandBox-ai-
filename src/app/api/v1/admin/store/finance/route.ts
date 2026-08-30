import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';

async function authorize(request: NextRequest) {
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,''); if(!token) return null;
  const {data,error}=await createServerSupabaseClient().auth.getUser(token); if(error||!data.user) return null;
  const db=createPrivilegedSupabaseClient(); const {data:profile}=await db.from('profiles').select('role,status').eq('id',data.user.id).maybeSingle();
  if(!profile||profile.status==='suspended') return null; const role=(profile.role||'USER') as AdminRole;
  if(!isKnownRole(role)||!checkPermission(role,'payments.read')) return null; return {userId:data.user.id,role};
}
export async function GET(request: NextRequest){
  const actor=await authorize(request); if(!actor) return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
  const db=createPrivilegedSupabaseClient();
  const [ordersR,refundsR]=await Promise.all([
    db.from('store_orders').select('id,order_number,status,payment_status,total_lyd,paid_at,created_at,store_order_items(quantity,line_total_lyd,sku_id,product_name_snapshot,sku_title_snapshot,store_skus(provider_cost,provider_cost_currency))').order('created_at',{ascending:false}).limit(500),
    db.from('store_refunds').select('id,order_id,amount_lyd,status,created_at').in('status',['APPROVED','PROCESSING','COMPLETED']).limit(500),
  ]);
  if(ordersR.error||refundsR.error) return NextResponse.json({error:'STORE_FINANCE_UNAVAILABLE'},{status:503});
  const paid=(ordersR.data||[]).filter(o=>o.payment_status==='PAID'||['FULFILLED','PARTIALLY_REFUNDED','REFUNDED'].includes(o.status));
  const revenue=paid.reduce((s,o)=>s+Number(o.total_lyd||0),0);
  const refunds=(refundsR.data||[]).reduce((s,r)=>s+Number(r.amount_lyd||0),0);
  let providerCost=0; const bySku=new Map<string,{skuId:string,product:string,sku:string,revenue:number,cost:number,orders:number}>();
  for(const o of paid) for(const item of (o.store_order_items||[]) as any[]){
    const sku=Array.isArray(item.store_skus)?item.store_skus[0]:item.store_skus;
    const qty=Number(item.quantity||1), cost=sku?.provider_cost==null?0:Number(sku.provider_cost)*qty, line=Number(item.line_total_lyd||0); providerCost+=cost;
    const cur=bySku.get(item.sku_id)||{skuId:item.sku_id,product:item.product_name_snapshot,sku:item.sku_title_snapshot,revenue:0,cost:0,orders:0};
    cur.revenue+=line; cur.cost+=cost; cur.orders+=1; bySku.set(item.sku_id,cur);
  }
  const netRevenue=Math.max(revenue-refunds,0), grossProfit=netRevenue-providerCost;
  const skuProfitability=[...bySku.values()].map(x=>({...x,grossProfit:x.revenue-x.cost,marginPercent:x.revenue>0?((x.revenue-x.cost)/x.revenue)*100:null})).sort((a,b)=>b.grossProfit-a.grossProfit);
  return NextResponse.json({metrics:{paidOrders:paid.length,grossRevenueLYD:revenue,refundsLYD:refunds,netRevenueLYD:netRevenue,providerCostLYD:providerCost,grossProfitLYD:grossProfit,grossMarginPercent:netRevenue>0?(grossProfit/netRevenue)*100:null},skuProfitability,recentPaidOrders:paid.slice(0,20)});
}