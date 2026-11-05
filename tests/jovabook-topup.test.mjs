import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfferBillingHandlers} from '../lib/jovabook-offer-billing.mjs';
import {OFFER_VERSION} from '../lib/jovabook-offer.mjs';
const sid='20000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000001',req='50000000-0000-4000-8000-000000000001';
const env={JOVABOOK_OFFER_VERSION:OFFER_VERSION,JOVABOOK_BILLING_ENABLED:'true',JOVABOOK_BILLING_APPROVED:'true',JOVABOOK_STRIPE_SECRET_KEY:'sk_test_fixture',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_Fixture',JOVABOOK_STRIPE_MODE:'test',JOVABOOK_BILLING_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_STRIPE_WEBHOOK_SECRET:'whsec_fixture',JOVABOOK_STRIPE_PRICE_PRO_SOLO:'price_Pro',JOVABOOK_STRIPE_PRICE_PRO_SOLO_ANNUAL:'price_ProAnnual',JOVABOOK_STRIPE_PRICE_TEAM:'price_Team',JOVABOOK_STRIPE_PRICE_TEAM_ANNUAL:'price_TeamAnnual'};
function harness({plan='standard',session}={}){
 const calls={sessions:[],credits:[],api:[]},fail=(s,m)=>Object.assign(Error(m),{status:s});
 const stripe=()=>({accounts:{retrieveCurrent:async()=>({id:'acct_Fixture',charges_enabled:true})},customers:{create:async()=>({id:'cus_Fixture'})},
  checkout:{sessions:{create:async p=>{calls.sessions.push(p);return {id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture'};},retrieve:async()=>session}},
  webhooks:{constructEvent:(raw)=>JSON.parse(raw)}});
 const api=async(path,body)=>{calls.api.push(path);
  if(path.endsWith('booking_offer_worker')){if(body.p_action==='context')return {salon_id:sid,enabled:true,customer_id:'cus_Fixture'};return {ok:true};}
  if(path.endsWith('owner_account_access'))return {ok:true,access:'active',billing:{plan}};
  if(path.endsWith('booking_topup_worker')){calls.credits.push(body.p_payload);return {ok:true};}
  throw Error('unexpected '+path);};
 const owner=async()=>({salon:sid,user:{id:uid,email:'owner@example.test'},token:'t',access:{access:'active'}});
 const input=async r=>JSON.parse(await r.text());
 const error=e=>Response.json({ok:false,message:e.message},{status:e.status||500});
 const handlers=createOfferBillingHandlers({env,api,stripe,owner,input,error,rawBody:async r=>r.text(),funnel:{},observeFunnel:()=>{}});
 return {handlers,calls,fail};
}
const post=body=>new Request('https://x.test/',{method:'POST',body:JSON.stringify(body),headers:{'stripe-signature':'sig'}});
const paid=(pack,extra={})=>({id:'cs_test_fixture',mode:'payment',payment_status:'paid',currency:'gbp',livemode:false,customer:'cus_Fixture',payment_intent:'pi_test_abcdefghij',client_reference_id:sid,
 amount_total:{'sms-50':500,'sms-100':1000,'email-1000':500}[pack],metadata:{app:'jovabook',kind:'topup',salon_id:sid,offer_version:OFFER_VERSION,pack,channel:pack.startsWith('sms')?'sms':'email',quantity:pack.split('-')[1]},...extra});
const event=session=>({type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_fixture',metadata:session.metadata}}});

test('checkout uses server prices only and refuses text packs on Free',async()=>{
 const h=harness();
 const ok=await h.handlers.topup(post({salon_id:sid,pack:'sms-50',request_id:req,amount:1}));
 assert.equal(ok.status,200);assert.equal((await ok.json()).url,'https://checkout.stripe.com/c/pay/cs_test_fixture');
 const s=h.calls.sessions[0];assert.equal(s.mode,'payment');assert.equal(s.line_items[0].price_data.unit_amount,500);assert.equal(s.line_items[0].price_data.currency,'gbp');assert.equal(s.metadata.kind,'topup');
 assert.equal((await h.handlers.topup(post({salon_id:sid,pack:'sms-9999',request_id:req}))).status,400);
 const starter=harness({plan:'essential'});
 assert.equal((await starter.handlers.topup(post({salon_id:sid,pack:'sms-50',request_id:req}))).status,403);
 assert.equal((await starter.handlers.topup(post({salon_id:sid,pack:'email-1000',request_id:req}))).status,200);
});
test('credit is added only after Stripe confirms the exact paid session',async()=>{
 for(const [pack,quantity,pence] of [['sms-50',50,500],['sms-100',100,1000],['email-1000',1000,500]]){
  const session=paid(pack),h=harness({session});
  const r=await h.handlers.webhook(post(event(session)));assert.equal(r.status,200);assert.equal((await r.json()).topup,true);
  assert.deepEqual(h.calls.credits,[{salon:sid,channel:pack.split('-')[0],quantity,pence,ref:'pi_test_abcdefghij'}]);
 }
 for(const bad of [{payment_status:'unpaid'},{amount_total:100},{currency:'usd'},{livemode:true},{client_reference_id:'x'},{metadata:{...paid('sms-50').metadata,quantity:'5000'}}]){
  const session=paid('sms-50',bad),h=harness({session});
  const r=await h.handlers.webhook(post(event(session)));assert.equal(r.status,503);assert.equal(h.calls.credits.length,0);
 }
});
