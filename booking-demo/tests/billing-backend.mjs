import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import Stripe from 'stripe';
import {createJovaBookBillingHandlers} from '../../lib/jovabook-billing.mjs';
import {MONTHLY_COMMISSION_TERMS_VERSION} from '../../lib/jovabook-monthly-commission.mjs';

const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000002',requestId='30000000-0000-4000-8000-000000000001';
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql','migrations/20261101054615_jovabook_commission_supervisor.sql'];
const env={JOVABOOK_BILLING_ENABLED:'true',JOVABOOK_BILLING_APPROVED:'true',JOVABOOK_STRIPE_SECRET_KEY:'sk_test_fictional',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_fictional',JOVABOOK_STRIPE_MODE:'test',JOVABOOK_STRIPE_PRICE_ESSENTIAL:'price_essential',JOVABOOK_STRIPE_PRICE_STANDARD:'price_standard',JOVABOOK_STRIPE_PRICE_PREMIUM:'price_premium',JOVABOOK_BILLING_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_LIFECYCLE_WORKER_TOKEN:'b'.repeat(64),JOVABOOK_LIFECYCLE_AUTH_TOKEN:'c'.repeat(64),JOVABOOK_STRIPE_WEBHOOK_SECRET:'whsec_local_fictional_only',JOVABOOK_STRIPE_UPGRADE_PORTAL_CONFIG:'bpc_local',JOVABOOK_SUPABASE_URL:'https://fictional.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fictional'};
const amounts={essential:2000,standard:5000,premium:10000};
const request=(body,token='owner')=>new Request('https://book.jovamedia.com/api/jovabook/billing/status',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('billing HTTP handlers use actual isolated SQL and mocked provider transport',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),calls=[];
 let customer=null,sub=null,invoices=[],lines=[],sessions=[],schedule=null,throwCreate=false,throwVerify=false,paymentState=null;
 const sdk=new Stripe('sk_test_fictional');
 const stripe={
  accounts:{retrieveCurrent:async()=>({id:'acct_fictional',charges_enabled:true})},
  webhooks:sdk.webhooks,
  prices:{retrieve:async id=>({id,active:true,currency:'gbp',unit_amount:amounts[id.replace('price_','')],recurring:{interval:'month',interval_count:1},livemode:false})},
  customers:{create:async(params,opts)=>{calls.push(['customer',params,opts]);return customer={id:'cus_owner'};}},
  checkout:{sessions:{
   create:async(params,opts)=>{calls.push(['checkout',params,opts]);if(throwCreate)throw Error('Provider timed out after accepting the request.');const value={id:'cs_owner',url:'https://checkout.stripe.com/c/pay/local',customer:params.customer,metadata:params.metadata,mode:'subscription',status:'open',payment_status:'unpaid'};sessions=[value];return value;},
   retrieve:async id=>{calls.push(['checkout-read',id]);return sessions.find(x=>x.id===id);},
   list:async()=>({data:sessions,has_more:false}),expire:async id=>{calls.push(['checkout-expire',id]);const value=sessions.find(x=>x.id===id);value.status='expired';return value;}
  }},
  subscriptions:{
   list:async()=>({data:sub?[sub]:[],has_more:false}),
   retrieve:async id=>{calls.push(['subscription-read',id]);if(throwVerify)throw Error('No canonical read.');return sub;},
   update:async(id,values)=>{calls.push(['subscription-update',id,values]);Object.assign(sub,values);return sub;},
   cancel:async(id,values)=>{calls.push(['subscription-cancel',id,values]);sub.status='canceled';return sub;}
  },
  invoices:{list:async()=>({data:invoices,has_more:false}),listLineItems:async()=>({data:lines,has_more:false}),retrieve:async id=>invoices.find(x=>x.id===id),voidInvoice:async id=>{const value=invoices.find(x=>x.id===id);value.status='void';calls.push(['void',id]);return value;},del:async id=>{invoices=invoices.filter(x=>x.id!==id);return {deleted:true};}},
  invoicePayments:{list:async()=>({data:paymentState?[{id:'inpay_local',status:'open',payment:{type:'payment_intent',payment_intent:'pi_local'}}]:[],has_more:false})},invoiceItems:{list:async()=>({data:[],has_more:false})},
  paymentIntents:{retrieve:async()=>({id:'pi_local',customer:'cus_owner',status:paymentState}),cancel:async()=>{paymentState='canceled';return {id:'pi_local',status:'canceled'};}},
  billingPortal:{configurations:{retrieve:async()=>({id:'bpc_local',active:true,features:{subscription_update:{enabled:true,proration_behavior:'always_invoice'}}})},sessions:{create:async(params,opts)=>{calls.push(['upgrade',params,opts]);return {id:'bps_local',url:'https://billing.stripe.com/p/session/local'};}}},
  subscriptionSchedules:{create:async(params,opts)=>{calls.push(['schedule-create',params,opts]);schedule={id:'sub_sched_local',customer:'cus_owner',subscription:'sub_owner',status:'active',current_phase:{start_date:Math.floor(Date.now()/1000)-10},phases:[]};sub.schedule=schedule.id;return schedule;},update:async(id,params)=>{calls.push(['schedule-update',id,params]);Object.assign(schedule,params);return schedule;},retrieve:async()=>schedule,release:async()=>{schedule.status='released';schedule.released_subscription=sub.id;schedule.subscription=null;sub.schedule=null;return schedule;}}
 };
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await q('insert into auth.users(id,email) values($1,$2)',[owner,'owner@example.test']);
  for(const file of files)await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
  await q("insert into salons(id,owner_id,name,slug,owner_name,email,status) values($1,$2,'Local fixture','fixture','Owner','owner@example.test','setup')",[salon,owner]);
  await q("update jovabook_private.billing_config set enabled=true,provider_configured=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),lifecycle_hash=encode(sha256(convert_to($2,'UTF8')),'hex')",[env.JOVABOOK_BILLING_WORKER_TOKEN,env.JOVABOOK_LIFECYCLE_WORKER_TOKEN]);
  const checkoutEnv={...env,JOVABOOK_MONTHLY_COMMISSION_ENABLED:'true',JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'true',JOVABOOK_COMMISSION_SUPERVISOR_ENABLED:'true',JOVABOOK_COMMISSION_WORKER_TOKEN:'d'.repeat(64),JOVABOOK_COMMISSION_HTTP_TOKEN:'e'.repeat(64)};
  await q("update jovabook_private.commission_config set enabled=true,invoice_enabled=true,enabled_at=now(),worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[checkoutEnv.JOVABOOK_COMMISSION_WORKER_TOKEN]);
  const send=async(url,options)=>{
   const u=new URL(url);assert.equal(u.origin,'https://fictional.example.test','No real network or production project is contacted.');
   if(u.pathname==='/auth/v1/user')return Response.json(options.headers.Authorization==='Bearer owner'?{id:owner,email:'owner@example.test'}:{},{status:options.headers.Authorization==='Bearer owner'?200:401});
   assert(u.pathname.startsWith('/rest/v1/rpc/'));
   const body=JSON.parse(options.body),fn=u.pathname.split('/').at(-1);let value;
   if(fn==='owner_account_access'){
    await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
    try{value=(await q('select owner_account_access() data')).rows[0].data;}finally{await db.exec('reset role');}
   }else if(fn==='booking_billing_worker')value=(await q('select booking_billing_worker($1,$2,$3) data',[body.p_token,body.p_action,JSON.stringify(body.p_payload)])).rows[0].data;
   else if(fn==='booking_commission_worker')value=(await q('select booking_commission_worker($1,$2,$3) data',[body.p_token,body.p_action,JSON.stringify(body.p_payload)])).rows[0].data;
   else assert.fail('Unexpected RPC '+fn);
   return Response.json(value);
  };
  const handlers=createJovaBookBillingHandlers({env,send,stripe});
  // This suite isolates billing reconciliation. Only Checkout opts in to the
  // configured commission fixture; commission collection has its own suite.
  const configuredCheckout=createJovaBookBillingHandlers({env:checkoutEnv,send,stripe}).checkout;
  handlers.checkout=async original=>configuredCheckout(new Request(original,{body:JSON.stringify({...await original.json(),terms_version:MONTHLY_COMMISSION_TERMS_VERSION})}));
  const state=async()=> (await q('select * from jovabook_private.billing_accounts where salon_id=$1',[salon])).rows[0];
  const webhook=async(type,id='evt_local')=>{const body=JSON.stringify({id,livemode:false,type,data:{object:{customer:'cus_owner'}}}),sig=sdk.webhooks.generateTestHeaderString({payload:body,secret:env.JOVABOOK_STRIPE_WEBHOOK_SECRET});return handlers.webhook(new Request('https://book.jovamedia.com/api/jovabook/billing/webhook',{method:'POST',headers:{'stripe-signature':sig},body}));};
  const paid=plan=>{
   const end=Math.floor(Date.now()/1000)+30*86400;
   sub={id:'sub_owner',customer:'cus_owner',metadata:{app:'jovabook',salon_id:salon},livemode:false,status:'active',items:{data:[{id:'si_owner',price:{id:'price_'+plan},quantity:1,current_period_end:end}]},latest_invoice:'in_paid'};
   invoices=[{id:'in_paid',customer:'cus_owner',subscription:sub.id,status:'paid',amount_paid:amounts[plan],amount_remaining:0,currency:'gbp',billing_reason:'subscription_create'}];
   lines=[{id:'il_paid',price:{id:'price_'+plan},quantity:1,amount:amounts[plan],period:{end}}];return end;
  };
  await t.test('minimal status works without cached tenant; ownership and unknown fields fail before provider calls',async()=>{
   let r=await handlers.status(request({}));assert.equal(r.status,200);assert.equal((await r.json()).business.id,salon);
   r=await handlers.status(request({salon_id:other}));assert.equal(r.status,403);
   assert.equal((await handlers.status(request({},'bad'))).status,401);
   assert.equal((await handlers.checkout(request({salon_id:salon,plan:'premium',request_id:requestId,price_id:'price_attack'}))).status,400);assert.equal(calls.length,0);
  });
  await t.test('disabled billing offers request-only fallback and never creates provider customers',async()=>{
   const off=createJovaBookBillingHandlers({env:{...env,JOVABOOK_BILLING_ENABLED:'false'},send,stripe});const r=await off.checkout(request({plan:'standard',request_id:requestId}));assert.equal(r.status,503);assert.equal((await r.json()).billing_unavailable,true);assert.equal(calls.length,0);
  });
  await t.test('a key belonging to another merchant fails before any billing action or entitlement change',async()=>{
   const wrong=createJovaBookBillingHandlers({env,send,stripe:{...stripe,accounts:{retrieveCurrent:async()=>({id:'acct_anotherbusiness',charges_enabled:true})}}});assert.equal((await wrong.checkout(request({plan:'standard',request_id:requestId}))).status,503);assert.equal((await wrong.status(request({}))).status,503);assert.equal(calls.length,0);assert.equal((await state()).ever_paid,false);
  });
  await t.test('unknown Checkout timeout retains one action and uses the same provider key; expired idempotency is not blindly retried',async()=>{
   const before=(await q("select booking_commission_worker($1,'summary',$2) data",[checkoutEnv.JOVABOOK_COMMISSION_WORKER_TOKEN,JSON.stringify({salon})])).rows[0].data;
   assert.equal(before.available,false,'New account has no paid period or statement before its first Checkout.');
   throwCreate=true;assert.equal((await handlers.checkout(request({plan:'standard',request_id:requestId}))).status,503);throwCreate=false;
   assert.equal(calls.filter(x=>x[0]==='checkout').length,1);
   assert.equal((await handlers.checkout(request({plan:'premium',request_id:'30000000-0000-4000-8000-000000000009'}))).status,503);
   await q("update jovabook_private.billing_actions set created_at=now()-interval '24 hours'");
   assert.equal((await handlers.checkout(request({plan:'standard',request_id:requestId}))).status,409);assert.equal(calls.filter(x=>x[0]==='checkout').length,1);
   await q('update jovabook_private.billing_actions set created_at=now()');
  });
  await t.test('Checkout uses server prices, identity and exact return URLs, and repeated clicks reuse one hosted session',async()=>{
   let r=await handlers.checkout(request({plan:'standard',request_id:requestId}));assert.equal(r.status,200);assert.equal((await r.json()).kind,'checkout');const call=calls.find(x=>x[0]==='checkout');assert.deepEqual(call[1].line_items,[{price:'price_standard',quantity:1}]);assert.equal(call[1].success_url,'https://book.jovamedia.com/#billing');assert.equal(call[1].cancel_url,call[1].success_url);assert.equal(calls.find(x=>x[0]==='customer')[1].email,'owner@example.test');
   r=await handlers.checkout(request({plan:'standard',request_id:'30000000-0000-4000-8000-000000000002'}));assert.equal(r.status,200);assert.equal(calls.filter(x=>x[0]==='checkout').length,2);assert.equal(calls.filter(x=>x[0]==='checkout')[0][2].idempotencyKey,calls.filter(x=>x[0]==='checkout')[1][2].idempotencyKey);assert.equal(calls.filter(x=>x[0]==='customer').length,1);assert.equal((await state()).ever_paid,false);
   assert.equal((await handlers.checkout(request({plan:'premium',request_id:'30000000-0000-4000-8000-000000000003'}))).status,409);
  });
  await t.test('bad webhook signature and unavailable canonical reads never grant access or acknowledge success',async()=>{
   assert.equal((await handlers.webhook(new Request('https://book.jovamedia.com',{method:'POST',body:'{}'}))).status,400);
   paid('standard');throwVerify=true;assert.equal((await webhook('invoice.paid')).status,503);assert.equal((await state()).ever_paid,false);throwVerify=false;
  });
  await t.test('a missed initial paid webhook is reconstructed from canonical paid history before recurring-failure retention',async()=>{
   lines[0].period.end=Math.floor(Date.now()/1000)-86400;const failure={id:'in_failure_history',customer:'cus_owner',subscription:sub.id,status:'open',attempted:true,amount_remaining:5000,amount_paid:0,billing_reason:'subscription_cycle',created:Math.floor(Date.now()/1000),currency:'gbp'};invoices.push(failure);sub.latest_invoice=failure;sub.status='past_due';
   assert.equal((await webhook('invoice.payment_failed','evt_history_failure')).status,200);const value=await state();assert.equal(value.ever_paid,true);assert.equal(value.paid_plan,'standard');assert(value.failed_at);assert(Date.parse(value.paid_until)<Date.now());assert.equal((await (await handlers.status(request({}))).json()).reason,'payment_failed');paid('standard');
  });
  await t.test('fresh canonical payment unlocks, duplicate events are idempotent, old failed event cannot override current paid state',async()=>{
   assert.equal((await webhook('invoice.paid')).status,200);assert.equal((await state()).paid_plan,'standard');assert.equal((await state()).ever_paid,true);assert.equal((await (await handlers.status(request({}))).json()).billing.commission_bps,100);
   const before=calls.length;assert.equal((await (await webhook('invoice.paid')).json()).duplicate,true);assert.equal(calls.length,before);
   assert.equal((await webhook('invoice.payment_failed','evt_old_failure')).status,200);assert.equal((await state()).failed_at,null);
  });
  await t.test('hosted upgrade confirms only the server-selected item and never locally grants the target plan',async()=>{
   const r=await handlers.change(request({plan:'premium',request_id:'30000000-0000-4000-8000-000000000004'}));assert.equal(r.status,200);assert.equal((await r.json()).kind,'upgrade');const call=calls.find(x=>x[0]==='upgrade');assert.equal(call[1].flow_data.type,'subscription_update_confirm');assert.deepEqual(call[1].flow_data.subscription_update_confirm.items,[{id:'si_owner',price:'price_premium',quantity:1}]);assert.equal((await state()).paid_plan,'standard');
   paid('premium');await webhook('invoice.paid','evt_upgrade_paid');assert.equal((await state()).paid_plan,'premium');assert.equal((await (await handlers.status(request({}))).json()).billing.commission_bps,0);
  });
  await t.test('period-end downgrade creates exact phases, holds cap, and releases it only after provider verification',async()=>{
   let r=await handlers.change(request({plan:'standard',request_id:'30000000-0000-4000-8000-000000000005'}));assert.equal(r.status,200);const result=await r.json();assert.equal(result.kind,'scheduled');assert.equal((await state()).pending_target,'standard');assert.equal((await state()).paid_plan,'premium');const call=calls.find(x=>x[0]==='schedule-update');assert.equal(call[2].proration_behavior,'none');assert.equal(call[2].phases[1].items[0].price,'price_standard');assert.equal(new Date(result.effective_at).getTime(),call[2].phases[1].start_date*1000);
   r=await handlers.cancelChange(request({request_id:'30000000-0000-4000-8000-000000000006'}));assert.equal(r.status,200);assert.equal((await state()).pending_target,null);assert.equal((await state()).schedule_id,null);
  });
  await t.test('recurring invoice failure locks immediately and hosted recovery cannot become another subscription',async()=>{
   sub.status='past_due';invoices=[{id:'in_failed',customer:'cus_owner',subscription:sub.id,status:'open',attempted:true,amount_remaining:10000,amount_paid:0,billing_reason:'subscription_cycle',created:Math.floor(Date.now()/1000),hosted_invoice_url:'https://invoice.stripe.com/i/local',currency:'gbp'}];sub.latest_invoice=invoices[0];
   assert.equal((await webhook('invoice.payment_failed','evt_cycle_failed')).status,200);assert((await state()).failed_at);assert.equal((await (await handlers.status(request({}))).json()).access,'billing_only');
   const r=await handlers.checkout(request({plan:'essential',request_id:'30000000-0000-4000-8000-000000000007'}));assert.equal(r.status,200);assert.equal((await r.json()).kind,'recovery');assert.equal(calls.filter(x=>x[0]==='checkout').length,2);
  });
  await t.test('paying a newer invoice cannot hide older unpaid carried debt; recovery opens the oldest owed invoice',async()=>{
   const owed=invoices[0],previousSub=sub,previousLines=lines;paid('premium');invoices.unshift(owed);sub.status='active';assert.equal((await webhook('invoice.paid','evt_new_paid_old_debt')).status,200);assert((await state()).failed_at);assert.equal((await (await handlers.status(request({}))).json()).access,'billing_only');const r=await handlers.checkout(request({plan:'premium',request_id:'30000000-0000-4000-8000-000000000010'}));assert.equal((await r.json()).url,owed.hosted_invoice_url);sub=previousSub;invoices=[owed];lines=previousLines;
  });
  await t.test('destructive lifecycle is independently disabled, dry run is exact and unauthorised calls cannot inspect it',async()=>{
   await q("update jovabook_private.billing_accounts set failed_at=now()-interval '2 months 1 day' where salon_id=$1",[salon]);
   assert.equal((await handlers.lifecycle(request({mode:'dry_run'}))).status,401);
   const r=await handlers.lifecycle(request({mode:'dry_run'},env.JOVABOOK_LIFECYCLE_AUTH_TOKEN));assert.equal(r.status,200);const data=await r.json();assert.deepEqual(data.candidates.map(x=>x.salon_id),[salon]);assert(!JSON.stringify(data).includes('owner@example.test'));
   assert.equal((await handlers.lifecycle(request({mode:'execute',salon_id:salon},env.JOVABOOK_LIFECYCLE_AUTH_TOKEN))).status,503);assert.equal((await q('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal(calls.filter(x=>x[0]==='subscription-cancel').length,0);
  });
  await t.test('processing payments stop enabled deletion, release its lease and preserve Auth plus the unpaid business',async()=>{
   env.JOVABOOK_LIFECYCLE_ENABLED='true';env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY='fictional-server-only';await q('update jovabook_private.billing_config set deletion_enabled=true');
   sessions=[];paymentState='processing';const r=await handlers.lifecycle(request({mode:'execute',salon_id:salon},env.JOVABOOK_LIFECYCLE_AUTH_TOKEN));assert.equal(r.status,503);assert.equal((await q('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal((await state()).deletion_state,null);assert.equal(invoices[0].status,'open');
  });
  await t.test('after terminal payment state, exact provider charge sources close before atomic unpaid account purge',async()=>{
   paymentState='requires_action';invoices[0].status='uncollectible';const r=await handlers.lifecycle(request({mode:'execute',salon_id:salon},env.JOVABOOK_LIFECYCLE_AUTH_TOKEN));assert.equal(r.status,200);assert.equal((await r.json()).purged,true);assert.equal(paymentState,'canceled');assert.equal(sub.status,'canceled');assert.equal(invoices[0].status,'void','uncollectible invoices can still be paid, so they must be voided too');assert.equal((await q('select count(*)::int n from auth.users')).rows[0].n,0);assert.equal((await q('select count(*)::int n from salons')).rows[0].n,0);assert.equal((await q('select count(*)::int n from jovabook_private.trial_ledger')).rows[0].n,1);assert.equal((await q('select count(*)::int n from jovabook_private.billing_purge_audit')).rows[0].n,1);
  });
  await t.test('verified Auth without a business receives explicit no_business metadata, never a payment mutation',async()=>{
   await q('insert into auth.users(id,email) values($1,$2)',[owner,'owner@example.test']);const before=calls.length;const r=await handlers.status(request({}));assert.equal(r.status,200);const value=await r.json();assert.equal(value.no_business,true);assert.equal(value.access,'no_business');assert.equal(value.business,null);assert.equal(value.billing.canCheckout,false);
   assert.equal((await handlers.status(request({salon_id:salon}))).status,403);assert.equal((await handlers.checkout(request({plan:'standard',request_id:requestId}))).status,403);assert.equal(calls.length,before);
  });
 }finally{await db.close();}
});
