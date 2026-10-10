import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';

const owner='00000000-0000-4000-8000-000000000001';
const customer='00000000-0000-4000-8000-000000000002';
const foreignOwner='00000000-0000-4000-8000-000000000003';
const fixture=await fs.readFile(new URL('./fixtures/booking-legacy.sql',import.meta.url),'utf8');
const migration=await fs.readFile(new URL('../database/booking/005_single_salon.sql',import.meta.url),'utf8');

test('single-salon migration preserves records, removes tenancy and enforces real relationships',async()=>{
 const db=new PGlite({extensions:{btree_gist}});
 const query=(sql,args=[])=>db.query(sql,args);
 try {
  await db.exec(fixture);
  await db.exec('alter table bookings disable trigger user;alter table time_off disable trigger user;');
  await db.exec(`insert into auth.users values('${owner}'),('${customer}'),('${foreignOwner}');
   insert into businesses(id,name,slug) overriding system value values(3,'North & Co.','north-and-co'),(4,'Other demo','other-demo');
   insert into business_members values(3,'${owner}','owner','north.owner'),(4,'${foreignOwner}','owner','other.owner');
   insert into service_categories(id,business_id,name) overriding system value values(1,3,'Cuts'),(2,4,'Other demo');
   insert into services(id,business_id,name,price_pence,duration_minutes,buffer_minutes,category_id) overriding system value values(1,3,'Haircut',2500,30,5,1),(2,4,'Demo',1000,30,5,2);
   insert into staff(id,business_id,name) overriding system value values(1,3,'Alex'),(2,4,'Demo staff'),(3,3,'Unassigned');
   insert into staff_services values(3,1,1),(4,2,2);
   insert into clients(id,business_id,name,email,user_id) overriding system value values(1,3,'Customer','customer@example.invalid','${customer}'),(2,4,'Other demo','demo@example.invalid',null);
   insert into bookings(id,business_id,client_id,staff_id,service_id,customer_name,customer_email,buffer_minutes,starts_at,ends_at,reserved_until,price_pence) overriding system value
    values(1,3,1,1,1,'Original snapshot','customer@example.invalid',5,'2026-01-01T10:00Z','2026-01-01T10:30Z','2026-01-01T10:35Z',2500),(2,4,2,2,2,'Other demo','demo@example.invalid',5,'2026-01-01T10:00Z','2026-01-01T10:30Z','2026-01-01T10:35Z',1000);
   insert into working_hours(business_id,staff_id,weekday,opens_at,closes_at) select 3,s,d,'00:00','23:59' from generate_series(0,6) d cross join (values(1),(3)) as staff(s);
   grant select,insert,update,delete on all tables in schema public to authenticated,service_role;
   select setval('bookings_id_seq',10);select setval('clients_id_seq',10);
   select setval('services_id_seq',10);select setval('staff_id_seq',10);`);
  await db.exec(migration);
  assert.equal((await query("select count(*)::int n from information_schema.columns where table_schema='public' and column_name='business_id'")).rows[0].n,0);
  assert.equal((await query("select to_regclass('public.businesses') b,to_regclass('public.business_members') m")).rows[0].b,null);
  assert.equal((await query('select count(*)::int n from salon_settings')).rows[0].n,1);
  assert.equal((await query('select count(*)::int n from booking_archive_20261010.bookings')).rows[0].n,2);
  assert.equal((await query('select count(*)::int n from bookings')).rows[0].n,1);
  assert.equal((await query('select customer_name,price_pence from bookings where id=1')).rows[0].customer_name,'Original snapshot');
  assert.equal((await query('select user_id from clients where id=1')).rows[0].user_id,customer);
  assert.equal((await query('select username from admin_users')).rows[0].username,'north.owner');
  const foreignKeys=(await query("select conrelid::regclass::text as source,confrelid::regclass::text as target from pg_constraint where connamespace='public'::regnamespace and contype='f'")).rows;
  assert.equal(foreignKeys.length,10);
  assert(!foreignKeys.some(f=>f.target==='salon_settings'));
  await assert.rejects(query("insert into working_hours(staff_id,weekday,opens_at,closes_at) values(1,1,'09:00','12:00')"),e=>e.code==='23P01');
  await assert.rejects(query('insert into staff_services values(1,999999)'),e=>e.code==='23503');
  await assert.rejects(query("insert into services(name,price_pence,duration_minutes,category_id) values('Invalid category',2500,30,999999)"),e=>e.code==='23503');
  await assert.rejects(query("insert into salon_settings(id,name) overriding system value values(4,'Second salon')"),e=>e.code==='23514');

  const start=new Date(Date.now()+3*86400000);start.setUTCHours(10,0,0,0);
  const request=randomUUID();
  const book=(staff,time=start,requestId=randomUUID())=>query('select * from create_booking($1,1,$2,$3,$4,$5,$6,1)',[staff,time.toISOString(),'New snapshot','customer@example.invalid','',requestId]);
  await assert.rejects(book(3),/does not offer/);
  const saved=(await book(1,start,request)).rows[0];assert.equal(saved.price_pence,2500);
  assert.equal((await book(1,start,request)).rows[0].id,saved.id);
  await assert.rejects(book(1),e=>e.code==='23P01');
  await assert.rejects(query('insert into time_off(staff_id,starts_at,ends_at,reason) values(1,$1,$2,$3)',[saved.starts_at,saved.ends_at,'Clash']),/Move or cancel/);
  await query("update bookings set status='cancelled' where id=$1",[saved.id]);
  await query('insert into time_off(staff_id,starts_at,ends_at,reason) values(1,$1,$2,$3)',[saved.starts_at,saved.ends_at,'Holiday']);
  await assert.rejects(book(1),/time off/);
  await query('delete from time_off');
  const next=(await book(1)).rows[0];assert(next.id!==saved.id);
  await query('update services set price_pence=9999,duration_minutes=60 where id=1');
  await query("update bookings set status='completed' where id=$1",[next.id]);
  const snapshot=(await query('select price_pence,ends_at from bookings where id=$1',[next.id])).rows[0];
  assert.equal(snapshot.price_pence,2500);assert.equal(String(snapshot.ends_at),String(next.ends_at));

  await db.exec('set role authenticated');
  await query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
  assert.equal((await query('select * from clients')).rows.length,0);
  assert.equal((await query('select * from admin_users')).rows.length,0);
  await assert.rejects(query("insert into staff(name) values('Customer cannot write')"),e=>e.code==='42501');
  await assert.rejects(query('select * from booking_archive_20261010.bookings'),e=>e.code==='42501');
  await assert.rejects(book(1),e=>e.code==='42501');
  await query("select set_config('request.jwt.claim.sub',$1,false)",[foreignOwner]);
  assert.equal((await query('select * from clients')).rows.length,0);
  await query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  assert.equal((await query('select * from clients')).rows.length,1);
  assert.equal((await query('select * from admin_users')).rows.length,1);
  assert.equal((await query("update staff set name='Updated' where id=1 returning id")).rows.length,1);
  await db.exec('reset role');
  await assert.rejects(db.exec(migration),/already installed/);await db.exec('rollback');
 } finally { await db.close(); }
});
