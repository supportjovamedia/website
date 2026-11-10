import test from 'node:test';
import assert from 'node:assert/strict';
import {createJovaBookBillingHandlers} from '../lib/jovabook-billing.mjs';
import {OFFER_VERSION,offerSelection} from '../lib/jovabook-offer.mjs';
const sid='20000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000001',actionId='30000000-0000-4000-8000-000000000001';
function fixture(){
 const env={JOVABOOK_OFFER_VERSION:OFFER_VERSION,JOVABOOK_BILLING_ENABLED:'true',JOVABOOK_BILLING_APPROVED:'true',JOVABOOK_STRIPE_SECRET_KEY:'sk_test_fixture',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_Fixture',JOVABOOK_STRIPE_MODE:'test',JOVABOOK_BILLING_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_SUPABASE_URL:'https://fixture.supabase.co',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture',JOVABOOK_STRIPE_PRICE_PRO_SOLO:'price_Pro',JOVABOOK_STRIPE_PRICE_PRO_SOLO_ANNUAL:'price_ProAnnual',JOVABOOK_STRIPE_PRICE_TEAM:'price_Team',JOVABOOK_STRIPE_PRICE_TEAM_ANNUAL:'price_TeamAnnual'};
 const calls=[],effects=[],clock=Date.parse('2026-11-05T12:00:00Z'),start=clock/1000,end=start+14*86400;
 const access={ok:true,access:'active',business:{id:sid,plan:'essential'},billing:{connected:true,offer_version:OFFER_VERSION,trial_eligible:false,seats:1}};
 const data={plan:'essential',seats:1,cadence:'monthly',salon_id:sid,enabled:true,customer_id:null,subscription_id:null,open_action:null,trial_eligible:false},state={sub:null,method:{id:'pm_Fixture',customer:'cus_Fixture',type:'card',card:{},livemode:false}};
 const metadata={app:'jovabook',salon_id:sid,offer_version:OFFER_VERSION,action_id:actionId};
 const price=id=>({id,active:true,livemode:false,currency:'gbp',recurring:{interval:id.endsWith('Annual')?'year':'month',interval_count:1,usage_type:'licensed'},...(id.startsWith('price_Pro')?{billing_scheme:'per_unit',unit_amount:id.endsWith('Annual')?19200:2000}:{billing_scheme:'tiered',tiers_mode:'graduated',tiers:[{up_to:1,flat_amount:id.endsWith('Annual')?24000:2500,unit_amount:0},{up_to:null,flat_amount:0,unit_amount:id.endsWith('Annual')?5760:600}]})});
 const stripe={accounts:{retrieveCurrent:async()=>({id:'acct_Fixture',charges_enabled:true})},prices:{retrieve:async id=>price(id)},customers:{create:async()=>{effects.push('customer');return {id:'cus_Fixture'};}},checkout:{sessions:{create:async(params,options)=>{effects.push('checkout');calls.push({kind:'stripe-checkout',params,options});return {id:'cs_Fixture',url:'https://checkout.stripe.com/c/pay/fixture'};},retrieve:async()=>({id:'cs_Fixture',customer:data.customer_id,metadata,status:'open'})}},subscriptions:{list:async()=>({data:state.sub?[state.sub]:[],has_more:false}),retrieve:async()=>state.sub},paymentMethods:{retrieve:async()=>state.method},invoices:{list:async()=>({data:[],has_more:false})}};
 const send=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:uid,email:'owner@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'});
  if(url.endsWith('/rpc/owner_account_access'))return Response.json(access);
  if(!url.endsWith('/rpc/booking_offer_worker'))throw Error('Unexpected network destination');
  const {p_action:a,p_payload:p}=JSON.parse(options.body);calls.push({kind:a,payload:p});
  if(a==='context')return Response.json(data);
  if(a==='bind_customer'){data.customer_id=p.customer_id;return Response.json({ok:true});}
  if(a==='begin'){if(data.open_action?.request_id===p.request_id)return Response.json(data.open_action);data.open_action={id:actionId,created_at:new Date(clock).toISOString(),...p,trial:false};return Response.json(data.open_action);}
  if(a==='close_action'){data.open_action=null;return Response.json({ok:true});}
  if(a==='schedule'){Object.assign(data,{schedule_id:p.schedule_id,pending_plan:p.plan,pending_seats:p.seats,pending_cadence:p.cadence,pending_at:p.at});return Response.json({ok:true});}
  if(a==='clear_schedule'){data.schedule_id=null;return Response.json({ok:true});}
  if(a==='finish'){data.open_action.result=p.result;data.open_action.provider_id=p.provider_id;return Response.json(p.result);}
  if(a==='sync_begin'){state.fence=crypto.randomUUID();return Response.json({fence:state.fence});}
  if(a==='sync_apply'){
   if(state.staleSyncs>0){state.staleSyncs--;return Response.json({stale:true});}
   return Response.json(p.fence===state.fence?{ok:true}:{stale:true});
  }
  throw Error('Unexpected worker operation '+a);
 };
 const handler=createJovaBookBillingHandlers({env,send,stripe,now:()=>clock});
 const request=body=>new Request('https://www.jovamedia.com/api/jovabook/billing/checkout',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)});
 const trial=(quantity=1)=>({id:'sub_Fixture',customer:'cus_Fixture',metadata,livemode:false,status:'trialing',collection_method:'charge_automatically',default_payment_method:'pm_Fixture',trial_start:start,trial_end:end,items:{data:[{id:'si_Fixture',price:'price_Team',quantity,current_period_start:start,current_period_end:end}]}});
 return {handler,request,state,data,calls,effects,trial,env,stripe,access};
}

