import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createJovaBookBillingHandlers} from '../lib/jovabook-billing.mjs';
import {MONTHLY_COMMISSION_TERMS_VERSION} from '../lib/jovabook-monthly-commission.mjs';
import {createLocalLedger} from '../scripts/jovabook-stripe-test.mjs';

function fixture({override={},summary={available:true,billing_ready:true,supervisor_ready:false},proof={},recovery=false}={}){
 const salon=randomUUID(),owner=randomUUID(),writes=[],env={JOVABOOK_BILLING_ENABLED:'true',JOVABOOK_BILLING_APPROVED:'true',JOVABOOK_STRIPE_SECRET_KEY:'sk_test_Fictional',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_Fictional',JOVABOOK_STRIPE_MODE:'test',JOVABOOK_STRIPE_PRICE_ESSENTIAL:'price_Essential',JOVABOOK_STRIPE_PRICE_STANDARD:'price_Standard',JOVABOOK_STRIPE_PRICE_PREMIUM:'price_Premium',JOVABOOK_BILLING_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_COMMISSION_WORKER_TOKEN:'b'.repeat(64),JOVABOOK_COMMISSION_HTTP_TOKEN:'c'.repeat(64),JOVABOOK_MONTHLY_COMMISSION_ENABLED:'true',JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'true',JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'true',JOVABOOK_ANNUAL_COMMISSION_INVOICING_ENABLED:'false',JOVABOOK_SUPABASE_URL:'https://fixture.invalid',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fictional',...override};
 const send=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://fixture.invalid');const route=new URL(url).pathname,body=options.body?JSON.parse(options.body):{};
  if(route==='/auth/v1/user')return Response.json({id:owner,email:'owner@example.test'});
  if(route.endsWith('/owner_account_access'))return Response.json({business:{id:salon},access:'active',billing:{connected:true}});
  if(route.endsWith('/booking_commission_worker')){assert(['context','accept_terms'].includes(body.p_action));return Response.json(body.p_action==='context'?{salon_id:salon,disabled:summary.available!==true,invoice_enabled:summary.billing_ready,enabled_at:new Date(Date.now()-1000).toISOString(),...proof}:{ok:true});}
  assert(route.endsWith('/booking_billing_worker'));
  if(body.p_action==='context')return Response.json({salon_id:salon,enabled:true,...(recovery?{customer_id:'cus_Fixture',subscription_id:'sub_Fixture'}:{})});
  if(body.p_action==='action_begin')return Response.json({id:randomUUID(),created_at:new Date().toISOString()});
  assert(['bind_customer','action_finish'].includes(body.p_action));return Response.json({ok:true});
 };
 const stripe={accounts:{retrieveCurrent:async()=>({id:'acct_Fictional',charges_enabled:true})},prices:{retrieve:async id=>({id,active:true,livemode:false,currency:'gbp',unit_amount:{price_Essential:2000,price_Standard:5000,price_Premium:10000}[id],recurring:{interval:'month',interval_count:1}})},customers:{create:async()=>{writes.push('customer');return {id:'cus_Fixture'};}},checkout:{sessions:{create:async()=>{writes.push('checkout');return {id:'cs_Fixture',url:'https://checkout.stripe.com/c/pay/fixture'};}}},subscriptions:{retrieve:async()=>({id:'sub_Fixture',customer:'cus_Fixture',status:'past_due'})},invoices:{list:async()=>({data:[{id:'in_Fixture',customer:'cus_Fixture',subscription:'sub_Fixture',status:'open',amount_remaining:2000,hosted_invoice_url:'https://invoice.stripe.com/i/fixture'}],has_more:false})}};
 const handlers=createJovaBookBillingHandlers({env,send,stripe});
 return {writes,checkout:plan=>handlers.checkout(new Request('https://fixture.invalid/checkout',{method:'POST',headers:{Authorization:'Bearer local-owner'},body:JSON.stringify({salon_id:salon,plan,cadence:'monthly',request_id:randomUUID(),terms_version:MONTHLY_COMMISSION_TERMS_VERSION})}))};
}
test('new 1% monthly plans refuse creation while any required monthly readiness gate is off',async()=>{
 const cases=[{override:{JOVABOOK_MONTHLY_COMMISSION_ENABLED:'false'}},{override:{JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'false'}},{override:{JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'false'}},{override:{JOVABOOK_COMMISSION_HTTP_TOKEN:''}},{override:{JOVABOOK_COMMISSION_HTTP_TOKEN:'b'.repeat(64)}},{summary:{available:false,billing_ready:true}},{summary:{available:true,billing_ready:false}},{proof:{salon_id:randomUUID()}},{proof:{enabled_at:null}},{proof:{enabled_at:new Date(Date.now()+86400000).toISOString()}}];
 for(const plan of ['essential','standard'])for(const options of cases){const f=fixture(options),response=await f.checkout(plan);assert.equal(response.status,503);assert.equal((await response.json()).billing_unavailable,true);assert.deepEqual(f.writes,[]);}
});
test('ready monthly Essential checkout does not require annual operational readiness',async()=>{
 const f=fixture(),response=await f.checkout('essential');assert.equal(response.status,200);assert.equal((await response.json()).kind,'checkout');assert.deepEqual(f.writes,['customer','checkout']);
});
test('existing invoice recovery stays available when commission setup is unavailable',async()=>{
 const f=fixture({recovery:true,override:{JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'false',JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'false'}}),response=await f.checkout('essential');assert.equal(response.status,200);assert.equal((await response.json()).kind,'recovery');assert.deepEqual(f.writes,[]);
});
test('zero-commission Premium monthly checkout does not depend on commission collection',async()=>{
 const f=fixture({override:{JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'false',JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'false'}}),response=await f.checkout('premium');assert.equal(response.status,200);assert.equal((await response.json()).kind,'checkout');assert.deepEqual(f.writes,['customer','checkout']);
});
test('new unpaid SQL account reports configured commission readiness without inventing a financial statement',async()=>{
 const local=await createLocalLedger(randomUUID());let creates=0;
 try{
  Object.assign(local.env,{JOVABOOK_STRIPE_SECRET_KEY:'sk_test_Fictional',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_Fictional',JOVABOOK_STRIPE_PRICE_ESSENTIAL:'price_Essential',JOVABOOK_STRIPE_PRICE_STANDARD:'price_Standard',JOVABOOK_STRIPE_PRICE_PREMIUM:'price_Premium',JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'true',JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'true',JOVABOOK_COMMISSION_HTTP_TOKEN:'f'.repeat(64)});
  await local.q('update jovabook_private.commission_config set invoice_enabled=true');
  const stripe={accounts:{retrieveCurrent:async()=>({id:'acct_Fictional',charges_enabled:true})},customers:{create:async()=>{creates++;}},checkout:{sessions:{create:async()=>{creates++;}}}};
  const handlers=createJovaBookBillingHandlers({env:local.env,send:local.send,stripe,now:local.now}),response=await handlers.status(local.request({salon_id:local.salon}));
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.billing.connected,true);assert.equal(result.billing.monthly_commission_ready,true);assert.equal(result.billing.commission_summary.available,false);assert.equal(result.billing.paid_until,null);assert.equal(result.billing.annual_supported,false);assert.equal(creates,0);
 }finally{await local.close();}
});
