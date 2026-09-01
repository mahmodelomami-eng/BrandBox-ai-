import { decryptStoreCode } from '@/lib/store/store-code-crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

export async function GET(request:NextRequest){
 const auth=await authenticateActiveUser(request); if(!auth) return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 const { user } = auth;
 const entitlementId=request.nextUrl.searchParams.get('entitlement')||'';
 if(!/^[0-9a-fA-F-]{36}$/.test(entitlementId)) return NextResponse.json({error:'INVALID_ENTITLEMENT'},{status:400});
 const db=createPrivilegedSupabaseClient();
 const {data,error}=await db.from('store_entitlements').select('id,entitlement_type,status,delivery_payload,starts_at,expires_at,order_item_id').eq('id',entitlementId).eq('user_id',user.id).maybeSingle();
 if(error||!data) return NextResponse.json({error:'ENTITLEMENT_NOT_FOUND'},{status:404});
 if(data.status!=='ACTIVE') return NextResponse.json({error:'ENTITLEMENT_NOT_ACTIVE'},{status:409});
 const payload=(data.delivery_payload||{}) as Record<string,unknown>;
 const safePayload: Record<string, unknown> = {};
 if(data.entitlement_type==='VOUCHER') {
   if (Array.isArray(payload.code_ids) && payload.code_ids.length) {
     const { data: codes, error: codeError } = await db
       .from('store_digital_codes')
       .select('id,code_ciphertext,status')
       .in('id', payload.code_ids as string[])
       .eq('reserved_for_order_item_id', data.order_item_id)
       .eq('status', 'DELIVERED');
     if (codeError) return NextResponse.json({error:'DELIVERY_UNAVAILABLE'},{status:503});
     safePayload.codes=(codes||[]).map((code) => decryptStoreCode(code.code_ciphertext));
   } else if (Array.isArray(payload.codes)) {
     safePayload.codes=payload.codes.map((code) => decryptStoreCode(String(code)));
   }
 }
 if(data.entitlement_type==='CREDITS'){safePayload.credits_granted=payload.credits_granted;safePayload.new_balance=payload.new_balance;}
 return NextResponse.json({entitlement:{id:data.id,type:data.entitlement_type,status:data.status,startsAt:data.starts_at,expiresAt:data.expires_at,delivery:safePayload}},{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
}