test('sign-in status retries a competing billing refresh with fresh context and a new fence',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.state.staleSyncs=1;
 const response=await f.handler.status(f.request({}));
 assert.equal(response.status,200);assert.equal((await response.json()).business.id,sid);
 assert.equal(f.calls.filter(c=>c.kind==='context').length,2);
 const syncs=f.calls.filter(c=>c.kind==='sync_apply');assert.equal(syncs.length,2);
 assert.notEqual(syncs[0].payload.fence,syncs[1].payload.fence);
 assert(syncs.every(c=>c.payload.paid_verified===false));assert.deepEqual(f.effects,[]);
});
test('sign-in status never grants access when competing refreshes exhaust the bounded retry',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.state.staleSyncs=10;
 const response=await f.handler.status(f.request({}));assert.equal(response.status,409);
 const body=await response.json();assert.equal(body.ok,false);assert.equal(body.business,undefined);
 assert.equal(f.calls.filter(c=>c.kind==='sync_apply').length,3);assert.deepEqual(f.effects,[]);
});
test('sign-in status does not retry unrelated provider errors',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';let reads=0;
 f.stripe.subscriptions.list=async()=>{reads++;throw Error('Provider unavailable.');};
 const response=await f.handler.status(f.request({}));assert.equal(response.status,503);
 assert.equal(reads,1);assert.equal(f.calls.filter(c=>c.kind==='context').length,1);
});

test('Free never creates a Stripe customer, payment session or card collection',async()=>{
 const f=fixture();const response=await f.handler.checkout(f.request({plan:'essential',request_id:crypto.randomUUID()}));assert.equal(response.status,400);assert.deepEqual(f.effects,[]);
 for(const bad of [{plan:'standard',seats:2},{plan:'premium',seats:1001},{plan:'standard',card_number:'4242'},{plan:'standard',trial_days:3}]){const value=await f.handler.checkout(f.request({...bad,request_id:crypto.randomUUID()}));assert.equal(value.status,400);}
 assert.deepEqual(f.effects,[]);
});
test('Solo charges the reviewed recurring price upfront without a new trial',async()=>{
 const f=fixture(),response=await f.handler.checkout(f.request({plan:'standard',cadence:'monthly',request_id:crypto.randomUUID()}));assert.equal(response.status,200);
 const created=f.calls.find(c=>c.kind==='stripe-checkout');assert.deepEqual(created.params.line_items,[{price:'price_Pro',quantity:1}]);assert.equal(created.params.subscription_data.trial_period_days,undefined);assert.equal(created.params.payment_method_collection,'always');assert.deepEqual(created.params.allowed_payment_method_types,['card']);assert.match(created.params.custom_text.submit.message,/£20.00 due today, per month/);assert.match(created.params.custom_text.submit.message,/0% booking commission/);assert(!f.calls.some(c=>c.kind==='sync_apply'));
});
test('Team charges and allowances scale from one included seat, including the annual discount',async()=>{
 const f=fixture();f.data.trial_eligible=false;const response=await f.handler.checkout(f.request({plan:'premium',cadence:'annual',seats:3,request_id:crypto.randomUUID()}));assert.equal(response.status,200);
 const created=f.calls.find(c=>c.kind==='stripe-checkout');assert.deepEqual(created.params.line_items,[{price:'price_TeamAnnual',quantity:3}]);assert.match(created.params.custom_text.submit.message,/£355.20 due today, per year/);
 const selection=offerSelection('premium','annual',2);assert.equal(selection.total,35520);assert.equal(selection.emails,300);assert.equal(selection.sms,180);
});
test('paid trial access requires the exact period, saved card, customer, price and merchant',async()=>{
 for(const change of [s=>{s.trial_end=s.trial_start+3*86400;},s=>{s.default_payment_method=null;},()=>{}]){
  const f=fixture();await f.handler.checkout(f.request({plan:'premium',seats:1,request_id:crypto.randomUUID()}));f.state.sub=f.trial(1);change(f.state.sub);
  await f.handler.reconcile(f.data);const proof=f.calls.findLast(c=>c.kind==='sync_apply').payload;
  assert.equal(proof.trial_verified,!!f.state.sub.default_payment_method&&f.state.sub.trial_end-f.state.sub.trial_start===14*86400);
 }
 const f=fixture();await f.handler.checkout(f.request({plan:'premium',seats:1,request_id:crypto.randomUUID()}));f.state.sub=f.trial(1);f.state.method.customer='cus_Other';await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.trial_verified,false);
 f.state.sub.items.data[0].price='price_Unknown';await assert.rejects(f.handler.reconcile(f.data),/Unapproved/);
});
test('unknown and mismatched tiered prices fail before a payment session is created',async()=>{
 const f=fixture();f.stripe.prices.retrieve=async id=>({id,active:true,livemode:false,currency:'gbp',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},billing_scheme:'tiered',tiers_mode:'volume',tiers:[]});const response=await f.handler.checkout(f.request({plan:'premium',seats:1,request_id:crypto.randomUUID()}));assert.equal(response.status,503);assert(!f.effects.includes('checkout'));
});

