import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {prepareSchemaSql} from '../scripts/jovabook-test-db.mjs';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const source=await readFile(new URL('../booking-demo/supabase/migrations/20261101054233_jovabook_recovery_scheduler.sql',import.meta.url),'utf8');
const route=await readFile(new URL('../app/api/jovabook/recovery/worker/route.js',import.meta.url),'utf8');
function validate(sql){
 const clean=sql.replace(/--[^\r\n]*/g,'').trim();
 assert.match(clean,/^begin\s*;/i);assert.match(clean,/commit\s*;$/i);
 assert.match(sql,/create function jovabook_private\.invoke_recovery_worker\(\) returns bigint\s+language plpgsql security definer set search_path=''/i);
 assert.match(sql,/revoke all on function jovabook_private\.invoke_recovery_worker\(\) from public,anon,authenticated/i);
 assert.match(sql,/if not coalesce\(config\.enabled and config\.recovery_enabled,false\) then return null/i);
 assert(sql.indexOf('config.enabled and config.recovery_enabled')<sql.indexOf('select decrypted_secret'));
 assert.match(sql,/where name='jovabook_integrations_worker_token'/);
 assert.match(sql,/secret is null or secret !~ '\^\[a-f0-9\]\{64\}\$'/);
 assert.match(sql,/config\.worker_hash<>encode\(sha256\(convert_to\(secret,'UTF8'\)\),'hex'\)/);
 assert.match(sql,/raise exception 'Recovery scheduler unavailable: worker credential is not configured correctly\.'/);
 const urls=[...sql.matchAll(/https:\/\/[^'\s]+/g)].map(x=>x[0]);assert.deepEqual(urls,['https://www.jovamedia.com/api/jovabook/recovery/worker']);
 const timeout=Number(sql.match(/timeout_milliseconds\s*:=\s*(\d+)/)?.[1]),budget=Number(route.match(/maxDuration\s*=\s*(\d+)/)?.[1])*1000;
 assert.equal(timeout,330000);assert(timeout>=budget+30000&&timeout<600000);
 assert.match(sql,/cron\.schedule_in_database\([\s\S]*?job_name:='jovabook-slot-recovery'[\s\S]*?schedule:='\* \* \* \* \*'[\s\S]*?command:='select jovabook_private\.invoke_recovery_worker\(\);'[\s\S]*?database:=current_database\(\),username:=current_user,active:=false/);
 assert.equal([...clean.matchAll(/\bnet\.http_post\s*\(/g)].length,1);assert.equal([...clean.matchAll(/\bcron\.schedule_in_database\s*\(/g)].length,1);
 assert.doesNotMatch(clean,/\bcron\.(?:alter_job|schedule|unschedule)\s*\(|\bactive\s*(?::=|=)\s*true/i);
 assert.doesNotMatch(clean,/\b(?:raise\s+(?:notice|debug|warning|log)|create_secret|update_secret|alter\s+system)\b/i);
 assert.doesNotMatch(clean,/'[a-f0-9]{64}'|(?:sk|rk)_(?:live|test)_[a-z0-9]+|eyJ[a-zA-Z0-9_-]+\./i);
 assert.doesNotMatch(clean,/update\s+jovabook_private\.integration_config|set\s+enabled\s*=\s*true/i);
}
test('scheduler source is private, guarded, fixed-target, finite-timeout and inactive',()=>{validate(source);assert.throws(()=>prepareSchemaSql(source),/Network, scheduling/);});
test('source validator rejects activation, unsafe destinations, short timeouts, exposed permissions and secrets',()=>{for(const changed of [source.replace('active:=false','active:=true'),source.replace('https://www.jovamedia.com','https://evil.example.test'),source.replace('timeout_milliseconds:=330000','timeout_milliseconds:=55000'),source.replace('revoke all on function','grant execute on function'),source.replace('config.enabled and config.recovery_enabled','config.enabled'),source+"\nraise notice 'debug';",source+"\nselect '"+'a'.repeat(64)+"';"])assert.throws(()=>validate(changed));});

async function fixture(){const db=new PGlite();await db.exec(`
 create role anon;create role authenticated;create schema jovabook_private;
 create table jovabook_private.integration_config(singleton boolean primary key,enabled boolean,recovery_enabled boolean,worker_hash text);
 insert into jovabook_private.integration_config values(true,false,false,null);
 create schema vault;create table vault.fixture_secrets(name text primary key,decrypted_secret text);
 create view vault.decrypted_secrets as select name,decrypted_secret from vault.fixture_secrets;
 create schema net;create table net.fixture_calls(id bigint generated always as identity,url text,body jsonb,headers jsonb,timeout_ms int);
 create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 5000) returns bigint language plpgsql as $$declare result bigint;begin insert into net.fixture_calls(url,body,headers,timeout_ms) values(url,body,headers,timeout_milliseconds) returning id into result;return result;end$$;
 create schema cron;create table cron.job(jobid bigint generated always as identity,jobname text,schedule text,command text,database text,username text,active boolean);
 create function cron.schedule_in_database(job_name text,schedule text,command text,database text,username text default null,active boolean default true) returns bigint language plpgsql as $$declare result bigint;begin insert into cron.job(jobname,schedule,command,database,username,active) values(job_name,schedule,command,database,username,active) returning jobid into result;return result;end$$;
 `);return db;}
const withoutExtensions=source.replace(/^create extension if not exists (?:pg_cron|pg_net);\r?$/gm,'');
test('local SQL stubs prove inactive creation, both flag guards, unavailable credentials and revoked execution',async t=>{
 const db=await fixture(),q=(sql,args=[])=>db.query(sql,args),invoke=()=>q('select jovabook_private.invoke_recovery_worker() id');
 const token='a'.repeat(64);try{
  await db.exec(withoutExtensions);
  await t.test('job starts inactive and contains only a private function call',async()=>{const job=(await q('select * from cron.job')).rows[0];assert.equal(job.active,false);assert.equal(job.schedule,'* * * * *');assert.equal(job.command,'select jovabook_private.invoke_recovery_worker();');assert.equal((await q('select count(*)::int n from net.fixture_calls')).rows[0].n,0);});
  await t.test('either disabled flag suppresses transport even with missing Vault credential',async()=>{for(const [enabled,recovery] of [[false,false],[true,false],[false,true]]){await q('update jovabook_private.integration_config set enabled=$1,recovery_enabled=$2',[enabled,recovery]);assert.equal((await invoke()).rows[0].id,null);}assert.equal((await q('select count(*)::int n from net.fixture_calls')).rows[0].n,0);});
  await t.test('enabled but absent, malformed or hash-mismatched credentials fail without logging their value',async()=>{await q('update jovabook_private.integration_config set enabled=true,recovery_enabled=true');for(const value of [null,'invalid-fixture',token]){await db.exec('delete from vault.fixture_secrets');if(value)await q("insert into vault.fixture_secrets values('jovabook_integrations_worker_token',$1)",[value]);await assert.rejects(invoke(),e=>{assert.match(e.message,/Recovery scheduler unavailable: worker credential/);assert(!e.message.includes(token));assert(!e.message.includes('invalid-fixture'));return true;});}assert.equal((await q('select count(*)::int n from net.fixture_calls')).rows[0].n,0);});
  await t.test('valid synthetic credentials enqueue exact fixed arguments into local stub only',async()=>{await q("update jovabook_private.integration_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);assert.equal((await invoke()).rows[0].id,1);const call=(await q('select * from net.fixture_calls')).rows[0];assert.equal(call.url,'https://www.jovamedia.com/api/jovabook/recovery/worker');assert.deepEqual(call.body,{});assert.equal(call.headers.Authorization,'Bearer '+token);assert.equal(call.timeout_ms,330000);assert.equal((await q('select active from cron.job')).rows[0].active,false);});
  await t.test('application roles cannot execute the definer wrapper',async()=>{for(const role of ['anon','authenticated']){assert.equal((await q("select has_function_privilege($1,'jovabook_private.invoke_recovery_worker()','execute') allowed",[role])).rows[0].allowed,false);await db.exec('set role '+role);await assert.rejects(invoke(),/permission denied/);await db.exec('reset role');}assert.equal((await q('select count(*)::int n from net.fixture_calls')).rows[0].n,1);});
 }finally{await db.close();}
});
test('an existing named job is not overwritten or activated by installation',async()=>{const db=await fixture();try{await db.exec("insert into cron.job(jobname,schedule,command,active) values('jovabook-slot-recovery','0 * * * *','select 1',false)");await assert.rejects(db.exec(withoutExtensions),/already exists/);await db.exec('rollback');const job=(await db.query('select * from cron.job')).rows[0];assert.equal(job.schedule,'0 * * * *');assert.equal(job.command,'select 1');assert.equal(job.active,false);assert.equal((await db.query("select to_regprocedure('jovabook_private.invoke_recovery_worker()') name")).rows[0].name,null);}finally{await db.close();}});
test('a configured HTTP ceiling below the route budget fails safely without any job',async()=>{const db=await fixture();try{await db.query("select set_config('pg_net.max_timeout_ms','55000',false)");await assert.rejects(db.exec(withoutExtensions),/timeout ceiling is too low/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from cron.job')).rows[0].n,0);}finally{await db.close();}});
