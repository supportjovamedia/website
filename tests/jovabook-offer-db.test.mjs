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
  await t.test('a real 14-day trial reserves once and seats only unlock from verified server proof',async()=>{
   const request=crypto.randomUUID(),selection={owner:uid,plan:'premium',seats:2,cadence:'monthly',request_id:request,kind:'checkout',hash:'a'.repeat(64)};
   const action=await worker('begin',selection);assert.equal(action.trial,true);assert.equal((await limits()).staff_limit,1);
   assert.equal((await worker('begin',selection)).id,action.id);
   await assert.rejects(worker('begin',{...selection,hash:'b'.repeat(64)}),/request changed/);
   await worker('bind_customer',{customer_id:'cus_FictionalOffer'});
   const fence=await worker('sync_begin'),start=new Date(Math.floor(Date.now()/1000)*1000),end=new Date(+start+14*86400000);
   await assert.rejects(worker('sync_apply',{fence:fence.fence,customer_id:'cus_FictionalOffer',subscription_id:'sub_FictionalOffer',plan:'premium',seats:2,cadence:'monthly',provider_status:'trialing',trial_verified:true,trial_action_id:action.id,trial_started_at:start.toISOString(),trial_ends_at:new Date(+start+3*86400000).toISOString(),paid_until:end.toISOString()}),/14-day/);
   await worker('sync_apply',{fence:fence.fence,customer_id:'cus_FictionalOffer',subscription_id:'sub_FictionalOffer',plan:'premium',seats:2,cadence:'monthly',provider_status:'trialing',trial_verified:true,trial_action_id:action.id,trial_started_at:start.toISOString(),trial_ends_at:end.toISOString(),period_start:start.toISOString(),paid_until:end.toISOString()});
   const result=await limits();assert.equal(result.plan,'premium');assert.equal(result.staff_limit,2);assert.equal(result.email_limit,200);assert.equal(result.sms_limit,100);assert.equal(result.branding_required,false);assert.equal(result.insights,true);assert.equal(result.commission_bps,0);
   await q("insert into staff(salon_id,id,name) values($1,'paid-seat-2','Fixture team member')",[sid]);
   await assert.rejects(q("insert into staff(salon_id,id,name) values($1,'unpaid-seat-3','Unpaid seat')",[sid]),/plan allows/);
   const cancel=await worker('begin',{owner:uid,plan:'essential',seats:1,cadence:'monthly',request_id:crypto.randomUUID(),kind:'cancel',hash:'f'.repeat(64)});assert.equal(cancel.kind,'cancel');
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
 }finally{await db.close();}
});
