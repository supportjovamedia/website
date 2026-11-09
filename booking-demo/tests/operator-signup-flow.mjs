import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const sql=await readFile(new URL('../supabase/migrations/20261109031716_operator_signup_flow.sql',import.meta.url),'utf8');
const script=await readFile(new URL('../operator-signup-flow.js',import.meta.url),'utf8');
const operator='10000000-0000-4000-8000-000000000001';
test('signup data is operator-only, keeps verification separate from business creation and excludes other portals',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema jovabook_private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,created_at timestamptz,email_confirmed_at timestamptz,raw_user_meta_data jsonb,last_sign_in_at timestamptz);
   create table public.salons(id uuid primary key,owner_id uuid,name text,owner_name text,created_at timestamptz);
   create table public.bookings(salon_id uuid,created_at timestamptz);
   create table jovabook_private.operators(email text);
   create table jovabook_private.team_logins(user_id uuid);
   create table jovabook_private.portal_roles(user_id uuid,role text);
   create table jovabook_private.operator_audit(actor_id uuid,action text);
   create function jovabook_private.require_operator() returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is distinct from '${operator}'::uuid then raise exception 'Operator only' using errcode='42501';end if;end$$;
   insert into auth.users(id,email,created_at,email_confirmed_at,raw_user_meta_data) values('${operator}','operator@example.test',now(),now(),'{"owner_name":"Operator"}');
   insert into jovabook_private.operators values('operator@example.test');`);
  const ids=Array.from({length:7},(_,i)=>'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
  for(let i=0;i<ids.length;i++)await db.query(`insert into auth.users(id,email,created_at,email_confirmed_at,raw_user_meta_data) values($1,$2,now()-interval '1 day',case when $3 then now() else null end,$4::jsonb)`,[ids[i],'person'+i+'@example.test',i!==0,JSON.stringify({owner_name:'Person '+i})]);
  await db.query("insert into public.salons values('30000000-0000-4000-8000-000000000001',$1,'First Studio','Person 2',now()),('30000000-0000-4000-8000-000000000002',$2,'Booked Studio','Person 3',now())",[ids[2],ids[3]]);
  await db.exec("insert into public.bookings values('30000000-0000-4000-8000-000000000002',now());");
  await db.query("insert into jovabook_private.portal_roles values($1,'customer'),($2,'team')",[ids[4],ids[5]]);
  await db.query('insert into jovabook_private.team_logins values($1)',[ids[6]]);
  await db.exec(sql);
  await db.exec('set role anon');await assert.rejects(db.query('select public.operator_signup_flow()'),/permission denied/);
  await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[1]]);await assert.rejects(db.query('select public.operator_signup_flow()'),/Operator only/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[operator]);
  const result=(await db.query('select public.operator_signup_flow() data')).rows[0].data;
  assert.deepEqual(result.counts,{signed_up:4,email_verified:3,business_created:2,first_booking:1,setup_pending:1,email_pending:1});
  assert.equal(result.recent.length,4);assert.deepEqual(new Set(result.recent.map(x=>x.stage)),new Set(['email_pending','setup_pending','business_created','first_booking']));
  assert(result.recent.every(x=>!Object.hasOwn(x,'raw_user_meta_data')&&!Object.hasOwn(x,'phone')&&!Object.hasOwn(x,'password')));
  await assert.rejects(db.query('select public.operator_signup_flow(3650)'),/Choose all time/);
  await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from jovabook_private.operator_audit where action='signup_flow'")).rows[0].n,1);
 }finally{await db.close();}
});

test('overview stages, pending accounts, search and unavailable states render without invented records or executable content',()=>{
 const window={};vm.runInNewContext(script,{window});const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const data={ok:true,counts:{signed_up:2,email_verified:1,business_created:0,first_booking:0,setup_pending:1},recent:[{name:'<script>bad()</script>',email:'verified@example.test',created_at:'2026-11-08T11:22:00Z',verified_at:'2026-11-08T11:24:00Z',stage:'setup_pending'},{name:'New person',email:'new@example.test',created_at:'2026-11-08T11:22:00Z',stage:'email_pending'}]};
 const render=(d,state)=>window.JovaOperatorSignupFlow.render(d,{esc,joined:v=>v||'Not recorded'},state);
 const all=render(data,{});assert(all.includes('verified@example.test'));assert(all.includes('Business setup pending'));assert(!all.includes('<script>'));assert(!all.includes('data-action="business"'));assert(all.includes('&lt;script&gt;'));
 const verified=render(data,{stage:'verified'});assert(verified.includes('verified@example.test'));assert(!verified.includes('new@example.test'));
 const filtered=render(data,{query:'NEW@'});assert(filtered.includes('new@example.test'));assert(!filtered.includes('verified@example.test'));
 assert(render(data,{stage:'booking'}).includes('No signups match this view.'));
 assert(render(null,{}).includes('Signup records are unavailable'));assert(!render(null,{}).includes('<strong>0</strong>'));
});
