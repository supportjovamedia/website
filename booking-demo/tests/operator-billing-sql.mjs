/* Full isolated SQL schema, fictional financial records, no provider transport. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bootstrap,sources,installOfflineGuard} from '../../scripts/jovabook-test-db.mjs';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const operator='10000000-0000-4000-8000-000000000010',customer='10000000-0000-4000-8000-000000000011';
const trial='20000000-0000-4000-8000-000000000001',ended='20000000-0000-4000-8000-000000000002';
const paid='20000000-0000-4000-8000-000000000020',past='20000000-0000-4000-8000-000000000021',cancelled='20000000-0000-4000-8000-000000000022';
installOfflineGuard();
test('operator account and commission records distinguish trial, paid, settlement and unknown history',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0].data;
 const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(id?'set role authenticated':'set role anon');};
 const summary=async id=>value('select operator_billing_summary($1) data',[id]);
 const batch=async(invoice,amount,status,settlement=null)=>{
  const result=await q("insert into jovabook_private.commission_batches(salon_id,invoice_id,customer_id,subscription_id,cutoff,amount_minor,entry_count,digest,status,settlement_kind,collection_state) values($1,$2,'cus_PRIVATE','sub_PRIVATE',now()-$3::int*interval '1 day',$4,1,$2,$5,$6,$7) returning id",[paid,invoice,amount,amount,status,settlement,status==='paid'?'paid':'not_started']);return result.rows[0].id;
 };
 const entry=async(name,amount,status,kind='service')=>(await q("insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,status) values($1,$2,$3,now()-interval '2 days',5000,100,$4,$5) returning id",[paid,name,kind,amount,status])).rows[0].id;
 const credit=async(batchId,name,amount)=>{const id=await entry(name,-amount,'paid','cancellation_credit');await q("insert into jovabook_private.commission_credit_actions(entry_id,batch_id,invoice_id,line_id,customer_id,amount_minor,credit_amount,provider_id,status) select $1::uuid,id,invoice_id,'il_PRIVATE','cus_PRIVATE',$3,$3,'cn_'||($1::uuid)::text,'issued' from jovabook_private.commission_batches where id=$2",[id,batchId,amount]);};
 let paidBatch,invoicedBatch,reservedBatch;
 try{
  await bootstrap(db,await sources());
  await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[operator,'support.jovamedia@gmail.com',customer,'fictional-customer@example.test']);
  await as(customer);await q("select portal_identity('customer')");await db.exec('reset role');
  await q("update jovabook_private.billing_accounts set trial_ends_at=now()-interval '1 day' where salon_id=$1",[ended]);
  for(const [index,id,plan] of [[20,paid,'essential'],[21,past,'standard'],[22,cancelled,'premium']]){
   const owner='10000000-0000-4000-8000-'+String(index).padStart(12,'0');await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[owner,'account-'+index+'@example.test']);
   await q("insert into public.salons(id,owner_id,name,slug,owner_name,email,status) values($1,$2,$3,$4,'PRIVATE OWNER',$5,'active')",[id,owner,'Fictional Business '+index,'fictional-billing-'+index,index===20?'business-contact@example.test':'account-'+index+'@example.test']);
   await q("update jovabook_private.billing_accounts set ever_paid=true,paid_plan=$2,paid_until=now()+interval '20 days',provider_status='active',last_verified_at=now(),commission_terms_version='2026-11-01-appointment-v1',commission_terms_accepted_at=now()-interval '20 days' where salon_id=$1",[id,plan]);
  }
  await q("update jovabook_private.billing_accounts set paid_until=now()-interval '2 days',failed_at=now()-interval '2 days',provider_status='past_due' where salon_id=$1",[past]);
  await q("update jovabook_private.billing_accounts set paid_until=now()-interval '1 day',provider_status='canceled' where salon_id=$1",[cancelled]);
  await q("update jovabook_private.commission_config set enabled=true,enabled_at=now()-interval '30 days'");
  await q("insert into jovabook_private.commission_periods(salon_id,customer_id,subscription_id,period_start,period_end,next_plan,customer_credit_minor,cadence,next_cadence,subscription_period_start,subscription_period_end) values($1,'cus_PRIVATE','sub_PRIVATE',now()-interval '10 days',now()+interval '20 days','essential',0,'annual','annual',now()-interval '3 months',now()+interval '9 months')",[paid]);
  await q("insert into jovabook_private.commission_summaries(salon_id,summary) values($1,$2)",[paid,JSON.stringify({available:true,subscription_amount_pence:0,new_commission_pence:30,carry_forward_pence:20,customer_credit_pence:0,estimated_total_pence:50,unpaid_invoiced_pence:175,secret:'PRIVATE CACHE',customer_id:'cus_PRIVATE'})]);
  paidBatch=await batch('in_PRIVATE_PAID',100,'paid','payment');await credit(paidBatch,'paid-credit',50);
  invoicedBatch=await batch('in_PRIVATE_OPEN',200,'invoiced');await credit(invoicedBatch,'invoiced-credit',25);
  reservedBatch=await batch('in_PRIVATE_RESERVED',40,'reserved');
  const allocated=await entry('allocated-fee',100,'paid');await q('insert into jovabook_private.commission_allocations(batch_id,entry_id) values($1,$2)',[paidBatch,allocated]);
  await entry('unbilled-recent',30,'open');await entry('unbilled-carry',20,'open');await q("update jovabook_private.commission_entries set service_at=now()-interval '20 days' where booking_id='unbilled-carry'");await entry('reserved-fee',40,'reserved');

  await t.test('paid tier counts exclude all trials and expose active paid and ended trial counts separately',async()=>{
   await as(operator);const overview=await value('select operator_overview() data');assert.equal(overview.total,5);assert.equal(overview.essential,1);assert.equal(overview.standard,1);assert.equal(overview.premium,1);assert.equal(overview.paid_total,3);assert.equal(overview.paid_active,1);assert.equal(overview.trials_total,2);assert.equal(overview.trials_active,1);assert.equal(overview.trials_ended,1);assert.equal(overview.commission.settled_minor,50);assert.equal(overview.commission.invoiced_outstanding_minor,175);assert.equal(overview.commission.unbilled_minor,50);assert.equal(overview.commission.businesses_available,1);assert.equal(overview.commission.businesses_unavailable,4);await db.exec('reset role');
  });
  await t.test('directory searches authoritative owner email and distinguishes business email and recorded billing states',async()=>{
   await db.exec("alter table auth.users add column raw_user_meta_data jsonb default '{}' ");await q("update auth.users set raw_user_meta_data=jsonb_build_object('email','forged@example.test') where email='account-20@example.test'");await as(operator);
   const rows=(await value('select operator_businesses() data')).businesses;assert.equal(rows.find(r=>r.id===trial).billing_state,'trial');assert.equal(rows.find(r=>r.id===ended).billing_state,'trial_ended');assert.equal(rows.find(r=>r.id===paid).billing_state,'paid');assert.equal(rows.find(r=>r.id===past).billing_state,'past_due');assert.equal(rows.find(r=>r.id===cancelled).billing_state,'cancelled');
   const row=(await value("select operator_businesses('ACCOUNT-20@EXAMPLE.TEST') data")).businesses[0];assert.equal(row.id,paid);assert.equal(row.account_email,'account-20@example.test');assert.equal(row.business_email,'business-contact@example.test');assert.equal(row.has_paid,true);assert.equal((await value("select operator_businesses('forged@example.test') data")).businesses.length,0);assert.equal(rows.find(r=>r.id===past).business_email,null);assert.equal((await value("select operator_businesses('business-contact') data")).businesses.length,1);await db.exec('reset role');
  });
  await t.test('issued credits reduce settled and invoiced totals; allocated and reserved entries are never unbilled twice',async()=>{
   await as(operator);const data=await summary(paid);assert.equal(data.commission.settled_gross_minor,100);assert.equal(data.commission.settled_minor,50);assert.equal(data.commission.issued_credits_minor,75);assert.equal(data.commission.invoiced_outstanding_minor,175);assert.equal(data.commission.unbilled_minor,50);assert.equal(data.commission.cash_collected_minor,null);assert.equal(data.commission.cash_collected_available,false);assert.equal(data.batches.length,3);assert(data.batches.some(b=>b.local_status==='reserved'));assert.equal(data.estimate.available,false);assert.equal(data.estimate.estimated_total_pence,null);
   const serialized=JSON.stringify(data);for(const secret of ['cus_PRIVATE','sub_PRIVATE','in_PRIVATE','il_PRIVATE','cn_','PRIVATE CACHE','booking_id','full_price_minor','provider_item_id'])assert(!serialized.includes(secret),secret);assert.match(data.batches[0].invoice_reference,/^invoice_[a-f0-9]{64}$/);assert(data.batches.every(b=>!('paid_at' in b)&&!('due_at' in b)));await db.exec('reset role');
  });
  await t.test('repeat registration without a trial is payment-required and scheduled cancellation preserves paid coverage',async()=>{
   await q('update jovabook_private.billing_accounts set trial_started_at=null,trial_ends_at=null where salon_id=$1',[ended]);await q('update jovabook_private.billing_accounts set cancel_at_period_end=true where salon_id=$1',[paid]);await as(operator);const rows=(await value('select operator_businesses() data')).businesses;assert.equal(rows.find(r=>r.id===ended).billing_state,'payment_required');assert.equal(rows.find(r=>r.id===paid).billing_state,'paid');assert.equal(rows.find(r=>r.id===paid).cancel_at_period_end,true);const overview=await value('select operator_overview() data');assert.equal(overview.trials_total,1);assert.equal(overview.paid_total,3);await db.exec('reset role');
  });
  await t.test('read paths preserve annual prepaid estimates, show statement freshness and never refresh a ledger',async()=>{
   await q("update jovabook_private.commission_batches set status='void' where id=$1",[reservedBatch]);const before=(await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n;await as(operator);let data=await summary(paid);assert.equal(data.estimate.available,true);assert.equal(data.estimate.subscription_amount_pence,0);assert.equal(data.estimate.estimated_total_pence,50);assert.equal(data.estimate.cadence,'annual');assert.equal(data.estimate.commission_cadence,'monthly');await db.exec('reset role');assert.equal((await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n,before);
   await q("update jovabook_private.commission_summaries set updated_at=now()-interval '25 hours' where salon_id=$1",[paid]);await as(operator);data=await summary(paid);assert.equal(data.estimate.stale,true);assert.equal(data.estimate.available,false);assert.equal(data.estimate.new_commission_pence,null);const noLedger=await summary(trial);assert.equal(noLedger.commission.available,false);assert.equal(noLedger.commission.unbilled_minor,null);assert.equal(noLedger.estimate.available,false);await db.exec('reset role');
  });
  await t.test('unknown historical commission remains null and makes overview totals explicitly incomplete',async()=>{
   await entry('unknown-history',null,'needs_history');await as(operator);const data=await summary(paid);assert.equal(data.commission.unresolved_count,1);assert.equal(data.commission.unbilled_minor,null);assert.equal(data.commission.available,false);assert.equal(data.commission.invoiced_outstanding_minor,175);const overview=await value('select operator_overview() data');assert.equal(overview.commission.unresolved_count,1);assert.equal(overview.commission.unbilled_minor,null);assert.equal(overview.commission.businesses_unavailable,5);await db.exec('reset role');
  });
  await t.test('business detail adds only authorised account contact and projected financial records',async()=>{
   await as(operator);const data=await value('select operator_business($1) data',[paid]);assert.equal(data.business.account_email,'account-20@example.test');assert.equal(data.business.business_email,'business-contact@example.test');assert.equal(data.business.has_paid,true);assert.equal(data.business.commission.unresolved_count,1);assert.equal(data.billing_summary.ok,true);for(const secret of ['PRIVATE OWNER','cus_PRIVATE','sub_PRIVATE','in_PRIVATE','PRIVATE CACHE','raw_user_meta_data'])assert(!JSON.stringify(data).includes(secret),secret);await assert.rejects(summary('20000000-0000-4000-8000-999999999999'));await db.exec('reset role');
  });
  await t.test('selected business financial projections exclude another business ledger entirely',async()=>{
   await q("insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,status) values($1,'PRIVATE FOREIGN BOOKING','service',now()-interval '1 day',99900,100,999,'open')",[past]);await as(operator);const foreign=await summary(past),selected=await summary(paid);assert.equal(foreign.commission.unbilled_minor,999);assert.equal(selected.commission.settled_minor,50);assert.equal(selected.commission.invoiced_outstanding_minor,175);assert.equal(selected.commission.unresolved_count,1);assert(!JSON.stringify(selected).includes('PRIVATE FOREIGN BOOKING'));await db.exec('reset role');
  });
  await t.test('future online commission is pending, becomes due after its time, and excludes trials, Premium and cancellations',async()=>{
   await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)");
   await db.exec('alter table bookings disable trigger owner_experience_booking_schedule');const position=()=>value('select jovabook_private.operator_billing_record($1,false) data',[paid]);const before=(await position()).commission;
   await q("update jovabook_private.billing_accounts set commission_terms_version='2026-11-02-online-origin-v3',trial_started_at=null,trial_ends_at=null where salon_id=$1",[paid]);await q("insert into staff(salon_id,id,name) values($1,'projection','Fixture')",[paid]);await q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'projection','Fixture',1,30,array['projection'])",[paid]);
   await q("insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end) values($1,'in_projection','il_projection','sub_PRIVATE','essential',now()-interval '1 day',now()+interval '10 days')",[paid]);
   await q("select set_config('jovabook.online_booking','trusted',false)");
   await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source) values($1,'projection','projection','Fixture',1,30,current_date+2,'12:00','projection','Customer','customer@example.test','confirmed','Online')",[paid]);
   await q("select set_config('jovabook.online_booking','',false)");
   assert.equal((await position()).commission.pending_minor,1);assert.equal((await position()).commission.due_minor,before.due_minor);
   await q("update jovabook_private.commission_plan_history set plan='premium' where salon_id=$1 and line_id='il_projection'",[paid]);assert.equal((await position()).commission.pending_minor,0);
   await q("update jovabook_private.commission_plan_history set plan='essential' where salon_id=$1 and line_id='il_projection'",[paid]);
   await q("update jovabook_private.billing_accounts set trial_started_at=now()-interval '1 day',trial_ends_at=now()+interval '4 days' where salon_id=$1",[paid]);assert.equal((await position()).commission.pending_minor,0);
   await q("update jovabook_private.billing_accounts set trial_started_at=null,trial_ends_at=null where salon_id=$1",[paid]);
   await q("update jovabook_private.commission_origins set current_start=now()-interval '1 second' where salon_id=$1 and booking_id='projection'",[paid]);
   const due=(await position()).commission;assert.equal(due.pending_minor,0);assert.equal(due.due_minor,before.due_minor+1);
   await q("update jovabook_private.commission_origins set decision='waived' where salon_id=$1 and booking_id='projection'",[paid]);assert.equal((await position()).commission.due_minor,before.due_minor);
   await q("update jovabook_private.commission_origins set decision='pending',source='Manual' where salon_id=$1 and booking_id='projection'",[paid]);assert.equal((await position()).commission.due_minor,before.due_minor);
  });
  await t.test('cancelled trials show cancelled immediately and leave the active-trial count',async()=>{
   await db.exec('reset role');await q("update jovabook_private.billing_accounts set cancel_at_period_end=true where salon_id=$1",[trial]);await as(operator);
   const directory=await value('select operator_businesses() data');assert.equal(directory.businesses.find(b=>b.id===trial).billing_state,'trial_cancelled');const overview=await value('select operator_overview() data');assert.equal(overview.trials_active,0);assert.equal(overview.trials_cancelled,1);
   await db.exec('reset role');await q("update jovabook_private.billing_accounts set cancel_at_period_end=false where salon_id=$1",[trial]);
  });
  await t.test('anonymous, customer and owner roles cannot query billing helpers or operator records',async()=>{
   for(const id of [null,customer,'10000000-0000-4000-8000-000000000001']){await as(id);await assert.rejects(summary(paid));await assert.rejects(q('select operator_overview()'));await assert.rejects(q('select operator_businesses()'));await assert.rejects(q('select operator_business($1)',[paid]));for(const table of ['billing_accounts','commission_entries','commission_batches','commission_credit_actions'])await assert.rejects(q('select * from jovabook_private.'+table));await assert.rejects(q('select jovabook_private.operator_billing_record($1,true)',[paid]));await assert.rejects(q('select jovabook_private.operator_business_record($1)',[paid]));}await db.exec('reset role');
  });
  await t.test('operator revocation and unverified Auth status immediately block financial reads',async()=>{
   await q('update auth.users set email_confirmed_at=null where id=$1',[operator]);await as(operator);await assert.rejects(summary(paid));await db.exec('reset role');await q('update auth.users set email_confirmed_at=now(),email=$1 where id=$2',['former-support@example.test',operator]);await as(operator);await assert.rejects(q('select operator_businesses()'));await db.exec('reset role');
  });
 }finally{await db.close();}
});