test('paid access needs a paid matching invoice and is removed for recurring debt or a foreign invoice',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.state.sub=f.trial(3);f.state.sub.status='active';f.state.sub.items.data[0].current_period_end+=30*86400;
 const end=f.state.sub.items.data[0].current_period_end,invoice={id:'in_Fixture',status:'paid',currency:'gbp',customer:f.data.customer_id,subscription:f.state.sub.id,amount_paid:3700};
 f.stripe.invoices.list=async()=>({data:[invoice],has_more:false});f.stripe.invoices.listLineItems=async()=>({data:[{price:'price_Team',quantity:3,amount:3700,period:{end}}],has_more:false});
 await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,true);
 invoice.customer='cus_Other';await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,false);
 invoice.customer=f.data.customer_id;f.stripe.invoices.list=async()=>({data:[invoice,{status:'open',attempted:true,amount_remaining:3700,billing_reason:'subscription_cycle'}],has_more:false});
 await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,false);
});
test('annual to monthly changes wait for renewal and cancelled hosted reviews do not block dashboard cancellation',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.data.subscription_id='sub_Fixture';f.state.sub=f.trial();f.state.sub.status='active';f.state.sub.items.data[0].price='price_ProAnnual';f.state.sub.items.data[0].current_period_end+=30*86400;
 f.stripe.subscriptionSchedules={create:async()=>({id:'sub_sched_Fixture',customer:f.data.customer_id,subscription:f.state.sub.id}),update:async(id,p)=>{f.calls.push({kind:'phases',payload:p});return {id};}};
 let r=await f.handler.change(f.request({plan:'standard',cadence:'monthly',request_id:crypto.randomUUID()}));assert.equal(r.status,200);assert.equal((await r.json()).kind,'scheduled');assert.equal(f.calls.find(c=>c.kind==='phases').payload.phases[1].items[0].price,'price_Pro');
 f.data.schedule_id=null;f.data.open_action={id:actionId,kind:'change',result:{kind:'upgrade'}};
 f.stripe.subscriptions.update=async(id,params)=>{Object.assign(f.state.sub,params);f.calls.push({kind:'cancel-subscription',payload:params});return f.state.sub;};
 r=await f.handler.cancel(f.request({request_id:crypto.randomUUID()}));assert.equal(r.status,200);const cancelled=await r.json();assert.equal(cancelled.kind,'cancellation_scheduled');assert.equal(Date.parse(cancelled.effective_at),f.state.sub.items.data[0].current_period_end*1000);assert(f.calls.some(c=>c.kind==='close_action'));assert.deepEqual(f.calls.find(c=>c.kind==='cancel-subscription').payload,{cancel_at_period_end:true});
});
test('a verified released schedule clears its temporary staff cap',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.state.sub=f.trial(2);f.data.schedule_id='sub_sched_Fixture';f.stripe.subscriptionSchedules={retrieve:async()=>({id:f.data.schedule_id,status:'released',customer:f.data.customer_id,released_subscription:f.state.sub.id})};
 await f.handler.reconcile(f.data);assert(f.calls.some(c=>c.kind==='clear_schedule'));
});

