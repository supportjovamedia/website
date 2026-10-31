import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
let PGlite;
for(const base of [null,process.env.BOOKING_NODE_MODULES,'C:/Users/abdul/OneDrive/Documents/ChatGPT/New project/jovamedia-website/node_modules']){try{({PGlite}=base?require(path.join(base,'@electric-sql/pglite')):require('@electric-sql/pglite'));break;}catch{}}
if(!PGlite)throw Error('Set BOOKING_NODE_MODULES to an installed PGlite package directory.');
const token='a'.repeat(64),owner='10000000-0000-4000-8000-000000000001',sid='20000000-0000-4000-8000-000000000001';
const setup=await readFile(new URL('../supabase/setup_new_project.sql',import.meta.url),'utf8');
const ownerSql=await readFile(new URL('../supabase/migration_owner_experience.sql',import.meta.url),'utf8');
const migration=await readFile(new URL('../supabase/migrations/20261031161318_jovabook_email_delivery.sql',import.meta.url),'utf8');
test('Email queue, tenant boundaries, retry leases and lifecycle events in isolated PostgreSQL',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),rpc=async(action,payload={})=>(await q('select booking_email_worker($1,$2,$3) value',[token,action,JSON.stringify(payload)])).rows[0].value;
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${owner}');`);
  await db.exec(setup);
  await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;');
  const hours={start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]};
  await q(`insert into salons(id,owner_id,name,slug,owner_name,email,email_norm,settings,status) values($1,$2,'QA Business','qa-business','QA Owner','owner@example.test','owner@example.test',$3,'active')`,[sid,owner,JSON.stringify({hours,buffer:0,notice:0})]);
  await q(`insert into staff(salon_id,id,name) values($1,'owner','QA Owner')`,[sid]);
  await q(`insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'consultation','Consultation',40,30,array['owner'])`,[sid]);
  await q(`insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status) values($1,'historic','consultation','Historical service',40,30,'2020-01-01','10:00','owner','Old Customer','old@example.test','completed')`,[sid]);
  await db.exec(ownerSql);await db.exec(migration);
  await q(`update jovabook_private.email_config set worker_token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')`,[token]);
  const date=(await q(`select ((now() at time zone 'Europe/London')::date+15)::text d`)).rows[0].d;
  await t.test('Migration does not backfill or send historic records',async()=>{assert.equal((await q('select count(*)::int n from jovabook_private.email_queue')).rows[0].n,0);assert.equal((await q('select count(*)::int n from bookings')).rows[0].n,1);assert.deepEqual(await rpc('claim'),[]);});
  let id;
  await t.test('Public create_booking produces one event and two delivery jobs plus one future reminder',async()=>{
   await db.exec('set role anon');const result=(await q(`select create_booking('qa-business','consultation','owner',$1,'10:00','Customer','customer@example.test','','','Card') value`,[date])).rows[0].value;await db.exec('reset role');assert.equal(result.ok,true,JSON.stringify(result));id=result.booking.id;
   assert.equal((await q(`select count(*)::int n from email_log where kind='confirmed'`)).rows[0].n,1);assert.equal((await q('select count(*)::int n from jovabook_private.email_queue')).rows[0].n,3);
   assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where kind='reminder' and audience='owner'`)).rows[0].n,0);
   assert.equal((await q(`select extract(epoch from (((b.date+b.time::time) at time zone 'Europe/London')-e.due_at))::int seconds from bookings b join jovabook_private.email_queue e on e.booking_id=b.id where e.kind='reminder'`)).rows[0].seconds,86400);
  });
  await t.test('Owners cannot forge delivery status or access the private queue',async()=>{
   await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');assert.equal((await q('select email_delivery_info() value')).rows[0].value.enabled,false);
   await assert.rejects(q(`update email_log set status='Delivered'`),/permission denied/);await assert.rejects(q('select * from jovabook_private.email_queue'),/permission denied/);await db.exec('reset role');
   await db.exec('set role anon');await assert.rejects(q(`select booking_email_worker('bad','claim','{}')`),/Invalid email worker/);await assert.rejects(q('select email_delivery_info()'),/permission denied/);await db.exec('reset role');
   await q("select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',false)");await db.exec('set role authenticated');assert.equal((await q('select count(*)::int n from email_log')).rows[0].n,0);await assert.rejects(q('select email_delivery_info()'),/Sign in/);await db.exec('reset role');
  });
  let jobs;
  await t.test('Disabled worker claims nothing; enabled worker leases due jobs once',async()=>{
   assert.deepEqual(await rpc('claim'),[]);await q('update jovabook_private.email_config set enabled=true');jobs=await rpc('claim');assert.equal(jobs.length,2);assert.deepEqual(await rpc('claim'),[]);
   const frozen=await rpc('prepare',{id:jobs[0].id,lease:jobs[0].lease,mail:{from:'first@example.test',subject:'Original'}});assert.equal(frozen.subject,'Original');assert.deepEqual(await rpc('prepare',{id:jobs[0].id,lease:jobs[0].lease,mail:{subject:'Changed'}}),frozen);
  });
  await t.test('Delivery callback before send acknowledgement is retained and reconciled once',async()=>{
   const job=jobs[0];await rpc('event',{event_id:'fast-event',provider_id:'provider-fast',type:'email.delivered',at:new Date().toISOString()});await rpc('finish',{id:job.id,lease:job.lease,provider_id:'provider-fast'});
   assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[job.id])).rows[0].status,'Delivered');assert.equal((await rpc('event',{event_id:'fast-event',provider_id:'provider-fast',type:'email.delivered',at:new Date().toISOString()})).duplicate,true);
  });
  await t.test('Transient provider errors retain their frozen content and retry with a new lease',async()=>{
   const job=jobs[1];await rpc('prepare',{id:job.id,lease:job.lease,mail:{subject:'Stable'}});await rpc('finish',{id:job.id,lease:job.lease,retry:true,error:'Temporary error'});assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[job.id])).rows[0].status,'Queued');
   await q('update jovabook_private.email_queue set due_at=now()-interval \'1 second\' where id=$1',[job.id]);const retry=(await rpc('claim'))[0];assert.equal(retry.id,job.id);assert.notEqual(retry.lease,job.lease);assert.equal(retry.provider_payload.subject,'Stable');assert.equal((await rpc('finish',{id:retry.id,lease:job.lease,provider_id:'stale'})).stale,true);await rpc('finish',{id:retry.id,lease:retry.lease,provider_id:'provider-owner'});
  });
  await t.test('Rescheduling cancels old reminder, creates updated messages and one new reminder',async()=>{
   await q(`update bookings set time='11:00' where id=$1`,[id]);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where kind='reminder' and status='Cancelled'`)).rows[0].n,1);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where kind='reminder' and status='Scheduled'`)).rows[0].n,1);assert.equal((await q(`select count(*)::int n from email_log where kind='rescheduled'`)).rows[0].n,1);
  });
  await t.test('Cancellation atomically stops reminders and pending updates',async()=>{
   await q(`update bookings set status='cancelled' where id=$1`,[id]);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where kind<>'cancelled' and status in ('Queued','Scheduled','Sending')`)).rows[0].n,0);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where kind='cancelled' and status='Queued'`)).rows[0].n,2);
  });
  await t.test('Bounces suppress later jobs and older delivery events cannot erase a bounce',async()=>{
   const job=(await rpc('claim')).find(j=>j.audience==='customer');await rpc('finish',{id:job.id,lease:job.lease,provider_id:'bounce-id'});await rpc('event',{event_id:'bounce-event',provider_id:'bounce-id',type:'email.bounced',at:new Date().toISOString()});await rpc('event',{event_id:'late-delivery',provider_id:'bounce-id',type:'email.delivered',at:new Date().toISOString()});assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[job.id])).rows[0].status,'Bounced');
   await q(`update bookings set status='confirmed',time='12:00' where id=$1`,[id]);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where audience='customer' and status in ('Queued','Scheduled')`)).rows[0].n,0);
  });
  await t.test('Provider simulator callbacks also reconcile before a probe is recorded',async()=>{await rpc('event',{event_id:'probe-delivered',provider_id:'probe-id',type:'email.delivered',at:new Date().toISOString()});await rpc('probe',{provider_id:'probe-id',expected:'Delivered'});assert.equal((await rpc('health')).probes[0].status,'Delivered');});
  await t.test('Expired retry window stops automatic resends',async()=>{const queue=(await q(`select id from jovabook_private.email_queue where status='Queued' limit 1`)).rows[0];await q(`update jovabook_private.email_queue set first_attempt_at=now()-interval '23 hours',lease_until=null,due_at=now()-interval '1 minute' where id=$1`,[queue.id]);await rpc('claim');assert.equal((await q('select status from jovabook_private.email_queue where id=$1',[queue.id])).rows[0].status,'Failed');});
  await t.test('Deleting a mistaken booking cancels pending jobs without sending a new cancellation',async()=>{const before=(await q('select count(*)::int n from email_log')).rows[0].n;await q('delete from bookings where id=$1',[id]);assert.equal((await q('select count(*)::int n from email_log')).rows[0].n,before);assert.equal((await q(`select count(*)::int n from jovabook_private.email_queue where booking_id=$1 and status in ('Queued','Scheduled','Sending')`,[id])).rows[0].n,0);});
 }finally{await db.close();}
});
