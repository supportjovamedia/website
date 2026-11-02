import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101005929_jovabook_customer_portal.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql','migrations/20261101054615_jovabook_commission_supervisor.sql','migrations/20261102160000_jovabook_online_origin.sql','migrations/20261102161000_operator_commission_review.sql','migrations/20261102161500_commission_pattern_alerts.sql','migrations/20261102190000_booking_origin_upsert.sql','migrations/20261102191000_manual_booking_email_audience.sql'];
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001',token='d'.repeat(64);
test('automatic booking emails require canonical customer online origin',async t=>{
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

 const jobs=async id=>(await q('select * from jovabook_private.email_queue where booking_id=$1 order by created_at,id',[id])).rows;
 const emailToken='a'.repeat(64),mail=async(action,payload={})=>(await q('select booking_email_worker($1,$2,$3) data',[emailToken,action,JSON.stringify(payload)])).rows[0].data;
 await q("update jovabook_private.email_config set enabled=true,worker_token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[emailToken]);
 // Reproduce the live gap: previous policy stops only manual owner confirmations.
 await make('old-manual',true,true);await q("update bookings set time='13:00' where id='old-manual'");const old=(await jobs('old-manual')).filter(j=>j.kind==='rescheduled');assert.equal(old.length,2);assert(old.every(j=>j.status==='Queued'));
 const accepted=old[0];await q("update jovabook_private.email_queue set status='Delivered',provider_id='accepted-evidence' where id=$1",[accepted.id]);
 await make('old-online',false,true);const onlineBefore=(await jobs('old-online')).map(j=>({id:j.id,status:j.status}));
 await db.exec(await readFile(new URL('../supabase/migrations/20261102215209_online_only_booking_emails.sql',import.meta.url),'utf8'));
 await t.test('old manual change/reminder jobs stop while delivered evidence and online jobs remain',async()=>{
 const after=await jobs('old-manual');assert.equal(after.find(j=>j.id===accepted.id).status,'Delivered');assert.equal(after.find(j=>j.id===accepted.id).provider_id,'accepted-evidence');assert(after.filter(j=>j.id!==accepted.id).every(j=>j.status==='Cancelled'));assert.deepEqual((await jobs('old-online')).map(j=>({id:j.id,status:j.status})),onlineBefore);
 });
 await t.test('new manual diary creation, editing, cancellation and no-show produce no automatic emails',async()=>{
 await make('new-manual',true,true);assert.equal((await jobs('new-manual')).length,0);await q("update bookings set time='14:00',price=40 where id='new-manual'");assert.equal((await jobs('new-manual')).length,0);await q("update bookings set status='cancelled' where id='new-manual'");assert.equal((await jobs('new-manual')).length,0);await make('manual-noshow',true);await q("update bookings set status='no-show' where id='manual-noshow'");assert.equal((await jobs('manual-noshow')).length,0);
 });
 await t.test('genuine online creation, changes, cancellation and reminders retain intended audiences',async()=>{
 await make('new-online',false,true);let list=await jobs('new-online');assert.equal(list.filter(j=>j.kind==='confirmed').length,2);assert.equal(list.filter(j=>j.kind==='reminder'&&j.audience==='customer').length,1);await q("update bookings set time='15:00' where id='new-online'");list=await jobs('new-online');assert.equal(list.filter(j=>j.kind==='rescheduled'&&j.status==='Queued').length,2);await q("update bookings set status='cancelled' where id='new-online'");assert.equal((await jobs('new-online')).filter(j=>j.kind==='cancelled'&&j.status==='Queued').length,2);
 });
 await t.test('Unknown origin is held, and legacy fallback applies only without immutable origin',async()=>{
 await q("select set_config('request.jwt.claim.sub','',false)");await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source,deposit) values($1,'unknown','svc','Service',100,30,current_date+3,'16:00','staff','Test','test@example.test','confirmed','Online',0)",[salon]);assert.equal((await jobs('unknown')).length,0);assert.equal((await q("select source from jovabook_private.commission_origins where booking_id='unknown'")).rows[0].source,'Unknown');
 await make('legacy-online',false,true);await q("delete from jovabook_private.commission_origins where booking_id='legacy-online'");assert.equal((await q("select jovabook_private.booking_email_origin_allowed($1,'legacy-online') allowed",[salon])).rows[0].allowed,true);await q("update bookings set time='17:00' where id='legacy-online'");assert.equal((await jobs('legacy-online')).filter(j=>j.kind==='rescheduled'&&j.status==='Queued').length,2);
 });
 const raced=async(status='Queued',provider=null)=>{const template=(await jobs('old-manual')).find(j=>j.kind==='rescheduled'&&j.audience==='owner');return (await q("insert into email_log(salon_id,id,kind,subject,to_email,from_email,reply_to,salon_name,address,booking,status,owner_status) select salon_id,$2,kind,subject,to_email,from_email,reply_to,salon_name,address,booking,'Queued','Queued' from email_log where salon_id=$1 and id=$3 returning id",[salon,'race_'+Math.random().toString(36).slice(2),template.event_id])).rows[0].id;};
 const inject=async(status='Queued',provider=null)=>{const event=await raced();return (await q("insert into jovabook_private.email_queue(salon_id,event_id,booking_id,audience,recipient,kind,booking_revision,payload,due_at,status,lease_id,lease_until,provider_id) select salon_id,$2,booking_id,audience,recipient,kind,booking_revision,payload,now()-interval '1 hour',$3,'50000000-0000-4000-8000-000000000001',case when $3='Sending' then now()+interval '5 minutes' else now()-interval '1 second' end,$4 from jovabook_private.email_queue where salon_id=$1 and booking_id='old-manual' and kind='rescheduled' and audience='owner' limit 1 returning id",[salon,event,status,provider])).rows[0].id;};
 await t.test('worker claim and prepare reject old/raced manual updates without deleting evidence',async()=>{
 const queued=await inject();let claimed=[];for(let n=0;n<8;n++){const batch=await mail('claim');claimed.push(...batch);if(!batch.length)break;}assert(!claimed.some(j=>j.id===queued));assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[queued])).rows[0].status,'Cancelled');
 const pending=await inject('Sending');assert.equal(await mail('prepare',{id:pending,lease:'50000000-0000-4000-8000-000000000001',mail:{subject:'Do not send'}}),null);assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[pending])).rows[0].status,'Cancelled');
 const providerAccepted=await inject('Sending','provider-accepted');assert.equal(await mail('prepare',{id:providerAccepted,lease:'50000000-0000-4000-8000-000000000001',mail:{subject:'Do not resend'}}),null);const retained=(await q('select status,provider_id from jovabook_private.email_queue where id=$1',[providerAccepted])).rows[0];assert.deepEqual(retained,{status:'Sending',provider_id:'provider-accepted'});
 });

 await t.test('retained provider-accepted manual jobs cannot starve genuine online deliveries',async()=>{
 const retained=[];for(let n=0;n<5;n++)retained.push(await inject('Queued','accepted-'+n));await make('online-after-retained',false,true);const expected=(await jobs('online-after-retained')).filter(j=>j.kind==='confirmed').map(j=>j.id);const claimed=await mail('claim');assert(expected.every(id=>claimed.some(j=>j.id===id)));for(const id of retained){const row=(await q('select status,provider_id from jovabook_private.email_queue where id=$1',[id])).rows[0];assert.equal(row.status,'Queued');assert.match(row.provider_id,/^accepted-/);}
 });
 await t.test('paid SMS configuration remains disabled and untouched',async()=>{assert.equal((await q('select enabled from jovabook_private.sms_config where singleton')).rows[0].enabled,false);});
 }finally{await db.close();}
});

