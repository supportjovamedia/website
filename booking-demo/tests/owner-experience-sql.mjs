/* Local PostgreSQL-engine verification. Does not connect to a hosted database.
   BOOKING_NODE_MODULES may point to an existing node_modules directory. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
let PGlite;
for(const base of [null,process.env.BOOKING_NODE_MODULES]) {
  try {({PGlite}=base?require(path.join(base,'@electric-sql/pglite')):require('@electric-sql/pglite'));break;} catch {}
}
if(!PGlite) throw Error('Use an existing @electric-sql/pglite installation, or set BOOKING_NODE_MODULES.');
const sql=await Promise.all(['schema.sql','migration_diary.sql','migration_diary_tables.sql','migration_owner_experience.sql'].map(f=>readFile(new URL('../supabase/'+f,import.meta.url),'utf8')));
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',sid='20000000-0000-4000-8000-000000000001';
const hours={start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]};
const weekly=Object.fromEntries(Array.from({length:7},(_,i)=>[i,{closed:false,start:'09:00',end:'18:00'}]));
test('owner migration validates real tables, entitlements, daily hours, direct writes and atomic series',async()=>{
 const db=new PGlite();
 const q=(s,a=[])=>db.query(s,a);
 const fails=async(s,a,pattern)=>assert.rejects(q(s,a),pattern);
 try {
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);
   create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
   insert into auth.users values('${owner}'),('${other}');`);
  for(const part of sql.slice(0,3)) await db.exec(part);
  await q(`insert into salons(id,owner_id,name,slug,owner_name,email,email_norm,settings,status) values($1,$2,'Test Salon','test-salon','Owner','owner@example.test','owner@example.test',$3,'active')`,[sid,owner,JSON.stringify({hours,buffer:0,notice:0})]);
  await q(`insert into staff(salon_id,id,name) values($1,'one','Owner'),($1,'legacy-extra','Existing extra')`,[sid]);
  await q(`insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'cut','Haircut',25,30,array['one','legacy-extra'])`,[sid]);
  await q(`insert into customers(salon_id,id,name,email) values($1,'existing','Client','client@example.test')`,[sid]);
  await q(`insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status) values($1,'historic','cut','Original treatment',19,30,'2020-01-01','10:00','one','Historic Client','old@example.test','completed')`,[sid]);
  await db.exec(sql[3]);
  await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;');
  await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.exec('set role authenticated');
  let cap=(await q('select owner_capabilities() value')).rows[0].value;
  assert.equal(cap.staff_limit,1);assert.equal(cap.plan,'essential');assert.equal(cap.booking_series,true);
  assert.equal((await q('select count(*)::int n from staff')).rows[0].n,2,'Existing over-limit rows retained');
  await q(`update staff set name='Edited existing' where id='legacy-extra'`);
  // Upserts run both INSERT and UPDATE triggers and must preserve grandfathered records.
  await q(`insert into staff(salon_id,id,name) values($1,'legacy-extra','Upsert edit') on conflict(salon_id,id) do update set name=excluded.name`,[sid]);
  await fails(`insert into staff(salon_id,id,name) values($1,'three','Too many')`,[sid],/plan allows 1/);
  await fails(`insert into staff(salon_id,id,name,active) values($1,'inactive','Inactive record',false)`,[sid],/plan allows 1/);
  await q(`update staff set active=false where id='legacy-extra'`);
  await fails(`insert into staff(salon_id,id,name) values($1,'four','Inactive staff still count')`,[sid],/plan allows 1/);
  await q(`update staff set active=true where id='legacy-extra'`);
  await q(`update salons set plan='premium' where id=$1`,[sid]);
  assert.equal((await q('select owner_capabilities() value')).rows[0].value.plan,'essential','RLS prevents client plan upgrades');
  await q(`update bookings set notes='History preserved' where id='historic'`);
  await q(`insert into bookings select * from bookings where id='historic' on conflict(salon_id,id) do update set notes=excluded.notes`);
  assert.equal((await q(`select price::int p from bookings where id='historic'`)).rows[0].p,19);
  await fails(`update bookings set price=999 where id='historic'`,[],/must be preserved/);
  await fails(`update staff set hours=$1 where id='one'`,[JSON.stringify({...hours,weekly:{'1':{closed:false,start:'19:00',end:'09:00'}}})],/valid calendar hours/);
  // Owner settings RPC cannot alter trusted entitlements.
  const settings={hours:{...hours,weekly},buffer:0,notice:0,workspace:{plan:'premium'}};
  await q(`select save_salon('Test Salon','owner@example.test','','',$1,'{}','{}')`,[JSON.stringify(settings)]);
  assert.equal((await q('select owner_capabilities() value')).rows[0].value.staff_limit,1);
  await db.exec('reset role');
  await q(`update salons set plan='standard' where id=$1`,[sid]);
  await db.exec('set role authenticated');
  await q(`insert into staff(salon_id,id,name) values($1,'three','Allowed on Standard')`,[sid]);
  assert.equal((await q('select owner_capabilities() value')).rows[0].value.staff_limit,5);
  await q(`insert into staff(salon_id,id,name,active) values($1,'four','Four',false),($1,'five','Five',false)`,[sid]);
  await fails(`insert into staff(salon_id,id,name) values($1,'six','Six')`,[sid],/plan allows 5/);
  await db.exec('reset role');
  await q(`update salons set plan='premium' where id=$1`,[sid]);
  await db.exec('set role authenticated');
  await q(`insert into staff(salon_id,id,name,active) select $1,'staff-'||n,'Staff '||n,false from generate_series(6,10) n`,[sid]);
  assert.equal((await q('select owner_capabilities() value')).rows[0].value.staff_limit,10);
  await fails(`insert into staff(salon_id,id,name) values($1,'eleven','Eleven')`,[sid],/plan allows 10/);
  // Fix test dates in the future and close one weekday independently.
  const date=(await q(`select ((now() at time zone 'Europe/London')::date+14)::text d`)).rows[0].d;
  const second=(await q(`select ($1::date+7)::text d`,[date])).rows[0].d;
  const weekday=(await q(`select extract(dow from $1::date)::int d`,[date])).rows[0].d;
  weekly[weekday]={closed:false,start:'10:00',end:'16:00'};
  settings.hours.weekly=weekly;
  await q(`select save_salon('Test Salon','owner@example.test','','',$1,'{}','{}')`,[JSON.stringify(settings)]);
  await q(`update staff set hours=$1 where id='one'`,[JSON.stringify({start:'08:00',end:'17:00',days:[0,1,2,3,4,5,6]})]);
  // Owner RPC requires actual owner identity, and every occurrence shares one transaction.
  const series=(dates,time='10:00')=>q(`select owner_booking_series('cut','one',$1,$2,'New client','new@example.test','','','') value`,[JSON.stringify(dates),time]);
  const tenantBefore=(await q(`select count(*)::int n from customers`)).rows[0].n;
  await fails(`select owner_booking_series('cut','one',$1,'11:00','Wrong tenant','wrong@example.test','','','','20000000-0000-4000-8000-000000000099')`,[JSON.stringify([date,second])],/Your salon changed/);
  assert.equal((await q(`select count(*)::int n from customers`)).rows[0].n,tenantBefore,'Wrong tenant is refused before creating a client');
  assert.equal((await q(`select count(*)::int n from bookings where email='wrong@example.test'`)).rows[0].n,0,'Wrong tenant creates no series');
  await fails(`insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email) values($1,'outside','cut','Fake',1,15,$2,'09:00','one','Guest','guest@example.test')`,[sid,date],/unavailable/);
  let created=(await series([date,second])).rows[0].value;
  assert.equal(created.bookings.length,2);assert.equal(created.bookings[0].price,25);assert.equal(created.bookings[0].duration,30);
  await fails(`delete from staff where salon_id=$1 and id='one'`,[sid],/upcoming appointments/);
  await q(`delete from staff where salon_id=$1 and id<>'one'`,[sid]);
  await fails(`delete from staff where salon_id=$1 and id='one'`,[sid],/at least one staff member/);
  await fails(`insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email) values($1,'collision','cut','Fake',1,15,$2,'10:00','one','Guest','guest@example.test')`,[sid,date],/unavailable/);
  await fails(`update bookings set time='09:00' where id=$1`,[created.bookings[0].id],/unavailable/);
  const third=(await q(`select ($1::date+14)::text d`,[date])).rows[0].d;
  const before=(await q(`select count(*)::int n from bookings`)).rows[0].n;
  const emailBefore=(await q(`select count(*)::int n from email_log`)).rows[0].n;
  await assert.rejects(series([third,date]),/No free time/);
  assert.equal((await q(`select count(*)::int n from bookings`)).rows[0].n,before,'Later conflict rolls back earlier occurrence');
  assert.equal((await q(`select count(*)::int n from email_log`)).rows[0].n,emailBefore,'Failed series also rolls back outbox records');
  await assert.rejects(series(Array.from({length:13},()=>date)),/1 to 12/);
  await assert.rejects(series([third,third]),/different date/);
  await q("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  await assert.rejects(series([third]),/Sign in as the salon owner/);
  await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const closed={...hours,days:[],weekly:Object.fromEntries(Array.from({length:7},(_,i)=>[i,{closed:true,start:'09:00',end:'18:00'}]))};
  await q(`select save_salon('Test Salon','owner@example.test','','',$1,'{}','{}')`,[JSON.stringify({hours:closed})]);
  await assert.rejects(series([third],'11:00'),/No free time/);
  await db.exec('reset role');
  assert.equal((await q(`select slot_free($1,'one',$2,'11:00',30) free`,[sid,third])).rows[0].free,false,'Full closure applies on server');
  await q(`delete from services where salon_id=$1 and id='cut'`,[sid]);
  await fails(`update bookings set time='11:00' where id=$1`,[created.bookings[0].id],/service is no longer available/);
  await q(`update bookings set notes='Removed service history still editable' where id=$1`,[created.bookings[0].id]);
  await db.exec('set role anon');
  await fails('select owner_capabilities()',[],/permission denied/);
  await fails(`select owner_booking_series('cut','one','[]','10:00','Guest','guest@example.test')`,[],/permission denied/);
  await db.exec('reset role');
  await q(`delete from salons where id=$1`,[sid]);
  assert.equal((await q(`select count(*)::int n from staff where salon_id=$1`,[sid])).rows[0].n,0,'Deleting the parent account permits its cascade');
 } finally {await db.close();}
});
