import { createPrivilegedSupabaseClient } from '../supabase/server';

export async function processDigitalCodeFulfillmentForOrder(orderId:string){
 const db=createPrivilegedSupabaseClient();
 const {data:order}=await db.from('store_orders').select('id,user_id,payment_status').eq('id',orderId).maybeSingle();
 if(!order) throw new Error('STORE_ORDER_NOT_FOUND');
 if(order.payment_status!=='PAID') throw new Error('STORE_ORDER_NOT_PAID');
 const {data:items,error}=await db.from('store_order_items').select('id,sku_id,quantity,fulfillment_mode,store_skus!inner(inventory_mode)').eq('order_id',orderId);
 if(error) throw new Error(`STORE_ORDER_ITEMS_ERROR: ${error.message}`);
 let processed=0;
 for(const item of items||[]){
  const sku=Array.isArray((item as any).store_skus)?(item as any).store_skus[0]:(item as any).store_skus;
  if(sku?.inventory_mode!=='CODE_STOCK') continue;
  const {data:job}=await db.from('store_fulfillment_jobs').select('id,status').eq('order_item_id',item.id).maybeSingle();
  if(!job) throw new Error('STORE_FULFILLMENT_JOB_NOT_FOUND');
  if(job.status==='SUCCEEDED'){processed++;continue;}
  await db.from('store_fulfillment_jobs').update({status:'PROCESSING',locked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id).in('status',['PENDING','FAILED']);
  const {data:reserved,error:reserveError}=await db.rpc('reserve_store_digital_codes',{p_order_item_id:item.id,p_sku_id:item.sku_id,p_quantity:item.quantity});
  if(reserveError||!reserved||reserved.length<item.quantity){await db.from('store_fulfillment_jobs').update({status:'FAILED',last_error_code:'STORE_OUT_OF_STOCK',last_error_message:'Insufficient digital code inventory.',updated_at:new Date().toISOString()}).eq('id',job.id);throw new Error('STORE_OUT_OF_STOCK');}
  const {data:delivered,error:deliveryError}=await db.rpc('deliver_store_digital_codes',{p_order_item_id:item.id});
  if(deliveryError||!delivered||delivered.length<item.quantity) throw new Error('STORE_CODE_DELIVERY_FAILED');
  await db.from('store_entitlements').upsert({user_id:order.user_id,order_item_id:item.id,entitlement_type:'VOUCHER',status:'ACTIVE',delivery_payload:{codes:delivered.map((x:any)=>x.code_ciphertext)},starts_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'order_item_id'});
  await db.from('store_fulfillment_jobs').update({status:'SUCCEEDED',external_reference:`codes:${item.id}`,completed_at:new Date().toISOString(),last_error_code:null,last_error_message:null,updated_at:new Date().toISOString()}).eq('id',job.id);
  processed++;
 }
 return {processed};
}
