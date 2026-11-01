import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql'];
const sources=await Promise.all(files.map(file=>readFile(new URL('../supabase/'+file,import.meta.url),'utf8')));
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001',token='d'.repeat(64),billingToken='a'.repeat(64);
test('appointment-time monthly commission uses real isolated PostgreSQL',async t=>{
 const db=new PGlite(),q=(s,p=[])=>db.query(s,p),value=async(s,p=[])=>(await q(s,p)).rows[0].data;
 const work=(action,payload={})=>value('select booking_commission_worker($1,$2,$3) data',[token,action,JSON.stringify({salon,...payload})]);
 const past=days=>new Date(Date.now()-days*86400000),future=days=>past(-days),iso=d=>d.toISOString();
 let historyBody;
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(const source of sources)await db.exec(source);
  await q('insert into auth.users(id,email) values($1,$2)',[owner,'owner@example.test']);
  await q("insert into salons(id,owner_id,name,slug,owner_name,email,status,settings) values($1,$2,'Fixture','fixture','Owner','owner@example.test','active',$3)",[salon,owner,JSON.stringify({timezone:'Europe/London',hours:{start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]}})]);
  await q("insert into staff(salon_id,id,name) values($1,'staff','Staff')",[salon]);await q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'svc','Service',50,30,array['staff'])",[salon]);
  await q("update jovabook_private.billing_accounts set ever_paid=true,paid_plan='premium',paid_until=now()+interval '15 days',customer_id='cus_fixture',subscription_id='sub_fixture',commission_terms_version='2026-11-01-appointment-v1',commission_terms_accepted_at=now()-interval '30 days',trial_started_at=now()-interval '27 days',trial_ends_at=now()-interval '24 days' where salon_id=$1",[salon]);await q("update salons set plan='premium' where id=$1",[salon]);
  await q("update jovabook_private.commission_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
  // Fixture-only time travel: the application scheduling trigger is disabled
  // while historical SQL snapshots are constructed. No hosted database exists.
  await db.exec('alter table bookings disable trigger owner_experience_booking_schedule');
  const make=async(id,at,price=50,status='confirmed',seen)=>{
   await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,deposit) values($1,$2,'svc','Service',$3,30,($4::timestamptz at time zone 'Europe/London')::date,to_char($4::timestamptz at time zone 'Europe/London','HH24:MI'),'staff','Fictional','fictional@example.test','confirmed',10)",[salon,id,price,at]);
   await q('update jovabook_private.commission_booking_events set observed_at=$1 where salon_id=$2 and booking_id=$3',[seen||new Date(+at-3600000),salon,id]);
   if(status!=='confirmed')await q('update bookings set status=$1 where salon_id=$2 and id=$3',[status,salon,id]);
  };
  await make('old',past(10),50);await make('recent',past(5),25);await make('premium',past(1),100);await make('distant',future(150),100);await make('trial',past(25),100);await make('cancelled',past(4),100,'cancelled');await make('noshow',past(3),100,'no-show');
  await t.test('default disabled configuration cannot accrue, reserve, or expose invented zero totals',async()=>{assert.deepEqual(await work('summary'),{available:false,currency:'gbp'});assert.equal((await work('accrue')).disabled,true);assert.equal((await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n,0);});
  await q("update jovabook_private.commission_config set enabled=true,invoice_enabled=true,enabled_at=now()-interval '30 days'");
  historyBody={customer:'cus_fixture',subscription:'sub_fixture',period_start:iso(past(7)),period_end:iso(future(23)),next_plan:'premium',customer_credit_minor:0,history:[{invoice:'in_standard',line:'il_standard',subscription:'sub_fixture',plan:'standard',start:iso(past(15)),end:iso(future(15))},{invoice:'in_upgrade',line:'il_upgrade',subscription:'sub_fixture',plan:'premium',start:iso(past(2)),end:iso(future(15))}]};
  await t.test('service occurrence, historical plan and immutable full price govern commission; distant/trial/no-show/cancelled appointments do not charge',async()=>{
   await q("update bookings set price=500 where salon_id=$1 and id='old'",[salon]);const summary=await work('history',historyBody);assert.equal(summary.available,true);assert.equal(summary.carry_forward_pence,50);assert.equal(summary.new_commission_pence,25);assert.equal(summary.estimated_total_pence,10075);
   const entries=(await q('select booking_id,full_price_minor,rate_bps,amount_minor,status from jovabook_private.commission_entries order by booking_id')).rows;
   assert.equal(entries.find(x=>x.booking_id==='old').full_price_minor,5000);assert.equal(entries.find(x=>x.booking_id==='old').amount_minor,50);assert.equal(entries.find(x=>x.booking_id==='premium').amount_minor,0);assert.equal(entries.find(x=>x.booking_id==='trial').status,'waived_trial');assert(!entries.some(x=>x.booking_id==='distant'));assert(!entries.filter(x=>['cancelled','noshow'].includes(x.booking_id)).some(x=>x.status==='open'));
  });
  await t.test('summary refresh is read-only, carries older unbilled fees, and exposes no customer PII',async()=>{
   const before=(await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n;const summary=await work('summary');assert.equal(summary.carry_forward_pence,50);assert.equal(summary.subscription_amount_pence,10000);assert(summary.updated_at&&summary.next_refresh_at);assert(!JSON.stringify(summary).includes('fictional@example.test'));assert.equal((await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n,before);
   await db.exec('set role anon');await assert.rejects(q('select * from jovabook_private.commission_entries'),/permission denied/);await db.exec('reset role');await assert.rejects(value('select booking_commission_worker($1,$2,$3) data',['bad','summary',JSON.stringify({salon})]),/Invalid commission worker/);
  });
  let batch;
  await t.test('invoice reservation is unique and never marks commission collected; void returns the same unbilled rows to carry',async()=>{
   const payload={customer:'cus_fixture',subscription:'sub_fixture',invoice:'in_draft',cutoff:iso(future(23))};batch=await work('reserve',payload);assert.equal(Number(batch.amount_minor),75);assert.equal((await work('reserve',payload)).id,batch.id);assert.equal((await work('summary')).available,false);assert.equal((await q("select count(*)::int n from jovabook_private.commission_entries where status='paid'")).rows[0].n,0);
   await assert.rejects(work('invoice_state',{batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',status:'paid',settlement_kind:'payment'}),/must be verified/);
   await work('invoice_state',{batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',status:'absent_finalized'});const carried=await work('accrue');assert.equal(carried.new_commission_pence+carried.carry_forward_pence,75);
   batch=await work('reserve',{...payload,invoice:'in_real'});assert.equal(Number(batch.amount_minor),75);await assert.rejects(work('reserve',{...payload,invoice:'in_second'}),/unique constraint/);
  });
  await t.test('only verified invoice-paid settlement closes allocated commission; unpaid allocated debt is not charged twice',async()=>{
   await work('bind_item',{batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',item:'ii_fixture'});let summary=await work('summary');assert.equal(summary.unpaid_invoiced_pence,75);assert.equal(summary.new_commission_pence+summary.carry_forward_pence,0);assert.equal(summary.estimated_total_pence,10000);
   await work('invoice_state',{batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',status:'paid',settlement_kind:'payment'});await work('bind_item',{batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',item:'ii_fixture'});assert.equal((await q('select status from jovabook_private.commission_batches where id=$1',[batch.id])).rows[0].status,'paid');assert.equal((await work('summary')).unpaid_invoiced_pence,0);
  });
  await t.test('late cancellation creates one exact original-price credit; verified balance credit is applied to next estimate, never a second invoice item',async()=>{
   await q("update bookings set status='cancelled' where salon_id=$1 and id='old'",[salon]);await work('accrue');await work('accrue');const credit=(await q("select * from jovabook_private.commission_entries where booking_id='old' and kind='cancellation_credit'")).rows;assert.equal(credit.length,1);assert.equal(credit[0].amount_minor,-50);assert.equal((await work('summary')).available,false);
   const action=await work('credit_reserve',{entry:credit[0].id,batch:batch.id,invoice:batch.invoice_id,customer:'cus_fixture',line:'il_commission',amount:50,credit_amount:50});assert.equal(Number(action.amount_minor),50);
   await work('credit_finish',{entry:credit[0].id,invoice:batch.invoice_id,customer:'cus_fixture',note:'cn_fixture'});const summary=await work('history',{...historyBody,customer_credit_minor:50});assert.equal(summary.estimated_total_pence,9950);assert.equal(summary.customer_credit_pence,50);assert.equal(summary.new_commission_pence+summary.carry_forward_pence,0);
   const deposit=(await q("select deposit from bookings where salon_id=$1 and id='noshow'",[salon])).rows[0].deposit;assert.equal(Number(deposit),10,'no-show commission waiver never refunds or changes customer deposits');
  });
  await t.test('deleting an owner diary row cannot erase an occurred-service price snapshot or cause another booking charge',async()=>{
   await q("delete from bookings where salon_id=$1 and id='recent'",[salon]);await work('accrue');assert.equal((await q("select count(*)::int n from jovabook_private.commission_entries where booking_id='recent' and kind='service'")).rows[0].n,1);assert.equal((await q("select amount_minor from jovabook_private.commission_entries where booking_id='recent' and kind='service'")).rows[0].amount_minor,25);
   assert.equal((await q("select count(*)::int n from jovabook_private.commission_booking_events where booking_id='recent'")).rows[0].n,2);
  });
  await t.test('rescheduling a past confirmed slot five months ahead voids its unbilled old occurrence and does not bill the future slot now',async()=>{
   await make('rescheduled',past(4),50);await work('accrue');assert.equal((await q("select amount_minor from jovabook_private.commission_entries where booking_id='rescheduled' and kind='service'")).rows[0].amount_minor,50);
   await q("update bookings set date=($1::timestamptz at time zone 'Europe/London')::date,time=to_char($1::timestamptz at time zone 'Europe/London','HH24:MI') where salon_id=$2 and id='rescheduled'",[future(150),salon]);await work('accrue');
   const old=(await q("select * from jovabook_private.commission_entries where booking_id='rescheduled' and kind='service'")).rows;assert.equal(old.length,1);assert.equal(old[0].status,'void');assert.equal((await q("select count(*)::int n from jovabook_private.commission_entries where booking_id='rescheduled' and status='open'")).rows[0].n,0);
  });
  await t.test('a paid rescheduled occurrence gets one linked reversal; the later occurrence uses its own service-time tier',async()=>{
   await make('paid-move',past(6),100);await work('accrue');const moved=await work('reserve',{customer:'cus_fixture',subscription:'sub_fixture',invoice:'in_moved',cutoff:iso(future(24))});assert.equal(Number(moved.amount_minor),100);await work('bind_item',{batch:moved.id,invoice:moved.invoice_id,customer:'cus_fixture',item:'ii_moved'});await work('invoice_state',{batch:moved.id,invoice:moved.invoice_id,customer:'cus_fixture',status:'paid',settlement_kind:'payment'});
   await q("update bookings set date=($1::timestamptz at time zone 'Europe/London')::date,time=to_char($1::timestamptz at time zone 'Europe/London','HH24:MI') where salon_id=$2 and id='paid-move'",[future(150),salon]);await work('accrue');await work('accrue');let entries=(await q("select kind,amount_minor,status,service_at from jovabook_private.commission_entries where booking_id='paid-move' order by kind")).rows;assert.equal(entries.length,2);assert.equal(entries.find(e=>e.kind==='cancellation_credit').amount_minor,-100);assert.equal(entries.filter(e=>e.kind==='service').length,1);
   // Compress the later fixture timeline to an already elapsed paid Premium
   // occurrence. Only the isolated historical snapshots are moved, never a
   // production clock or client-controlled timestamp in the implementation.
   await db.exec('alter table bookings disable trigger commission_booking_event');await q("update bookings set date=($1::timestamptz at time zone 'Europe/London')::date,time=to_char($1::timestamptz at time zone 'Europe/London','HH24:MI') where salon_id=$2 and id='paid-move'",[past(1),salon]);await db.exec('alter table bookings enable trigger commission_booking_event');
   await q("update jovabook_private.commission_booking_events set service_at=(select jovabook_private.sms_start(b) from bookings b where b.salon_id=$1 and b.id='paid-move'),observed_at=(select jovabook_private.sms_start(b)-interval '1 hour' from bookings b where b.salon_id=$1 and b.id='paid-move') where id=(select max(id) from jovabook_private.commission_booking_events where salon_id=$1 and booking_id='paid-move')",[salon]);await work('accrue');await work('accrue');entries=(await q("select * from jovabook_private.commission_entries where booking_id='paid-move'")).rows;assert.equal(entries.filter(e=>e.kind==='service').length,2);assert.equal(entries.filter(e=>e.kind==='cancellation_credit').length,1);assert.equal(entries.find(e=>e.kind==='service'&&e.status==='open').amount_minor,0);assert.equal(entries.find(e=>e.kind==='service'&&e.status==='open').rate_bps,0);
  });
  await t.test('restoring a voided service instant is held for review instead of silently omitting or duplicating commission',async()=>{
   const original=(await q("select service_at from jovabook_private.commission_entries where booking_id='rescheduled' and kind='service'")).rows[0].service_at;
   await q("update bookings set date=($1::timestamptz at time zone 'Europe/London')::date,time=to_char($1::timestamptz at time zone 'Europe/London','HH24:MI') where salon_id=$2 and id='rescheduled'",[original,salon]);
   const summary=await work('accrue');assert.equal(summary.available,false);assert.equal((await work('context')).review_required,true);
   assert.equal((await q('select jovabook_private.billing_customer_pending($1) pending',[salon])).rows[0].pending,true);
   assert.equal((await q("select review_required from jovabook_private.commission_entries where booking_id='rescheduled'")).rows[0].review_required,true);
   await assert.rejects(work('reserve',{customer:'cus_fixture',subscription:'sub_fixture',invoice:'in_restore',cutoff:iso(future(25))}),/occurrence requires review/);
   await q("update bookings set status='confirmed' where salon_id=$1 and id='old'",[salon]);await work('accrue');
   assert.equal((await q("select review_required from jovabook_private.commission_entries where booking_id='old' and kind='service'")).rows[0].review_required,true);
   assert.equal((await q("select count(*)::int n from jovabook_private.commission_entries where booking_id='old'")).rows[0].n,2,'reopening a paid credited occurrence creates no replacement charge or duplicate credit');
  });
  await t.test('unknown historical tier blocks deletion and retains a non-PII aggregate even for an explicit administrator cascade',async()=>{
   await make('unknown-history',past(20),50);await work('accrue');const unknown=(await q("select * from jovabook_private.commission_entries where booking_id='unknown-history'")).rows[0];assert.equal(unknown.status,'needs_history');assert.equal(unknown.amount_minor,null);assert.equal((await q('select jovabook_private.billing_customer_pending($1) pending',[salon])).rows[0].pending,true);await q('delete from salons where id=$1',[salon]);const retained=(await q('select * from jovabook_private.commission_retention_audit where salon_id=$1',[salon])).rows[0];assert.equal(retained.unresolved_occurrences,3);assert.equal(Number(retained.unresolved_full_price_minor),15000);assert(!JSON.stringify(retained).includes('fictional@example.test'));
  });
 }finally{await db.close();}
});
