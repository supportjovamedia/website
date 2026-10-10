import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';

// This is an isolated PostgreSQL rehearsal, never a connection to a hosted database.
// The optional snapshot contains private data. Keep it outside the repository.
const snapshot=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const salon=snapshot.businesses.find(row=>row.slug==='north-and-co');
assert(salon,'Expected salon missing');
const db=new PGlite({extensions:{btree_gist}});
try {
 await db.exec(await fs.readFile(new URL('../tests/fixtures/booking-legacy.sql',import.meta.url),'utf8'));
 await db.exec('alter table bookings disable trigger user;alter table time_off disable trigger user;');
 const users=[...new Set([...snapshot.business_members.map(row=>row.user_id),...snapshot.clients.map(row=>row.user_id)].filter(Boolean))];
 for(const user of users)await db.query('insert into auth.users values($1)',[user]);
 const tables=['businesses','business_members','staff','service_categories','services','clients','staff_services','working_hours','time_off','bookings'];
 for(const table of tables){
  await db.query(`insert into public.${table} overriding system value select * from json_populate_recordset(null::public.${table},$1)`,[JSON.stringify(snapshot[table])]);
 }
 await db.exec(await fs.readFile(new URL('../database/booking/005_single_salon.sql',import.meta.url),'utf8'));
 const report=[];
 for(const table of tables){
  const destination=table==='businesses'?'salon_settings':table==='business_members'?'admin_users':table;
  const expected=snapshot[table].filter(row=>table==='businesses'?row.id===salon.id:row.business_id===salon.id);
  const actual=(await db.query(`select * from public.${destination}`)).rows;
  assert.equal(actual.length,expected.length,table+' count changed');
  for(const original of expected){
   const saved=actual.find(row=>original.id!==undefined?row.id===original.id:table==='business_members'?row.user_id===original.user_id:row.staff_id===original.staff_id&&row.service_id===original.service_id);
   assert(saved,table+' row missing');
   for(const [column,value] of Object.entries(original)){
    if(!(column in saved))continue;
    const a=saved[column];
    if(a instanceof Date)assert.equal(a.toISOString(),new Date(value).toISOString());
    else if(typeof a==='number')assert.equal(a,Number(value));
    else assert.equal(a,value,table+'.'+column);
   }
  }
  report.push({table:destination,preserved:actual.length});
 }
 assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and column_name='business_id'")).rows[0].n,0);
 console.log(JSON.stringify({result:'PASS',scope:'Local rehearsal using current records and exported hosted schema definitions',tables:report},null,2));
} finally {await db.close();}