test('an abandoned Checkout resumes after reload and a different plan safely expires the earlier session',async()=>{
 const f=fixture(),first=crypto.randomUUID();await f.handler.checkout(f.request({plan:'standard',request_id:first}));
 let r=await f.handler.checkout(f.request({plan:'standard',request_id:crypto.randomUUID()}));assert.equal(r.status,200);assert.equal(f.effects.filter(x=>x==='checkout').length,1);assert.equal(f.calls.findLast(c=>c.kind==='begin').payload.request_id,first);
 f.stripe.checkout.sessions.expire=async id=>({id,status:'expired'});r=await f.handler.checkout(f.request({plan:'premium',seats:1,request_id:crypto.randomUUID()}));assert.equal(r.status,200);assert(f.calls.some(c=>c.kind==='close_action'));assert.equal(f.effects.filter(x=>x==='checkout').length,2);
});

test('changing a plan during its trial cannot end the trial early through portal defaults',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.state.sub=f.trial();f.state.sub.items.data[0].price='price_Pro';
 const config={id:'bpc_Fixture',active:true,features:{subscription_update:{enabled:true,proration_behavior:'always_invoice'}}};let sessions=0;
 f.stripe.billingPortal={configurations:{retrieve:async()=>config},sessions:{create:async()=>{sessions++;return {id:'bps_Fixture',url:'https://billing.stripe.com/p/session/fixture'};}}};
 let r=await f.handler.change(f.request({plan:'premium',request_id:crypto.randomUUID()}));assert.equal(r.status,503);assert.equal(sessions,0);
 config.features.subscription_update.trial_update_behavior='continue_trial';r=await f.handler.change(f.request({plan:'premium',request_id:crypto.randomUUID()}));assert.equal(r.status,200);assert.equal(sessions,1);
});

 test('new paid Team checkout allows extra seats while historical trials remain restricted',async()=>{const f=fixture();let r=await f.handler.checkout(f.request({plan:'premium',seats:2,request_id:crypto.randomUUID()}));assert.equal(r.status,200);assert.equal(f.calls.find(c=>c.kind==='stripe-checkout').params.line_items[0].quantity,2);const begun=f.calls.filter(c=>c.kind==='begin').length;f.data.customer_id='cus_Fixture';f.state.sub=f.trial();r=await f.handler.change(f.request({plan:'premium',seats:2,request_id:crypto.randomUUID()}));assert.equal(r.status,400);assert.equal(f.calls.filter(c=>c.kind==='begin').length,begun);});
test('one approved monthly reward invoice preserves Solo access at zero without accepting arbitrary free or annual invoices',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.data.referral_reward_invoices=['in_Reward'];f.data.referral={invoice_id:null,status:'joined'};f.state.sub=f.trial(1);f.state.sub.status='active';f.state.sub.items.data[0].price='price_Pro';
 const item=f.state.sub.items.data[0];item.current_period_end=item.current_period_start+30*86400;
 const invoice={id:'in_Reward',status:'paid',currency:'gbp',customer:f.data.customer_id,subscription:f.state.sub.id,billing_reason:'subscription_cycle',amount_paid:0,amount_due:0,amount_remaining:0,total:0,total_discount_amounts:[{amount:2000}]};
 const line={price:'price_Pro',quantity:1,amount:2000,period:{start:item.current_period_start,end:item.current_period_end}};
 f.stripe.invoices.list=async()=>({data:[invoice],has_more:false});f.stripe.invoices.listLineItems=async()=>({data:[line],has_more:false});
 await f.handler.reconcile(f.data);let state=f.calls.findLast(c=>c.kind==='sync_apply').payload;assert.equal(state.paid_verified,true);assert.equal(state.referral_evidence,null);assert.deepEqual(f.effects,[]);
 invoice.id='in_Unapproved';await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,false);
 invoice.id='in_Reward';line.proration=true;await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,false);line.proration=false;
 item.price='price_ProAnnual';line.price='price_ProAnnual';await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.paid_verified,false);
});

