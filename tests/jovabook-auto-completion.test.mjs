import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';

test('elapsed appointments complete after their end, preserve exclusions and remain idempotent',async()=>{
 const db=new PGlite(),salon='20000000-0000-4000-8000-000000000001';
 const q=(sql,p=[])=>db.query(sql,p);
 try{
  await bootstrap(db,await sources());
  await db.exec('alter table bookings disable trigger owner_experience_booking_schedule');
  const make=async(id,offset,status='confirmed',duration=30)=>q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source,deposit) select $1,$2,'consultation','Consultation',25,$5,(moment at time zone 'Europe/London')::date,to_char(moment at time zone 'Europe/London','HH24:MI'),'owner','Fixture','fixture@example.test',$4,'Manual',0 from (select now()+make_interval(mins=>$3) moment) x",[salon,id,offset,status,duration]);
  await make('elapsed',-90);await make('in-progress',-5);await make('future',60);await make('cancelled',-90,'cancelled');await make('no-show',-90,'no-show');
  const complete=()=>q('select jovabook_private.complete_elapsed_appointments()');
  await complete();
  const rows=(await q("select id,status from bookings where id in('elapsed','in-progress','future','cancelled','no-show')")).rows;
  assert.deepEqual(Object.fromEntries(rows.map(r=>[r.id,r.status])),{elapsed:'completed','in-progress':'confirmed',future:'confirmed',cancelled:'cancelled','no-show':'no-show'});
  const before=(await q('select count(*)::int n from jovabook_private.commission_origins where salon_id=$1',[salon])).rows[0].n;
  await complete();assert.equal((await q('select count(*)::int n from jovabook_private.commission_origins where salon_id=$1',[salon])).rows[0].n,before);
  await db.exec('set role anon');await assert.rejects(complete(),/permission denied/);await db.exec('reset role');
  await db.exec('set role authenticated');await assert.rejects(complete(),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
