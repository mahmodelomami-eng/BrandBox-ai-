import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

export async function GET(request: NextRequest){
  const auth=await authenticateActiveUser(request); if(!auth) return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
  const { user } = auth;
  const orderId=request.nextUrl.searchParams.get('order')||'';
  if(!orderId) return NextResponse.json({error:'INVALID_ORDER'},{status:400});
  const db=createPrivilegedSupabaseClient();
  const {data:order,error}=await db.from('store_orders').select('id,order_number,status,payment_status,total_lyd,currency,payment_provider,paid_at,fulfilled_at').eq('id',orderId).eq('user_id',user.id).maybeSingle();
  if(error||!order) return NextResponse.json({error:'STORE_ORDER_NOT_FOUND'},{status:404});
  const completed=order.payment_status==='PAID' && order.status==='FULFILLED';
  const failed=['FAILED','CANCELLED'].includes(order.payment_status)||['FAILED','CANCELLED'].includes(order.status);
  return NextResponse.json({order,state:completed?'completed':failed?'failed':'pending',paymentConfirmed:order.payment_status==='PAID',fulfillmentCompleted:order.status==='FULFILLED',mode:'sandbox'});
}
