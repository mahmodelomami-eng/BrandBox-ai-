import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token) return null;
  const {data,error}=await createServerSupabaseClient().auth.getUser(token);
  return error?null:data.user;
}
export async function GET(request: NextRequest){
  const user=await authenticate(request); if(!user) return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
  const orderId=request.nextUrl.searchParams.get('order')||'';
  if(!orderId) return NextResponse.json({error:'INVALID_ORDER'},{status:400});
  const db=createPrivilegedSupabaseClient();
  const {data:order,error}=await db.from('store_orders').select('id,order_number,status,payment_status,total_lyd,currency,payment_provider,paid_at,fulfilled_at').eq('id',orderId).eq('user_id',user.id).maybeSingle();
  if(error||!order) return NextResponse.json({error:'STORE_ORDER_NOT_FOUND'},{status:404});
  const completed=order.payment_status==='PAID' && order.status==='FULFILLED';
  const failed=['FAILED','CANCELLED'].includes(order.payment_status)||['FAILED','CANCELLED'].includes(order.status);
  return NextResponse.json({order,state:completed?'completed':failed?'failed':'pending',paymentConfirmed:order.payment_status==='PAID',fulfillmentCompleted:order.status==='FULFILLED',mode:'sandbox'});
}
