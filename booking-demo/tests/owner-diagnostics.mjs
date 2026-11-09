import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const source=await readFile(new URL('../owner-diagnostics.js',import.meta.url),'utf8');
const sql=await readFile(new URL('../supabase/migrations/20261109033558_owner_flow_errors.sql',import.meta.url),'utf8');
const person='10000000-0000-4000-8000-000000000001',operator='10000000-0000-4000-8000-000000000002';
test('diagnostic writer has no read access, derives identity, validates input, deduplicates, caps writes and purges old rows',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema jovabook_private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
   create table jovabook_private.operator_audit(actor_id uuid,action text);
   create function jovabook_private.require_operator() returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is distinct from '${operator}'::uuid then raise exception 'Operator only' using errcode='42501';end if;end$$;
   insert into auth.users values('${person}','owner@example.test','{"owner_name":"Owner"}'),('${operator}','operator@example.test','{}');`);
  await db.exec(sql);
  await db.exec('set role anon');
  const id=webcrypto.randomUUID();
  assert.equal((await db.query("select public.report_owner_flow_event($1,'login','request_rejected',400) data",[id])).rows[0].data.stored,true);
  assert.equal((await db.query("select public.report_owner_flow_event($1,'login','request_rejected',400) data",[id])).rows[0].data.stored,false);
  assert.equal((await db.query("select public.report_owner_flow_event($1,'login','secret@example.test',400) data",[webcrypto.randomUUID()])).rows[0].data.ok,false);
  await assert.rejects(db.query('select * from jovabook_private.owner_flow_events'),/permission denied/);
  await assert.rejects(db.query('select public.operator_owner_flow_events()'),/permission denied/);
  await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[person]);
  await assert.rejects(db.query('select public.operator_owner_flow_events()'),/Operator only/);
  for(let n=0;n<20;n++)assert.equal((await db.query("select public.report_owner_flow_event($1,'business_setup','request_rejected',409) data",[webcrypto.randomUUID()])).rows[0].data.stored,true);
  assert.equal((await db.query("select public.report_owner_flow_event($1,'setup','server_error',500) data",[webcrypto.randomUUID()])).rows[0].data.stored,false);
  await db.exec('reset role');await db.query("insert into jovabook_private.owner_flow_events values($1,null,now()-interval '31 days','login','request_rejected',400)",[webcrypto.randomUUID()]);
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[operator]);
  const result=(await db.query('select public.operator_owner_flow_events() data')).rows[0].data;
  assert.equal(result.events.length,21);assert.equal(result.events.filter(e=>e.user_id===person).length,20);assert.equal(result.events.filter(e=>e.email==='owner@example.test').length,20);
  assert(!JSON.stringify(result).includes('secret@example.test'));
  await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from jovabook_private.owner_flow_events where created_at<now()-interval '30 days'")).rows[0].n,0);
 }finally{await db.close();}
});
test('browser reporter sends only fixed classifications, never messages, form data, URLs or submitted email',async()=>{
 const calls=[],listeners={};
 const window={JOVA_SUPABASE:{url:'https://fixture.example.test',key:'public-key'},addEventListener:(key,fn)=>listeners[key]=fn};
 vm.runInNewContext(source,{window,location:{pathname:'/',hash:'',search:''},URLSearchParams,crypto:webcrypto,Date,Map,AbortController,setTimeout,clearTimeout,fetch:async(url,init)=>{calls.push({url,init});return {ok:true};}});
 const d=window.JovaOwnerDiagnostics;
 d.failure('/auth/v1/signup?redirect_to=SECRET_TOKEN',500,{message:'PASSWORD PRIVATE_EMAIL@example.test'},null);
 d.failure('/auth/v1/signup?redirect_to=OTHER_SECRET',500,{},null);
 d.failure('/rest/v1/rpc/save_setup',409,{message:'private address'},'owner-token');
 d.failure('/rest/v1/rpc/save_private_customer_notes',500,{},'owner-token');
 d.report('login','PRIVATE_PASSWORD',500);
 assert.equal(calls.length,2);
 for(const c of calls){const body=JSON.parse(c.init.body);assert.deepEqual(Object.keys(body).sort(),['p_code','p_id','p_session','p_stage','p_status','p_step']);assert(!c.init.body.includes('SECRET'));assert(!c.init.body.includes('PASSWORD'));assert(!c.init.body.includes('private'));assert.equal(c.init.referrerPolicy,'no-referrer');}
 assert.equal(calls[1].init.headers.Authorization,'Bearer owner-token');
 assert(!calls[1].init.body.includes('owner-token'));
 for(let n=0;n<20;n++)d.report('runtime','runtime_error',n);
 assert.equal(calls.length,20);
});

test('visitor grouping survives reload, uses authenticated headers, and rotates on logout or account switch',()=>{
 const storage=new Map(),calls=[];
 function boot(search=''){
  const window={JOVA_SUPABASE:{url:'https://fixture.example.test',key:'public-key'},addEventListener:()=>{}};
  vm.runInNewContext(source,{window,location:{pathname:'/',hash:'',search},URLSearchParams,crypto:webcrypto,Date,Map,AbortController,setTimeout,clearTimeout,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return {ok:true};}});
  return window.JovaOwnerDiagnostics;
 }
 let d=boot();d.onboarding('email');const first=calls.at(-1).body.p_session;
 d=boot();d.onboarding('profile');assert.equal(calls.at(-1).body.p_session,first);
 d.setSession({user:{id:person},access_token:'session-secret',expires_at:Date.now()/1000+60});
 assert.equal(calls.at(-1).init.headers.Authorization,'Bearer session-secret');assert.equal(calls.at(-1).body.p_session,first);
 d.view('calendar');assert.equal(calls.at(-1).body.p_step,'calendar');assert(!JSON.stringify(calls.at(-1).body).includes('session-secret'));assert(!JSON.stringify(calls.at(-1).body).includes(person));
 d.setSession(null);d.onboarding('email');const next=calls.at(-1).body.p_session;assert.notEqual(next,first);assert(!calls.at(-1).init.headers.Authorization);
 d.setSession({user:{id:person},access_token:'session-secret',expires_at:Date.now()/1000+60});
 d.setSession({user:{id:operator},access_token:'other-token',expires_at:Date.now()/1000+60});assert.notEqual(calls.at(-1).body.p_session,next);
 const before=calls.length;d.view('customer/private-client');d.onboarding('password=SECRET');assert.equal(calls.length,before);
 const excluded=boot('?portal=customer');excluded.onboarding('email');assert.equal(calls.length,before);
});
