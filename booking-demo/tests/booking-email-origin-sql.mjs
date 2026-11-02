import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101005929_jovabook_customer_portal.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql','migrations/20261101054615_jovabook_commission_supervisor.sql','migrations/20261102160000_jovabook_online_origin.sql','migrations/20261102161000_operator_commission_review.sql','migrations/20261102161500_commission_pattern_alerts.sql','migrations/20261102190000_booking_origin_upsert.sql'];
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001',token='d'.repeat(64);
test('booking upserts and manual owner-email rules run in isolated PostgreSQL',async t=>{
 const db=new PGlite(),q=(s,p=[])=>db.query(s,p),work=async(action,payload={})=>(await q('select booking_commission_worker($1,$2,$3) data',[token,action,JSON.stringify({salon,...payload})])).rows[0].data;
 const get=async id=>(await q('select * from jovabook_private.commission_entries where booking_id=$1 order by kind',[id])).rows;
 try{
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const f of files)await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 await q('insert into auth.users(id,email) values($1,$2)',[owner,'owner@example.test']);
 await q("insert into salons(id,owner_id,name,slug,owner_name,email,status,settings) values($1,$2,'Fixture','fixture','Owner','owner@example.test','active',$3)",[salon,owner,JSON.stringify({timezone:'Europe/London',hours:{start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]}})]);
 await q("insert into staff(salon_id,id,name) values($1,'staff','Staff')",[salon]);await q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'svc','Service',100,30,array['staff'])",[salon]);
 await q("update jovabook_private.billing_accounts set ever_paid=true,paid_plan='standard',paid_until=now()+interval '30 days',customer_id='cus_fixture',subscription_id='sub_fixture',commission_terms_version='2026-11-02-online-origin-v3',commission_terms_accepted_at=now()-interval '30 days',trial_started_at=now()-interval '60 days',trial_ends_at=now()-interval '50 days' where salon_id=$1",[salon]);
 await q("update jovabook_private.commission_config set enabled=true,enabled_at=now()-interval '30 days',invoice_enabled=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
 await q("insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end) values($1,'in_standard','il_standard','sub_fixture','standard',now()-interval '30 days',now()+interval '30 days')",[salon]);
 await db.exec('alter table bookings disable trigger owner_experience_booking_schedule');
 const make=async(id,manual=false,future=false)=>{
 await q("select set_config('request.jwt.claim.sub',$1,false)",[manual?owner:'']);await q("select set_config('jovabook.online_booking',$1,false)",[manual?'':'trusted']);
 await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source,deposit) values($1,$2,'svc','Service',100,30,current_date+$3::int,'12:00','staff','Test','test@example.test','confirmed',$4,0)",[salon,id,future?3:-2,manual?'Manual':'Online']);
 await q("select set_config('request.jwt.claim.sub','',false)");await q("select set_config('jovabook.online_booking','',false)");
 };

 const upsert=(id,day=6)=>q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source,deposit) values($1,$2,'svc','Service',25,30,current_date+$3::int,'13:00','staff','Test','test@example.test','confirmed','Manual',0) on conflict(salon_id,id) do update set date=excluded.date,time=excluded.time,price=excluded.price,source=excluded.source",[salon,id,day]);
 await t.test('real online and manual upserts preserve one immutable original snapshot',async()=>{
 await make('online-edit',false,true);await make('manual-edit',true,true);await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 for(const id of ['online-edit','manual-edit']){const before=(await q('select * from jovabook_private.commission_origins where booking_id=$1',[id])).rows[0];await upsert(id);const after=(await q('select * from jovabook_private.commission_origins where booking_id=$1',[id])).rows[0];assert.equal(after.original_price_minor,before.original_price_minor);assert.equal(after.source,before.source);assert.equal(+after.booked_at,+before.booked_at);assert.equal(after.root_booking_id,before.root_booking_id);assert.equal((await q('select source from bookings where id=$1',[id])).rows[0].source,before.source);assert.notEqual(+after.current_start,+before.current_start);}
 });
 await t.test('retry bursts of actual ON CONFLICT updates create no second origin or fee',async()=>{
 await Promise.all(Array.from({length:8},()=>upsert('online-edit',8)));assert.equal((await q("select count(*)::int n from jovabook_private.commission_origins where booking_id='online-edit'")).rows[0].n,1);assert.equal((await get('online-edit')).length,0);
 });
 await t.test('deleted booking references still cannot recreate financial history',async()=>{
 await make('deleted-origin',true,true);await q("delete from bookings where id='deleted-origin'");await assert.rejects(upsert('deleted-origin'),/retained financial history/);
 });
 await make('queued-manual',true,true);await make('queued-online',false,true);
 const audienceSql="select audience,status from jovabook_private.email_queue where booking_id=$1 and kind='confirmed' order by audience";
 assert.equal((await q(audienceSql,['queued-manual'])).rows.length,2);
 await db.exec(await readFile(new URL('../supabase/migrations/20261102191000_manual_booking_email_audience.sql',import.meta.url),'utf8'));
 const emailToken='a'.repeat(64),mail=async(action,payload={})=>(await q('select booking_email_worker($1,$2,$3) data',[emailToken,action,JSON.stringify(payload)])).rows[0].data;
 await q("update jovabook_private.email_config set enabled=true,worker_token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[emailToken]);
 await t.test('migration suppresses old manual owner confirmations and keeps customer plus online notices',async()=>{
 assert.deepEqual((await q(audienceSql,['queued-manual'])).rows,[{audience:'customer',status:'Queued'},{audience:'owner',status:'Cancelled'}]);assert.deepEqual((await q(audienceSql,['queued-online'])).rows,[{audience:'customer',status:'Queued'},{audience:'owner',status:'Queued'}]);
 });
 await t.test('new manual bookings email only customer; online bookings still notify both',async()=>{
 await make('new-manual',true,true);await make('new-online',false,true);assert.deepEqual((await q(audienceSql,['new-manual'])).rows,[{audience:'customer',status:'Queued'}]);assert.equal((await q(audienceSql,['new-online'])).rows.length,2);assert.equal((await q("select count(*)::int n from jovabook_private.email_queue where booking_id='new-manual' and kind='reminder' and audience='customer' and status='Scheduled'")).rows[0].n,1);
 });
 const injectOwner=async(id,status='Queued')=>(await q("insert into jovabook_private.email_queue(salon_id,event_id,booking_id,audience,recipient,kind,booking_revision,payload,due_at,status,lease_id,lease_until) select salon_id,event_id,booking_id,'owner','owner@example.test',kind,booking_revision,payload,now(),$2,'50000000-0000-4000-8000-000000000001',case when $2='Sending' then now()+interval '5 minutes' else now()-interval '1 second' end from jovabook_private.email_queue where booking_id=$1 and audience='customer' and kind='confirmed' returning id",[id,status])).rows[0].id;
 await t.test('claim and prepare independently suppress legacy or raced manual owner jobs',async()=>{
 const queued=await injectOwner('new-manual');let jobs=[];for(let n=0;n<8;n++){const batch=await mail('claim');jobs.push(...batch);if(!batch.length)break;}assert(!jobs.some(j=>j.id===queued));assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[queued])).rows[0].status,'Cancelled');
 await make('prepare-manual',true,true);const id=await injectOwner('prepare-manual','Sending');assert.equal(await mail('prepare',{id,lease:'50000000-0000-4000-8000-000000000001',mail:{subject:'Must not send'}}),null);assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[id])).rows[0].status,'Cancelled');
 });
 await t.test('manual reschedule and cancellation messages retain both audiences',async()=>{
 await q("update bookings set time='14:00' where id='new-manual'");assert.equal((await q("select count(*)::int n from jovabook_private.email_queue where booking_id='new-manual' and kind='rescheduled' and status='Queued'")).rows[0].n,2);await q("update bookings set status='cancelled' where id='new-manual'");assert.equal((await q("select count(*)::int n from jovabook_private.email_queue where booking_id='new-manual' and kind='cancelled' and status='Queued'")).rows[0].n,2);
 });
 }finally{await db.close();}
});

