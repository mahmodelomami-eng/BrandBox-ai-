import { createHash } from 'node:crypto';
import { createStagingTestClient } from '../../lib/supabase/test-client';
import { processDigitalCodeFulfillmentForOrder } from '../../lib/store/store-code-fulfillment';

export async function runStoreCodeStockRecoveryStagingTest() {
  const db = createStagingTestClient();
  const userId = process.env.STAGING_TEST_USER_ID!;
  const run = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const ids: Record<string,string> = {};
  try {
    const {data:cat,error:ce}=await db.from('store_categories').insert({slug:`staging-recovery-${run}`,name_ar:'اختبار استعادة Staging',is_active:false}).select('id').single(); if(ce) throw ce; ids.cat=cat.id;
    const {data:prod,error:pe}=await db.from('store_products').insert({category_id:cat.id,slug:`staging-recovery-product-${run}`,name:'Staging Recovery Voucher',fulfillment_mode:'VOUCHER_API',sale_status:'DRAFT',supplier_authorization_verified:false,regional_validity_verified:false,automated_fulfillment_verified:false}).select('id').single(); if(pe) throw pe; ids.prod=prod.id;
    const {data:sku,error:se}=await db.from('store_skus').insert({product_id:prod.id,sku_code:`STAGING-RECOVERY-${run}`,title:'Staging Recovery Code',sell_price_lyd:1,is_active:false,inventory_mode:'CODE_STOCK'}).select('id').single(); if(se) throw se; ids.sku=sku.id;
    const {data:o,error:oe}=await db.from('store_orders').insert({user_id:userId,order_number:`STG-REC-${run}`,status:'FULFILLMENT_PENDING',payment_status:'PAID',currency:'LYD',subtotal_lyd:1,discount_lyd:0,total_lyd:1,payment_provider:'EZONEPAY_SANDBOX_TEST',payment_reference:`staging-recovery-${run}`,idempotency_key:`staging-recovery-order-${run}`,paid_at:new Date().toISOString()}).select('id').single(); if(oe) throw oe; ids.order=o.id;
    const {data:item,error:ie}=await db.from('store_order_items').insert({order_id:o.id,sku_id:sku.id,product_name_snapshot:'Staging Recovery Voucher',sku_title_snapshot:'Staging Recovery Code',quantity:1,unit_price_lyd:1,line_total_lyd:1,fulfillment_mode:'VOUCHER_API'}).select('id').single(); if(ie) throw ie; ids.item=item.id;
    const {data:job,error:je}=await db.from('store_fulfillment_jobs').insert({order_item_id:item.id,status:'PENDING',idempotency_key:`staging-recovery-job-${run}`}).select('id').single(); if(je) throw je; ids.job=job.id;

    let outOfStock=false;
    try { await processDigitalCodeFulfillmentForOrder(o.id); } catch (error) { outOfStock=error instanceof Error && error.message.includes('STORE_OUT_OF_STOCK'); }
    const {data:blockedOrder}=await db.from('store_orders').select('status,payment_status').eq('id',o.id).single();
    const {data:blockedJob}=await db.from('store_fulfillment_jobs').select('status,last_error_code').eq('id',job.id).single();

    const code=`BBX-RECOVERY-${run}`;
    const {data:dc,error:de}=await db.from('store_digital_codes').insert({sku_id:sku.id,code_ciphertext:code,code_fingerprint:createHash('sha256').update(code).digest('hex'),status:'AVAILABLE',supplier_batch:`staging-recovery-${run}`}).select('id').single(); if(de) throw de; ids.code=dc.id;

    await processDigitalCodeFulfillmentForOrder(o.id);
    await processDigitalCodeFulfillmentForOrder(o.id);

    const {data:recoveredOrder}=await db.from('store_orders').select('status,payment_status').eq('id',o.id).single();
    const {data:recoveredJob}=await db.from('store_fulfillment_jobs').select('status').eq('id',job.id).single();
    const {data:entitlements}=await db.from('store_entitlements').select('id').eq('order_item_id',item.id);
    const {data:codeRow}=await db.from('store_digital_codes').select('status,reserved_for_order_item_id').eq('id',dc.id).single();

    const passed=outOfStock
      && blockedOrder?.payment_status==='PAID'
      && blockedOrder?.status==='REVIEW_REQUIRED'
      && blockedJob?.status==='REVIEW_REQUIRED'
      && blockedJob?.last_error_code==='STORE_OUT_OF_STOCK'
      && recoveredOrder?.payment_status==='PAID'
      && recoveredOrder?.status==='FULFILLED'
      && recoveredJob?.status==='SUCCEEDED'
      && entitlements?.length===1
      && codeRow?.status==='DELIVERED'
      && codeRow?.reserved_for_order_item_id===item.id;

    return {allPassed:passed,results:[{testName:'Store CODE_STOCK out-of-stock → review → replenish → retry → fulfilled',passed}]};
  } finally {
    if(ids.item) await db.from('store_entitlements').delete().eq('order_item_id',ids.item);
    if(ids.code) await db.from('store_digital_codes').delete().eq('id',ids.code);
    if(ids.order) await db.from('store_orders').delete().eq('id',ids.order);
    if(ids.sku) await db.from('store_skus').delete().eq('id',ids.sku);
    if(ids.prod) await db.from('store_products').delete().eq('id',ids.prod);
    if(ids.cat) await db.from('store_categories').delete().eq('id',ids.cat);
  }
}