test('first paid monthly-cycle evidence is server verified; zero, failed, annual and prorated invoices cannot supply it',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.data.referral={invoice_id:null,status:'joined'};f.state.sub=f.trial(1);f.state.sub.status='active';f.state.sub.items.data[0].price='price_Pro';
 const item=f.state.sub.items.data[0];item.current_period_end=item.current_period_start+30*86400;
 const invoice={id:'in_FirstPaid',status:'paid',currency:'gbp',customer:f.data.customer_id,subscription:f.state.sub.id,billing_reason:'subscription_create',amount_paid:2000,created:item.current_period_start};
 const line={price:'price_Pro',quantity:1,amount:2000,period:{start:item.current_period_start,end:item.current_period_end}};
 f.stripe.invoices.list=async()=>({data:[invoice],has_more:false});f.stripe.invoices.listLineItems=async()=>({data:[line],has_more:false});
 await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.referral_evidence.invoice_id,'in_FirstPaid');
 for(const mutate of [()=>{invoice.amount_paid=0;},()=>{invoice.amount_paid=2000;invoice.status='open';},()=>{invoice.status='paid';line.proration=true;},()=>{line.proration=false;line.period.end=line.period.start+86400;}]){mutate();await f.handler.reconcile(f.data);assert.equal(f.calls.findLast(c=>c.kind==='sync_apply').payload.referral_evidence,null);}
});


test('managed signup checkout requires stored legal acceptance and the locked selection',async()=>{
 for(const patch of [{legal_accepted:false},{legal_version:'old'},{plan:'premium'},{seats:2}]){const f=fixture();f.access.signup_payment={managed_signup:true,plan:'standard',cadence:'monthly',seats:1,legal_accepted:true,legal_version:OFFER_VERSION,...patch};const response=await f.handler.checkout(f.request({plan:'standard',request_id:crypto.randomUUID()}));assert.equal(response.status,409);assert.deepEqual(f.effects,[]);}
 const f=fixture();f.access.signup_payment={managed_signup:true,plan:'standard',cadence:'monthly',seats:1,legal_accepted:true,legal_version:OFFER_VERSION,onboarding_completed:false};const response=await f.handler.checkout(f.request({plan:'standard',request_id:crypto.randomUUID()}));assert.equal(response.status,200);const created=f.calls.find(c=>c.kind==='stripe-checkout');assert.equal(created.params.success_url,'https://book.jovamedia.com/#signup');assert.equal(created.params.cancel_url,created.params.success_url);assert(!('trial_period_days' in created.params.subscription_data));assert.doesNotMatch(created.params.custom_text.submit.message,/free|nothing.*charged|14 days/i);assert.equal(f.calls.find(c=>c.kind==='begin').payload.trial,false);
});

test('an old uncompleted trial checkout is expired before a new upfront request',async()=>{
 const f=fixture();f.data.customer_id='cus_Fixture';f.data.open_action={id:actionId,kind:'checkout',plan:'standard',cadence:'monthly',seats:1,trial:true,provider_id:'cs_Fixture',request_id:crypto.randomUUID()};f.stripe.checkout.sessions.expire=async()=>{f.effects.push('expired-old-checkout');return {id:'cs_Fixture',status:'expired'};};
 const response=await f.handler.checkout(f.request({plan:'standard',request_id:crypto.randomUUID()}));assert.equal(response.status,200);assert.deepEqual(f.effects,['expired-old-checkout','checkout']);assert.equal(f.calls.find(c=>c.kind==='stripe-checkout').params.subscription_data.trial_period_days,undefined);
});


test('completed managed signups use ordinary subscription checkout for a later plan choice',async()=>{const f=fixture();f.access.signup_payment={managed_signup:true,onboarding_completed:true,plan:'standard',cadence:'monthly',seats:1};const response=await f.handler.checkout(f.request({plan:'premium',seats:2,request_id:crypto.randomUUID()}));assert.equal(response.status,200);assert.equal(f.calls.find(c=>c.kind==='stripe-checkout').params.success_url,'https://book.jovamedia.com/#billing');});


test('a matching paid Checkout from an earlier release resumes without reserving a new action',async()=>{const f=fixture();f.data.customer_id='cus_Fixture';const result={ok:true,kind:'checkout',url:'https://checkout.stripe.com/c/pay/previous'};f.data.open_action={id:actionId,kind:'checkout',plan:'standard',cadence:'monthly',seats:1,trial:false,request_hash:'previous-release-policy-hash',provider_id:'cs_Fixture',request_id:crypto.randomUUID(),result};const response=await f.handler.checkout(f.request({plan:'standard',request_id:crypto.randomUUID()}));assert.equal(response.status,200);assert.deepEqual(await response.json(),result);assert(!f.calls.some(call=>call.kind==='begin'));assert.deepEqual(f.effects,[]);});
