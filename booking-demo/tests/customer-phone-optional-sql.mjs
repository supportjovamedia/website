import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bootstrap,sources,installOfflineGuard} from '../../scripts/jovabook-test-db.mjs';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const customer='10000000-0000-4000-8000-000000000060',other='10000000-0000-4000-8000-000000000061',operator='10000000-0000-4000-8000-000000000062',unverified='10000000-0000-4000-8000-000000000063';
const salon='20000000-0000-4000-8000-000000000001',foreign='20000000-0000-4000-8000-000000000002';
installOfflineGuard();
test('optional customer phone preserves native identity, membership and validation boundaries',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0].data;
 const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(id?'set role authenticated':'set role anon');};
 const register=(phone,first="O'Connor",last='李')=>value('select customer_portal_register($1,$2,$3,$4) data',['fictional-business-1',first,last,phone]);
 try{
  await bootstrap(db,await sources());for(const [id,email,confirmed] of [[customer,'optional-phone@example.test',true],[other,'other-phone@example.test',true],[operator,'support.jovamedia@gmail.com',true],[unverified,'unverified-phone@example.test',false]])await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,email,confirmed?new Date():null]);
  await t.test('omitted, empty, null and whitespace-only phones store an empty string without placeholders',async()=>{
   await as(customer);assert.equal((await value("select customer_portal_register('fictional-business-1','Taylor','Customer') data")).ok,true);
   for(const phone of ['',null,'   '])assert.equal((await register(phone)).ok,true);await db.exec('reset role');const member=(await q('select phone,first_name,last_name from public.customer_portal_memberships where salon_id=$1 and user_id=$2',[salon,customer])).rows[0];assert.equal(member.phone,'');assert.equal(member.first_name,"O'Connor");assert.equal(member.last_name,'李');assert.equal((await q('select phone,email from public.customers where salon_id=$1 and id=$2',[salon,'cp_'+customer])).rows[0].phone,'');
  });
  await t.test('nonempty trimmed phone keeps the original 7 through 40 character bounds',async()=>{
   await as(customer);for(const phone of ['1234567','1'.repeat(40),' 07700 900123 '])assert.equal((await register(phone)).ok,true);for(const phone of ['123456','1'.repeat(41)])await assert.rejects(register(phone),/7 and 40/);await db.exec('reset role');assert.equal((await q('select phone from public.customer_portal_memberships where salon_id=$1 and user_id=$2',[salon,customer])).rows[0].phone,'07700 900123');
  });
  await t.test('first and last names remain required with flexible characters and existing length limits',async()=>{
   await as(customer);for(const [first,last] of [['','Customer'],['   ','Customer'],['Taylor',''],['Taylor',' '],['x'.repeat(61),'Customer']])await assert.rejects(register('',first,last),/first and last/);assert.equal((await register('',"Anne-Marie O'Connor",'李 García')).ok,true);await db.exec('reset role');
  });
  await t.test('optional phone does not grant owner, operator, anonymous or unverified access',async()=>{
   for(const id of [null,'10000000-0000-4000-8000-000000000001',operator,unverified]){await as(id);await assert.rejects(register(''));}await db.exec('reset role');
  });
  await t.test('business client data and confirmed email remain authoritative and foreign membership stays isolated',async()=>{
   await q("update public.customers set phone='BUSINESS PHONE',name='Business client name' where salon_id=$1 and id=$2",[salon,'cp_'+customer]);await as(customer);assert.equal((await register('')).ok,true);const bookings=await value("select customer_portal_bookings('fictional-business-1') data");assert.equal(bookings.customer.email,'optional-phone@example.test');assert.equal(bookings.customer.phone,'');await assert.rejects(q("select customer_portal_bookings('fictional-business-2')"));await db.exec('reset role');const client=(await q('select phone,name,email from public.customers where salon_id=$1 and id=$2',[salon,'cp_'+customer])).rows[0];assert.equal(client.phone,'BUSINESS PHONE');assert.equal(client.name,'Business client name');assert.equal(client.email,'optional-phone@example.test');assert.equal((await q('select count(*)::int n from public.customer_portal_memberships where salon_id=$1 and user_id=$2',[foreign,customer])).rows[0].n,0);
  });
  await t.test('table defaults accept an absent phone while direct browser table writes remain denied',async()=>{
   await q("insert into public.customer_portal_memberships(salon_id,user_id,first_name,last_name) values($1,$2,'Other','Customer')",[salon,other]);assert.equal((await q('select phone from public.customer_portal_memberships where salon_id=$1 and user_id=$2',[salon,other])).rows[0].phone,'');await assert.rejects(q("update public.customer_portal_memberships set phone='123' where salon_id=$1 and user_id=$2",[salon,other]),/check constraint/);await as(other);await assert.rejects(q("update public.customer_portal_memberships set phone='' where user_id=$1",[other]));await db.exec('reset role');
  });
 }finally{await db.close();}
});
