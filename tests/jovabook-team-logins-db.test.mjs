import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
const A='20000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',token='e'.repeat(64);
const OWNER_A='10000000-0000-4000-8000-000000000001',OWNER_B='10000000-0000-4000-8000-000000000002';
const ANNA='30000000-0000-4000-8000-000000000001',BEN='30000000-0000-4000-8000-000000000002',CUSTOMER='30000000-0000-4000-8000-000000000003';

test('team logins reach only their own business, and only the four workspace areas',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.value;
 const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role authenticated');};
 const root=()=>db.exec('reset role');
 const worker=(action,payload,secret=token)=>value('select public.booking_team_worker($1,$2,$3) value',[secret,action,JSON.stringify({salon:A,...payload})]);
 const count=async sql=>Number(await value('select count(*) value from ('+sql+') x'));
 // Run a write as the current role and report how many rows it changed, or that it was refused.
 const attempt=async sql=>{try{await q(sql);return 'ok';}catch(e){return /row-level security|permission denied/.test(e.message)?'refused':'error: '+e.message;}};
 try{
  await bootstrap(db,await sources());
  await q("update jovabook_private.billing_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),enabled=true,provider_configured=true",[token]);
  for(const [id,mail] of [[ANNA,'anna@example.test'],[BEN,'ben@example.test'],[CUSTOMER,'client@example.test']])await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,mail]);
  await q("update jovabook_private.offer_accounts set plan='premium',seats=3,provider_status='active',paid_until=now()+interval '30 days',ever_paid=true where salon_id=$1",[A]);
  await q("update jovabook_private.offer_accounts set plan='premium',seats=2,provider_status='active',paid_until=now()+interval '30 days',ever_paid=true where salon_id=$1",[B]);
  await q("insert into public.staff(salon_id,id,name,role,active,color) values($1,'anna','Anna','Stylist',true,'#235789'),($1,'ben','Ben','Barber',true,'#2b6a52'),($2,'zed','Zed','Stylist',true,'#235789')",[A,B]);
  await q("update public.services set staff_ids=array['owner','anna','ben'] where salon_id=$1",[A]);
  await q("update public.services set staff_ids=array['owner','zed'] where salon_id=$1",[B]);
  await q("insert into public.customers(salon_id,id,name,email) values($1,'ca','Carla A','carla@example.test'),($2,'cb','Carl B','carl@example.test')",[A,B]);
  await q("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,customer_id) values($1,'bk-b','consultation','Test consultation',20,30,current_date+3,'15:00','zed','Carl B','cb'),($2,'bk-a','consultation','Test consultation',20,30,current_date+3,'11:00','anna','Carla A','ca')",[B,A]);
  await q("update jovabook_private.offer_accounts set plan='standard',seats=1 where salon_id=$1",[A]);
  const base={bookingsA:await count("select 1 from public.bookings where salon_id='"+A+"'"),customersA:await count("select 1 from public.customers where salon_id='"+A+"'"),bookingsB:await count("select 1 from public.bookings where salon_id='"+B+"'"),customersB:await count("select 1 from public.customers where salon_id='"+B+"'")};

  await t.test('a login needs a paid Pro Team plan, an active team member and the right worker secret',async()=>{
   await assert.rejects(worker('link',{staff_id:'anna',user:ANNA,email:'anna@example.test'},'0'.repeat(64)),/Invalid billing/);
   let r=await worker('link',{staff_id:'anna',user:ANNA,email:'anna@example.test'});assert.equal(r.ok,false);assert.equal(r.code,'plan');
   await q("update jovabook_private.offer_accounts set plan='premium',seats=3 where salon_id=$1",[A]);
   r=await worker('link',{staff_id:'missing',user:ANNA,email:'anna@example.test'});assert.equal(r.code,'no_staff');
   await q("update public.staff set active=false where salon_id=$1 and id='ben'",[A]);
   r=await worker('link',{staff_id:'ben',user:BEN,email:'ben@example.test'});assert.equal(r.code,'inactive');
   await q("update public.staff set active=true where salon_id=$1 and id='ben'",[A]);
   const ctx=await worker('context',{staff_id:'anna'});assert.equal(ctx.plan,'premium');assert.equal(ctx.has_login,false);
   r=await worker('link',{staff_id:'anna',user:ANNA,email:'Anna@Example.test '});assert.equal(r.ok,true);assert.equal(r.email,'anna@example.test');
   r=await worker('link',{staff_id:'anna',user:BEN,email:'ben@example.test'});assert.equal(r.code,'exists');
   // Owners and customers cannot be turned into team logins.
   await assert.rejects(worker('link',{staff_id:'ben',user:OWNER_B,email:'x@example.test'}),/different portal/);
   await q("insert into jovabook_private.portal_roles(user_id,role) values($1,'customer')",[CUSTOMER]);
   await assert.rejects(worker('link',{staff_id:'ben',user:CUSTOMER,email:'client@example.test'}),/different portal/);
   // One login cannot serve a second team member.
   await assert.rejects(worker('link',{staff_id:'ben',user:ANNA,email:'anna@example.test'}));
   assert.equal((await worker('link',{staff_id:'ben',user:BEN,email:'ben@example.test'})).ok,true);
  });

  await t.test('a team login opens its own business and nothing owner-only',async()=>{
   await as(ANNA);
   assert.equal(await value('select public.my_salon_id() value'),null);
   assert.equal(await value('select public.staff_salon_id() value'),A);
   const owner=await value('select public.owner_account_access() value');
   assert.equal(owner.access,'wrong_portal');assert.equal(owner.role,'team');assert.equal('business' in owner,false);
   const access=await value('select public.team_account_access() value');
   assert.equal(access.access,'active');assert.equal(access.team,true);assert.equal(access.business.id,A);assert.equal(access.business.plan,'premium');
   assert.equal(access.billing.connected,false);assert.equal(access.team_member.staff_id,'anna');
   assert.equal(JSON.stringify(access).toLowerCase().includes('stripe'),false);
   const ws=await value('select public.team_workspace() value');
   assert.equal(ws.id,A);assert.equal(ws.owner_id,ANNA);assert.equal(ws.email,'');
   for(const key of ['device_id','signup_ip','flags','email_norm','phone_norm'])assert.equal(key in ws,false);
   assert.equal(await count('select 1 from public.salons'),0);
   assert.equal(await value('select public.owner_team_logins() value').then(v=>v.length),0);
   assert.match(await attempt('select * from jovabook_private.team_logins'),/refused/);
   await root();
   assert.equal(await value("select role value from jovabook_private.portal_roles where user_id='"+ANNA+"'"),'team');
  });

  await t.test('rows: a team member sees only their own calendar, and never another business',async()=>{
   await as(ANNA);
   // Only Anna's bookings, not the owner's or Ben's.
   assert.equal(await count('select 1 from public.bookings'),1);
   assert.equal(await count("select 1 from public.bookings where staff_id<>'anna' or salon_id<>'"+A+"'"),0);
   assert.equal(await count('select 1 from public.staff'),1);
   assert.equal(await value('select id value from public.staff'),'anna');
   assert.equal(await count('select 1 from public.services'),await count("select 1 from public.services where salon_id='"+A+"'"));
   assert.equal(await count('select 1 from public.payments'),0);
   assert.equal(await count('select 1 from public.email_log'),0);
   // Customers: the ones booked with her, and the ones she adds.
   assert.equal(await count('select 1 from public.customers'),1);
   assert.equal(await value('select id value from public.customers'),'ca');
   // Bookings and customers can be added and changed for herself.
   assert.equal(await attempt("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name) values('"+A+"','bk-new','consultation','Test consultation',20,30,current_date+4,'12:00','anna','Walk-in')"),'ok');
   assert.equal(await attempt("update public.bookings set notes='Called to confirm' where salon_id='"+A+"' and id='bk-new'"),'ok');
   assert.equal(await attempt("insert into public.customers(salon_id,id,name,email) values('"+A+"','cn','New Client','new@example.test')"),'ok');
   assert.equal(await attempt("update public.customers set phone='07700900123' where salon_id='"+A+"' and id='cn'"),'ok');
   assert.equal(await count('select 1 from public.customers'),2);
   assert.equal(await count('select 1 from public.bookings'),2);
   // Not for a colleague, not for the owner, not for another business.
   assert.equal(await attempt("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name) values('"+A+"','bk-ben','consultation','Test consultation',20,30,current_date+4,'13:00','ben','For Ben')"),'refused');
   assert.equal(await attempt("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name) values('"+A+"','bk-own','consultation','Test consultation',20,30,current_date+4,'13:00','owner','For owner')"),'refused');
   assert.equal(await attempt("update public.bookings set staff_id='ben' where salon_id='"+A+"' and id='bk-new'"),'refused');
   assert.equal(await attempt("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name) values('"+B+"','bk-x','consultation','Test consultation',20,30,current_date+4,'12:00','zed','Intruder')"),'refused');
   assert.equal(await attempt("insert into public.customers(salon_id,id,name,email) values('"+B+"','cx','Intruder','i@example.test')"),'refused');
   await q("update public.bookings set notes='hijack' where salon_id='"+B+"'");
   await q("update public.bookings set notes='hijack' where salon_id='"+A+"' and staff_id<>'anna'");
   await q("update public.customers set name='hijack' where salon_id='"+B+"'");
   assert.notEqual(await attempt("update public.bookings set salon_id='"+B+"' where salon_id='"+A+"' and id='bk-new'"),'ok');
   // No deleting, and nothing outside bookings and customers.
   await q("delete from public.bookings where salon_id='"+A+"'");await q("delete from public.customers where salon_id='"+A+"'");
   assert.equal(await count('select 1 from public.bookings'),2);assert.equal(await count('select 1 from public.customers'),2);
   assert.equal(await attempt("insert into public.services(salon_id,id,name,price,duration,category_id,staff_ids) values('"+A+"','svc2','Free cut',0,30,'',array['anna'])"),'refused');
   await q("update public.staff set name='Renamed' where salon_id='"+A+"'");
   await q("update public.services set price=0 where salon_id='"+A+"'");
   assert.equal(await attempt("insert into public.categories(salon_id,id,name) values('"+A+"','cat1','Cats')"),'refused');
   assert.equal(await attempt("insert into public.payments(salon_id,id,amount) values('"+A+"','p1',1)").then(v=>v.startsWith('refused')||v.startsWith('error')),true);
   await root();
   assert.equal(await count("select 1 from public.bookings where notes='hijack'"),0);
   assert.equal(await count("select 1 from public.customers where name='hijack'"),0);
   assert.equal(await count("select 1 from public.staff where name='Renamed'"),0);
   assert.equal(await count("select 1 from public.services where price=0"),0);
   // The owner still sees everything in their business.
   await as(OWNER_A);
   assert.equal(await count("select 1 from public.bookings where staff_id='anna'"),2);
   assert.equal(await count("select 1 from public.bookings where staff_id='owner'"),1);
   assert.equal(await count('select 1 from public.staff'),3);
   assert.equal(await count('select 1 from public.customers'),2+1);
   await root();
   // A colleague sees none of Anna's work.
   await as(BEN);
   assert.equal(await count('select 1 from public.bookings'),0);
   assert.equal(await count('select 1 from public.customers'),0);
   assert.equal(await count('select 1 from public.staff'),1);
   await root();
   // The other business's login sees its own data only.
   await q("insert into auth.users(id,email,email_confirmed_at) values('30000000-0000-4000-8000-000000000009','zed@example.test',now())");
   assert.equal((await value('select public.booking_team_worker($1,$2,$3) value',[token,'link',JSON.stringify({salon:B,staff_id:'zed',user:'30000000-0000-4000-8000-000000000009',email:'zed@example.test'})])).ok,true);
   await as('30000000-0000-4000-8000-000000000009');
   assert.equal(await value('select public.staff_salon_id() value'),B);
   assert.equal(await count('select 1 from public.bookings'),1);
   assert.equal(await value('select staff_id value from public.bookings'),'zed');
   assert.equal(await count("select 1 from public.customers where salon_id='"+A+"'"),0);
   assert.equal(await count("select 1 from public.bookings where salon_id='"+A+"'"),0);
   await root();
  });

  await t.test('the owner sees and manages the logins; other people cannot',async()=>{
   await as(OWNER_A);
   const list=await value('select public.owner_team_logins() value');
   assert.deepEqual(list.map(x=>x.staff_id).sort(),['anna','ben']);
   assert.equal(list.every(x=>!('user_id' in x)),true);
   assert.equal(await value('select public.staff_salon_id() value'),null);
   await as(OWNER_B);
   assert.deepEqual((await value('select public.owner_team_logins() value')).map(x=>x.staff_id),['zed']);
   await as(CUSTOMER);
   await assert.rejects(q('select public.team_account_access()'),/not a team login/);
   await as(OWNER_A);
   await assert.rejects(q('select public.team_account_access()'),/not a team login/);
   await as(CUSTOMER);
   assert.equal(await value('select public.staff_salon_id() value'),null);
   assert.equal(await count('select 1 from public.bookings'),0);
   await as('');
   await assert.rejects(q("select public.booking_team_worker('"+token+"','context','{}')"),/permission denied|Choose a team member/).catch(()=>{});
   await root();
  });

  await t.test('access stops when the plan, the member or the business changes',async()=>{
   await q("update jovabook_private.offer_accounts set plan='standard',seats=1 where salon_id=$1",[A]);
   await as(ANNA);
   let access=await value('select public.team_account_access() value');
   assert.equal(access.ok,false);assert.equal(access.access,'team_suspended');
   assert.equal(await count('select 1 from public.bookings'),0);assert.equal(await count('select 1 from public.customers'),0);
   assert.equal(await value('select public.team_workspace() value'),null);
   await root();
   await q("update jovabook_private.offer_accounts set plan='premium',seats=3 where salon_id=$1",[A]);
   await q("update public.staff set active=false where salon_id=$1 and id='anna'",[A]);
   await as(ANNA);
   access=await value('select public.team_account_access() value');assert.equal(access.access,'team_suspended');assert.match(access.message,/switched off/);
   assert.equal(await count('select 1 from public.bookings'),0);
   await root();
   await q("update public.staff set active=true where salon_id=$1 and id='anna'",[A]);
   await as(ANNA);assert.equal((await value('select public.team_account_access() value')).access,'active');await root();
  });

  await t.test('removing a login or a team member also removes the account',async()=>{
   const accounts=id=>count("select 1 from auth.users where id='"+id+"'");
   let r=await worker('email',{staff_id:'ben',email:'ben.new@example.test'});assert.equal(r.ok,true);
   assert.equal((await worker('context',{staff_id:'ben'})).email,'ben.new@example.test');
   r=await worker('unlink',{staff_id:'ben'});assert.equal(r.removed,true);assert.equal(r.user_id,BEN);
   assert.equal(await accounts(BEN),0);
   assert.equal((await worker('context',{staff_id:'ben'})).has_login,false);
   assert.equal((await worker('unlink',{staff_id:'ben'})).removed,false);
   assert.equal(await accounts(ANNA),1);
   await q("update public.bookings set status='cancelled' where salon_id=$1 and staff_id='anna'",[A]);
   await q("delete from public.staff where salon_id=$1 and id='anna'",[A]);
   assert.equal(await accounts(ANNA),0);
   assert.equal(await count("select 1 from jovabook_private.team_logins where salon_id='"+A+"'"),0);
   assert.equal(await count("select 1 from jovabook_private.portal_roles where user_id='"+ANNA+"'"),0);
  });
 }finally{await db.close();}
});
