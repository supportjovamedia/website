import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101005929_jovabook_customer_portal.sql'];
const source=await Promise.all(files.map(f=>readFile(new URL('../supabase/'+f,import.meta.url),'utf8')));
const owner='10000000-0000-4000-8000-000000000001',otherOwner='10000000-0000-4000-8000-000000000002',client='10000000-0000-4000-8000-000000000003',unverified='10000000-0000-4000-8000-000000000004';
const sid='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',token='c'.repeat(64);
test('customer portal uses verified tenant identities and server cancellation/refund rules',async t=>{
 const db=new PGlite(),q=(s,p=[])=>db.query(s,p),as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(id?'set role authenticated':'set role anon');};
 const value=async(s,p=[])=>(await q(s,p)).rows[0].data;
 const work=(action,payload={})=>value('select customer_portal_worker($1,$2,$3) data',[token,action,JSON.stringify(payload)]);
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(const [id,email,verified] of [[owner,'owner@example.test',true],[otherOwner,'otherowner@example.test',true],[client,'client@example.test',true],[unverified,'unverified@example.test',false]])await q('insert into auth.users values($1,$2,$3)',[id,email,verified?new Date():null]);
  for(const s of source)await db.exec(s);
  for(const [id,uid,slug] of [[sid,owner,'business-a'],[other,otherOwner,'business-b']]){
   await q("insert into salons(id,owner_id,name,slug,owner_name,email,status,settings) values($1,$2,$3,$3,'Owner',$4,'active',$5)",[id,uid,slug,slug+'@example.test',JSON.stringify({timezone:'Europe/London',hours:{start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]},notice:0})]);
   await q("insert into staff(salon_id,id,name) values($1,'staff','Staff')",[id]);
   await q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'service','Consultation',25,30,array['staff'])",[id]);
  }
  const make=async(id,when,email='client@example.test',business=sid,status='confirmed',deposit=0)=>{await q(`insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,deposit,notes) values($1,$2,'service','Consultation',25,30,($3::timestamptz at time zone 'Europe/London')::date,to_char($3::timestamptz at time zone 'Europe/London','HH24:MI'),'staff','Client',$4,'confirmed',$5,'OWNER PRIVATE NOTE')`,[business,id,when,email,deposit]);if(status!=='confirmed')await q('update bookings set status=$1 where salon_id=$2 and id=$3',[status,business,id]);};
  // Keep every 30-minute fixture inside one working day regardless of the CI clock.
  // Near stays inside the cancellation cutoff; future and its offsets stay beyond it.
  const {future,near}=(await q(`select
   (((now() at time zone 'Europe/London')::date+3)+time '12:00') at time zone 'Europe/London' as future,
   date_trunc('hour',now())+interval '2 hours' as near`)).rows[0];
  const b='bk_'+'a'.repeat(32),short='bk_'+'b'.repeat(32),foreign='bk_'+'c'.repeat(32),elsewhere='bk_'+'d'.repeat(32),noshow='bk_'+'e'.repeat(32);
  await make(b,future,undefined,undefined,undefined,10);await make(short,near);await make(foreign,new Date(+future+3600000),'somebody@example.test');await make(elsewhere,future,undefined,other);await make(noshow,new Date(+future+7200000),undefined,undefined,'no-show',10);
  await t.test('unverified registration cannot create membership or claim bookings',async()=>{await as(unverified);await assert.rejects(q("select customer_portal_register('business-a','First','Last','07700 900123')"),/Verify your email/);await assert.rejects(q("select customer_portal_bookings('business-a')"),/verify your email/);});
  await t.test('verified membership returns only this business and exact verified email, without owner notes',async()=>{await as(client);await value("select customer_portal_register('business-a','First','Last','07700 900123') data");const list=await value("select customer_portal_bookings('business-a') data");assert.equal(list.bookings.length,3);assert(!JSON.stringify(list).includes('OWNER PRIVATE'));assert(!JSON.stringify(list).includes(elsewhere));assert(!JSON.stringify(list).includes(foreign));assert.equal(list.bookings.find(x=>x.id===b).can_cancel,true);assert.equal(list.bookings.find(x=>x.id===short).can_cancel,false);await assert.rejects(q("select customer_portal_bookings('business-b')"),/Log in/);await assert.rejects(q('select * from salons'),/permission denied/);});
  const cancel=id=>value("select customer_portal_cancel('business-a',$1,gen_random_uuid()) data",[id]);
  await t.test('forged booking IDs, inside24h and no-shows cannot cancel or create refunds',async()=>{assert.equal((await cancel(foreign)).ok,false);assert.equal((await cancel(elsewhere)).ok,false);assert.equal((await cancel(short)).ok,false);assert.equal((await cancel(noshow)).ok,false);await db.exec('reset role');assert.equal((await q('select count(*)::int n from jovabook_private.customer_refunds')).rows[0].n,0);});
  await t.test('verified captured deposit queues exactly one refund, retries do not duplicate mail/refund',async()=>{await q("insert into jovabook_private.customer_deposits(salon_id,booking_id,payment_intent,account_id,amount,currency,captured_at) values($1,$2,'pi_verified','acct_merchant',1000,'gbp',now())",[sid,b]);await as(client);assert.equal((await cancel(b)).booking.refund_status,'requested');assert.equal((await cancel(b)).ok,true);await db.exec('reset role');assert.equal((await q('select count(*)::int n from jovabook_private.customer_refunds')).rows[0].n,1);assert.equal((await q("select count(*)::int n from email_log where kind='cancelled'")).rows[0].n,1);});
  await t.test('guest capability follows24h rule and public reschedule RPC cannot change booking',async()=>{await as(null);assert.equal((await value("select get_booking('business-a',$1) data",[short])).can_cancel,false);assert.equal((await value("select cancel_booking('business-a',$1) data",[short])).ok,false);assert.equal((await value("select reschedule_booking('business-a',$1,'2030-01-01','10:00') data",[short])).ok,false);});
  await t.test('private payment data and worker reject customer/anonymous access',async()=>{await as(client);await assert.rejects(q('select * from jovabook_private.customer_deposits'),/permission denied/);await as(null);await assert.rejects(q("select customer_portal_worker('bad','refund_claim','{}')"),/Invalid customer worker/);await db.exec('reset role');await q("update jovabook_private.customer_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);assert.equal(await work('refund_claim'),null);});
  await t.test('recovery checks exact existing membership and persists hourly limits before sending',async()=>{await q('update jovabook_private.customer_config set recovery_enabled=true');assert.equal((await work('recovery',{email:'unknown@example.test',salon:'business-a',network:'n1'})).send,false);for(let n=0;n<3;n++)assert.equal((await work('recovery',{email:'CLIENT@example.test',salon:'business-a',network:'n1'})).send,true);assert.equal((await work('recovery',{email:'client@example.test',salon:'business-a',network:'n1'})).send,false);assert.equal((await work('recovery',{email:'owner@example.test',salon:'business-a',network:'n1'})).send,false);const rows=(await q('select * from jovabook_private.customer_recovery_limits')).rows;assert(!JSON.stringify(rows).includes('@'));});
  await t.test('payment setup stays bound to one verified customer, merchant and canonical unfinished action',async()=>{
   await q('update jovabook_private.customer_config set payments_enabled=true');
   await q("insert into jovabook_private.customer_payment_accounts values($1,'acct_merchant',true)",[sid]);
   assert.equal(await work('payment_context',{salon_id:sid,user_id:unverified}),null);
   const actor={salon_id:sid,user_id:client,account_id:'acct_merchant'};
   await assert.rejects(work('bind_payment_customer',{...actor,account_id:'acct_foreign',customer_id:'cus_1'}),/account changed/);
   await work('bind_payment_customer',{...actor,customer_id:'cus_1'});
   await assert.rejects(work('bind_payment_customer',{...actor,customer_id:'cus_2'}),/binding changed/);
   const first=await work('payment_begin',{...actor,request_id:'30000000-0000-4000-8000-000000000001',hash:'d'.repeat(64)});
   const duplicate=await work('payment_begin',{...actor,request_id:'30000000-0000-4000-8000-000000000002',hash:'d'.repeat(64)});
   assert.equal(duplicate.id,first.id);
   await work('payment_finish',{...actor,id:first.id,provider_id:'cs_test_one',url:'https://checkout.stripe.com/c/pay/test'});
   await assert.rejects(work('payment_finish',{...actor,id:first.id,provider_id:'cs_test_other',url:'https://checkout.stripe.com/c/pay/other'}),/result changed/);
   const card={brand:'visa',last4:'4242',exp_month:12,exp_year:2030};
   await assert.rejects(work('payment_complete',{...actor,id:first.id,provider_id:'cs_test_one',status:'complete',payment_method_id:'pm_1',card:{...card,number:'never-store-card-number'}}),/check constraint/);
   await work('payment_complete',{...actor,id:first.id,provider_id:'cs_test_one',status:'complete',payment_method_id:'pm_1',card});
   const context=await work('payment_status_context',{salon_id:sid,user_id:client});assert.deepEqual(context.card,card);assert.equal(context.actions.length,0);assert.equal(context.can_setup,true);
   const next=await work('payment_begin',{...actor,request_id:'30000000-0000-4000-8000-000000000003',hash:'d'.repeat(64)});assert.notEqual(next.id,first.id);
   await work('payment_complete',{...actor,id:next.id,provider_id:'cs_test_expired',status:'expired'});
  });
  await t.test('deleting a booking cannot erase its captured payment and pending refund records',async()=>{
   await assert.rejects(q('delete from public.bookings where salon_id=$1 and id=$2',[sid,b]),/payment record/);
   assert.equal((await q('select count(*)::int n from jovabook_private.customer_refunds')).rows[0].n,1);
   assert.equal((await q('select count(*)::int n from jovabook_private.customer_deposits')).rows[0].n,1);
  });
  await t.test('refund attempt is one-way and billing lock preserves existing customer refund rights',async()=>{const first=await work('refund_claim');assert.equal(first.amount,1000);assert.equal(first.account_id,'acct_merchant');assert.equal(await work('refund_claim'),null);await work('refund_finish',{id:first.id,lease:first.lease,status:'pending',provider_id:'re_1'});await as(client);assert.equal((await value("select customer_portal_bookings('business-a') data")).bookings.find(x=>x.id===b).refund_status,'pending');await db.exec('reset role');await q("update jovabook_private.billing_accounts set trial_ends_at=now()-interval '1 day' where salon_id=$1",[sid]);assert.equal((await work('payment_status_context',{salon_id:sid,user_id:client})).can_setup,false);assert.equal(await work('payment_context',{salon_id:sid,user_id:client}),null);await as(client);assert.equal((await value("select customer_portal_bookings('business-a') data")).bookings.length,3);assert.equal((await q('select count(*)::int n from customer_portal_memberships')).rows[0].n,1);});
  await t.test('an eligible cancellation before capture still queues one refund when verified capture arrives',async()=>{
   await db.exec('reset role');const late='bk_'+'f'.repeat(32);await make(late,new Date(+future+4*3600000),undefined,other,'confirmed',10);
   await as(null);assert.equal((await value("select cancel_booking('business-b',$1) data",[late])).ok,true);
   await db.exec('reset role');await assert.rejects(q('delete from bookings where salon_id=$1 and id=$2',[other,late]),/payment record/);
   await q("insert into jovabook_private.customer_deposits(salon_id,booking_id,payment_intent,account_id,amount,currency,captured_at) values($1,$2,'pi_late','acct_other',1000,'gbp',now())",[other,late]);
   assert.equal((await q('select count(*)::int n from jovabook_private.customer_refunds where salon_id=$1 and booking_id=$2',[other,late])).rows[0].n,1);
   assert.equal((await q('select status from bookings where salon_id=$1 and id=$2',[other,late])).rows[0].status,'cancelled');
  });
 }finally{await db.close();}
});
