import { createHash } from 'node:crypto';
import { createStagingTestClient } from '../../lib/supabase/test-client';

export async function runStoreCodeStockE2EStagingTest() {
  const db = createStagingTestClient();
  const userId = process.env.STAGING_TEST_USER_ID!;
  const run = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const ids: Record<string,string> = {};
  try {
    const {data:cat,error:ce}=await db.from('store_categories').insert({slug:`staging-e2e-${run}`,name_ar:'اختبار Staging E2E',is_active:false}).select('id').single(); if(ce) throw ce; ids.cat=cat.id;
    const {data:prod,error:pe}=await db.from('store_products').insert({category_id:cat.id,slug:`staging-e2e-product-${run}`,name:'Staging E2E Voucher',fulfillment_mode:'VOUCHER_API',sale_status:'DRAFT',supplier_authorization_verified:false,regional_validity_verified:false,automated_fulfillment_verified:false}).select('id').single(); if(pe) throw pe; ids.prod=prod.id;
    const {data:sku,error:se}=await db.from('store_skus').insert({product_id:prod.id,sku_code:`STAGING-E2E-${run}`,title:'Staging E2E Code',sell_price_lyd:1,is_active:false,inventory_mode:'CODE_STOCK'}).select('id').single(); if(se) throw se; ids.sku=sku.id;
    const code=`BBX-STAGING-${run}`;
    const {data:dc,error:de}=await db.from('store_digital_codes').insert({sku_id:sku.id,code_ciphertext:code,code_fingerprint:createHash('sha256').update(code).digest('hex'),status:'AVAILABLE',supplier_batch:`staging-e2e-${run}`}).select('id').single(); if(de) throw de; ids.code=dc.id;
    const {data:o,error:oe}=await db.from('store_orders').insert({user_id:userId,order_number:`STG-E2E-${run}`,status:'PAID',payment_status:'PAID',currency:'LYD',subtotal_lyd:1,discount_lyd:0,total_lyd:1,payment_provider:'EZONEPAY_SANDBOX_TEST',payment_reference:`staging-e2e-${run}`,idempotency_key:`staging-e2e-order-${run}`,paid_at:new Date().toISOString()}).select('id').single(); if(oe) throw oe; ids.order=o.id;
    const {data:item,error:ie}=await db.from('store_order_items').insert({order_id:o.id,sku_id:sku.id,product_name_snapshot:'Staging E2E Voucher',sku_title_snapshot:'Staging E2E Code',quantity:1,unit_price_lyd:1,line_total_lyd:1,fulfillment_mode:'VOUCHER_API'}).select('id').single(); if(ie) throw ie; ids.item=item.id;
    const {data:job,error:je}=await db.from('store_fulfillment_jobs').insert({order_item_id:item.id,status:'PENDING',idempotency_key:`staging-e2e-job-${run}`}).select('id').single(); if(je) throw je; ids.job=job.id;

    const {data:reserved,error:re}=await db.rpc('reserve_store_digital_codes',{p_order_item_id:item.id,p_sku_id:sku.id,p_quantity:1}); if(re||reserved?.length!==1) throw re||new Error('reserve failed');
    const {data:delivered,error:dle}=await db.rpc('deliver_store_digital_codes',{p_order_item_id:item.id}); if(dle||delivered?.length!==1) throw dle||new Error('delivery failed');
    await db.from('store_entitlements').upsert({user_id:userId,order_item_id:item.id,entitlement_type:'VOUCHER',status:'ACTIVE',delivery_payload:{code_ids:[delivered[0].code_id]},starts_at:new Date().toISOString()},{onConflict:'order_item_id'});
    await db.from('store_fulfillment_jobs').update({status:'SUCCEEDED',completed_at:new Date().toISOString()}).eq('id',job.id);

    const {data:replay,error:rpe}=await db.rpc('deliver_store_digital_codes',{p_order_item_id:item.id});
    const {data:ent}=await db.from('store_entitlements').select('id').eq('order_item_id',item.id);
    const {data:codeRow}=await db.from('store_digital_codes').select('status,reserved_for_order_item_id').eq('id',dc.id).single();
    const passed=!rpe && replay?.length===1 && ent?.length===1 && codeRow?.status==='DELIVERED' && codeRow?.reserved_for_order_item_id===item.id;
    return {allPassed:passed,results:[{testName:'Store CODE_STOCK paid order → reserve → deliver → entitlement → replay guard',passed}]};
  } finally {
    if(ids.order) await db.from('store_orders').delete().eq('id',ids.order);
    if(ids.code) await db.from('store_digital_codes').delete().eq('id',ids.code);
    if(ids.sku) await db.from('store_skus').delete().eq('id',ids.sku);
    if(ids.prod) await db.from('store_products').delete().eq('id',ids.prod);
    if(ids.cat) await db.from('store_categories').delete().eq('id',ids.cat);
  }
}
