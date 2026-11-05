import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
const sid='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',uid='10000000-0000-4000-8000-000000000001',token='e'.repeat(64);

test('free plans enforce bookings, message allowances and verified card-trial seats in PostgreSQL',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.value;
 const worker=(action,payload={},secret=token)=>value('select booking_offer_worker($1,$2,$3) value',[secret,action,JSON.stringify({salon:sid,...payload})]);
 const limits=()=>value('select jovabook_private.offer_limits($1) value',[sid]);
 try{
  await bootstrap(db,await sources());
  await q("update jovabook_private.billing_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),enabled=true,provider_configured=true",[token]);
  await t.test('Starter needs no card or expiring trial and private state is inaccessible',async()=>{
   assert.equal((await limits()).booking_limit,20);assert.equal((await limits()).email_limit,50);assert.equal((await limits()).sms_limit,0);
   assert.equal(await value('select jovabook_private.billing_due($1) value',[sid]),null);
   await assert.rejects(worker('context',{},'bad'),/Invalid billing/);
   await assert.rejects(worker('context',{salon:other,owner:uid}),/ownership/);
   await db.exec('set role anon');await assert.rejects(q('select * from jovabook_private.offer_accounts'),/permission denied/);await db.exec('reset role');
   await q("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');
   const access=await value('select owner_account_access() value');assert.equal(access.billing.card_required,false);assert.equal(access.billing.commission_bps,0);assert.equal(access.lifecycle.purgeAt,null);
   await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)");
  });
  await t.test('message reservations are bounded, business-scoped and idempotent',async()=>{
   const job=crypto.randomUUID();assert.equal(await value("select jovabook_private.offer_reserve_message($1,'email',$2) value",[sid,job]),true);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'email',$2) value",[sid,job]),true);
   for(let i=1;i<50;i++)assert.equal(await value("select jovabook_private.offer_reserve_message($1,'email',$2) value",[sid,crypto.randomUUID()]),true);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'email',$2) value",[sid,crypto.randomUUID()]),false);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'sms',$2) value",[sid,crypto.randomUUID()]),false);
   assert.equal((await limits()).emails_used,50);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'email',$2) value",[other,crypto.randomUUID()]),true);
  });
  await t.test('20-booking cap covers manual bookings, cancellations and rescheduling without deleting history',async()=>{
   await q("update salons set settings=jsonb_set(settings,'{hours}',jsonb_build_object('start','09:00','end','18:00','days','[0,1,2,3,4,5,6]'::jsonb)) where id=$1",[sid]);
   const month=await value("select (date_trunc('month',current_date)+interval '1 month')::date::text value");
   const add=(id,day)=>q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,source,status) select $1,$2,id,name,price,duration,$3::date+$4::int,'10:00','owner','Fixture','fixture@example.test','Manual','confirmed' from services where salon_id=$1 and id='consultation'",[sid,id,month,day]);
   for(let i=0;i<20;i++)await add('offer-quota-'+i,i);
   await assert.rejects(add('offer-quota-over',21),/20 bookings/);
   await q("update bookings set notes='Still editable at the limit' where salon_id=$1 and id='offer-quota-0'",[sid]);
   await q("update bookings set status='cancelled' where salon_id=$1 and id='offer-quota-0'",[sid]);
   await add('offer-quota-replacement',21);
   await assert.rejects(q("update bookings set status='confirmed' where salon_id=$1 and id='offer-quota-0'",[sid]),/20 bookings/);
   assert.equal(await value("select count(*)::int value from bookings where salon_id=$1 and id like 'offer-quota-%'",[sid]),21);
  });
  await t.test('a trial that started before trials were retired still needs verified server proof',async()=>{
   const request=crypto.randomUUID(),selection={owner:uid,plan:'premium',seats:1,cadence:'monthly',request_id:request,kind:'checkout',hash:'a'.repeat(64)};
   const action=await worker('begin',selection);assert.equal(action.trial,false);assert.equal((await worker('context')).trial_eligible,false);assert.equal((await limits()).staff_limit,1);
   // New trials are retired. A trial that started earlier must still be verified from server proof.
   await q("update jovabook_private.offer_actions set trial=true where id=$1",[action.id]);
   await q("insert into jovabook_private.offer_trial_ledger(email_hash,action_id) select jovabook_private.trial_fingerprint(email),$2 from auth.users where id=$1",[uid,action.id]);
   assert.equal((await worker('begin',selection)).id,action.id);
   await assert.rejects(worker('begin',{...selection,hash:'b'.repeat(64)}),/request changed/);
   await worker('bind_customer',{customer_id:'cus_FictionalOffer'});
   const fence=await worker('sync_begin'),start=new Date(Math.floor(Date.now()/1000)*1000),end=new Date(+start+14*86400000);
   await assert.rejects(worker('sync_apply',{fence:fence.fence,customer_id:'cus_FictionalOffer',subscription_id:'sub_FictionalOffer',plan:'premium',seats:1,cadence:'monthly',provider_status:'trialing',trial_verified:true,trial_action_id:action.id,trial_started_at:start.toISOString(),trial_ends_at:new Date(+start+3*86400000).toISOString(),paid_until:end.toISOString()}),/14-day/);
   await worker('sync_apply',{fence:fence.fence,customer_id:'cus_FictionalOffer',subscription_id:'sub_FictionalOffer',plan:'premium',seats:1,cadence:'monthly',provider_status:'trialing',trial_verified:true,trial_action_id:action.id,trial_started_at:start.toISOString(),trial_ends_at:end.toISOString(),period_start:start.toISOString(),paid_until:end.toISOString()});
   const result=await limits();assert.equal(result.plan,'premium');assert.equal(result.staff_limit,1);assert.equal(result.email_limit,100);assert.equal(result.sms_limit,0);assert.equal(result.branding_required,false);assert.equal(result.insights,true);assert.equal(result.commission_bps,0);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'sms',$2) value",[sid,crypto.randomUUID()]),false);
   await assert.rejects(worker('begin',{...selection,seats:2,request_id:crypto.randomUUID()}),/trial|earlier billing request/i);
   await assert.rejects(q("insert into staff(salon_id,id,name) values($1,'unpaid-seat-3','Unpaid seat')",[sid]),/plan allows/);
   const cancel=await worker('begin',{owner:uid,plan:'essential',seats:1,cadence:'monthly',request_id:crypto.randomUUID(),kind:'cancel',hash:'f'.repeat(64)});assert.equal(cancel.kind,'cancel');
  });
  await t.test('operator analytics read verified Starter, 14-day trial, paid plan and seat records without changing billing',async()=>{
   const op='10000000-0000-4000-8000-000000000099';
   await q("insert into auth.users(id,email,email_confirmed_at) values($1,'operator-offer@example.test',now())",[op]);await q("insert into jovabook_private.operators(email) values('operator-offer@example.test')");
   const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
   await as(uid);await assert.rejects(q('select operator_overview()'),/operator|authorised|authorized|access/i);
   await as(op);const overview=await value('select operator_overview() value');assert.equal(overview.offer_version,'2026-11-free-v1');assert.equal(overview.starter,1);assert.equal(overview.trials_active,1);assert.equal(overview.premium,0);
   const business=(await value('select operator_business($1) value',[sid])).business;assert.equal(business.plan,'premium');assert.equal(business.seats,1);assert.equal(business.billing_state,'trial');assert.equal(business.has_paid,false);
   await db.exec('reset role');const fence=await worker('sync_begin');await worker('sync_apply',{fence:fence.fence,customer_id:'cus_FictionalOffer',subscription_id:'sub_FictionalOffer',plan:'premium',seats:2,cadence:'annual',provider_status:'active',paid_verified:true,period_start:new Date().toISOString(),paid_until:new Date(Date.now()+365*86400000).toISOString()});
   assert.equal((await limits()).sms_limit,120);
   assert.equal(await value("select jovabook_private.offer_reserve_message($1,'sms',$2) value",[sid,crypto.randomUUID()]),true);
   await q("insert into staff(salon_id,id,name) values($1,'paid-seat-2','Fixture team member')",[sid]);
   const actions=await value('select count(*)::int value from jovabook_private.offer_actions');await as(op);
   const paid=await value('select operator_overview() value');assert.equal(paid.premium,1);assert.equal(paid.paid_active,1);assert.equal(paid.trials_active,0);
   const billing=await value('select operator_billing_summary($1) value',[sid]);assert.equal(billing.subscription.ever_paid,true);assert.equal(billing.subscription.seats,2);assert.equal(billing.subscription.cadence,'annual');
   await db.exec('reset role');assert.equal(await value('select count(*)::int value from jovabook_private.offer_actions'),actions);
   await q("update jovabook_private.offer_accounts set provider_status='trialing',ever_paid=false where salon_id=$1",[sid]);
  });
  await t.test('expired trials return to Starter without deleting the account or restoring trial eligibility',async()=>{
   await q("update jovabook_private.offer_accounts set trial_ends_at=now()-interval '1 second' where salon_id=$1",[sid]);
   assert.equal((await limits()).plan,'essential');assert.equal((await worker('context')).trial_eligible,false);
   assert.equal(await value('select jovabook_private.billing_due($1) value',[sid]),null);
   await q("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');
   const before=await value('select owner_account_access() value');assert.equal(before.access,'billing_only');
   await q("select offer_choose_starter_calendar('owner')");
   assert.equal((await value('select owner_account_access() value')).access,'active');
   await db.exec('reset role');
   assert.equal(await value('select count(*)::int value from staff where salon_id=$1 and active',[sid]),1);
   assert.equal(await value('select count(*)::int value from staff where salon_id=$1',[sid]),2);
   await assert.rejects(q("update staff set active=true where salon_id=$1 and id='paid-seat-2'",[sid]),/plan allows/);
  });
  await t.test('Stripe deposits belong to paid plans: Starter is booking only and a downgrade keeps the saved settings',async()=>{
   const slug=await value('select slug value from salons where id=$1',[sid]);await q("update salons set status='active' where id=$1",[sid]);
   await q("update jovabook_private.offer_accounts set plan='essential',seats=1,provider_status=null,paid_until=null,trial_ends_at=null where salon_id=$1",[sid]);
   assert.equal((await limits()).deposits_allowed,false);assert.equal(await value('select jovabook_private.online_deposit_pence($1,50) value',[sid]),0);
   await assert.rejects(q(`update salons set payments='{"enabled":true,"deposit_percent":20}'::jsonb where id=$1`,[sid]),/Pro Solo and Pro Team/);
   await q("update jovabook_private.offer_accounts set plan='standard',seats=1,provider_status='active',paid_until=now()+interval '30 days',ever_paid=true where salon_id=$1",[sid]);
   assert.equal((await limits()).deposits_allowed,true);
   await q(`update salons set payments='{"enabled":true,"deposit_percent":20}'::jsonb where id=$1`,[sid]);
   assert.equal(await value('select jovabook_private.online_deposit_pence($1,50) value',[sid]),1000);
   let pub=await value('select public_salon($1) value',[slug]);assert.equal(pub.deposits_allowed,true);assert.equal(pub.payments.enabled,true);assert.equal(pub.payments.deposit_percent,20);
   await q("update jovabook_private.offer_accounts set paid_until=now()-interval '1 day',provider_status='canceled' where salon_id=$1",[sid]);
   assert.equal(await value('select jovabook_private.online_deposit_pence($1,50) value',[sid]),0);
   pub=await value('select public_salon($1) value',[slug]);assert.equal(pub.deposits_allowed,false);assert.equal(pub.deposit_checkout_available,false);assert.equal(pub.payments.enabled,false);assert.equal(pub.payments.deposit_percent,0);
   assert.equal(await value("select (payments->>'enabled')::boolean value from salons where id=$1",[sid]),true);
   await q(`update salons set payments='{"enabled":false,"deposit_percent":0}'::jsonb where id=$1`,[sid]);
  });
 }finally{await db.close();}
});
