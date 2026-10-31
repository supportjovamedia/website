#!/usr/bin/env node
/* This CLI owns one embedded test database. It is never an application adapter. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import http2 from 'node:http2';
import dns from 'node:dns';

const require=createRequire(import.meta.url);
export const REPO_ROOT=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const BASE_DIR=path.join(REPO_ROOT,'.jovabook-test');
export const DATA_DIR=path.join(BASE_DIR,'data');
const MARKER_FILE=path.join(BASE_DIR,'marker.json'),LOCK_FILE=path.join(BASE_DIR,'cli.lock');
const FORMAT='jovabook-isolated-local-test-v1',FIXTURES='fictional-example-test-v1';
const SOURCE_FILES=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql'];
const OWNERS=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
const SALONS=['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'];
const HELP=`JovaBook isolated local SQL test database

  node scripts/jovabook-test-db.mjs init
  node scripts/jovabook-test-db.mjs status
  node scripts/jovabook-test-db.mjs verify
  node scripts/jovabook-test-db.mjs reset --confirm=test-only

Storage is fixed to .jovabook-test/data in this repository.
No URL, alternate path, hosted database, Auth server or email transport is accepted.
Reset rebuilds only the marked fictional test schemas using SQL. It does not delete directories.
`;

export function parseArguments(args){
 if(args.length===0||args.length===1&&['--help','-h','help'].includes(args[0]))return {command:'help'};
 const [command,...options]=args;
 if(!['init','status','verify','reset'].includes(command))throw Error('Use init, status, verify or reset. No URL or path argument is accepted.');
 if(command==='reset'){if(options.length!==1||options[0]!=='--confirm=test-only')throw Error('Reset requires the literal option --confirm=test-only. It rebuilds only fictional local test data.');}
 else if(options.length)throw Error('This command accepts no options. URLs and alternate paths are forbidden.');
 return {command};
}

export function assertLocalEnvironment(env=process.env){
 const forbidden=/(?:^|_)(?:DATABASE_(?:URL|URI|HOST|PORT|USER|PASSWORD|PATH)|DIRECT_URL|DB_(?:URL|URI|HOST|PORT|USER|PASSWORD|PATH)|SUPABASE(?:_.*)?)$|^(?:POSTGRES(?:QL)?_.*|PGLITE_.*|PG(?:HOST|HOSTADDR|PORT|USER|PASSWORD|DATABASE|SERVICE|SERVICEFILE|PASSFILE|OPTIONS|SSLMODE)|RESEND_API_KEY|JOVABOOK_EMAIL_WORKER_TOKEN|SMTP_.*|SENDGRID_API_KEY|MAILGUN_API_KEY)$/i;
 const names=Object.keys(env).filter(name=>env[name]&&forbidden.test(name));
 if(names.length)throw Error('Refusing database or delivery configuration in the environment: '+names.sort().join(', ')+'. Run this CLI in a clean local shell; values are never printed.');
 if(env.NODE_ENV==='production'||['VERCEL','NETLIFY','AWS_LAMBDA_FUNCTION_NAME','K_SERVICE','FUNCTIONS_WORKER_RUNTIME'].some(name=>env[name]))throw Error('This embedded test CLI must not run in a production or hosted application runtime.');
}

export function installOfflineGuard(){
 const blocked=()=>{throw Error('Network transport is disabled in the isolated JovaBook test database CLI.');};
 globalThis.fetch=blocked;
 globalThis.WebSocket=class {constructor(){blocked();}};
 for(const transport of [http,https]){transport.request=blocked;transport.get=blocked;}
 net.connect=blocked;net.createConnection=blocked;net.Socket.prototype.connect=blocked;net.Server.prototype.listen=blocked;tls.connect=blocked;
 dgram.createSocket=blocked;dgram.Socket.prototype.send=blocked;dgram.Socket.prototype.connect=blocked;http2.connect=blocked;
 for(const key of Object.keys(dns))if(/^(?:lookup|resolve|reverse)/.test(key)&&typeof dns[key]==='function')dns[key]=blocked;
 for(const key of Object.keys(dns.promises))if(/^(?:lookup|resolve|reverse)/.test(key)&&typeof dns.promises[key]==='function')dns.promises[key]=blocked;
 for(const Resolver of [dns.Resolver,dns.promises.Resolver])for(const key of Object.getOwnPropertyNames(Resolver.prototype))if(/^(?:resolve|reverse)/.test(key)&&typeof Resolver.prototype[key]==='function')Resolver.prototype[key]=blocked;
}

async function lstatOrNull(file,io=fs){try{return await io.lstat(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function inside(parent,child){const relative=path.relative(parent,child);return relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
async function rejectLinks(directory,io){
 for(const item of await io.readdir(directory,{withFileTypes:true})){const file=path.join(directory,item.name),stat=await io.lstat(file);if(stat.isSymbolicLink())throw Error('Refusing symbolic link or junction inside the test storage.');if(stat.isDirectory())await rejectLinks(file,io);else if(!stat.isFile())throw Error('Refusing a non-regular file inside the test storage.');}
}

export async function assertPathSafety({io=fs,allowMissing=false}={}){
 const realRoot=await io.realpath(REPO_ROOT),baseStat=await lstatOrNull(BASE_DIR,io);
 if(!inside(REPO_ROOT,BASE_DIR)||!inside(BASE_DIR,DATA_DIR)||path.basename(BASE_DIR)!=='.jovabook-test'||path.basename(DATA_DIR)!=='data')throw Error('Unexpected test database path.');
 if(!baseStat){if(allowMissing)return {exists:false,realRoot};throw Error('Test database is not initialized. Run the init command.');}
 if(baseStat.isSymbolicLink()||!baseStat.isDirectory())throw Error('Refusing a symbolic link, junction or non-directory test storage path.');
 const realBase=await io.realpath(BASE_DIR);
 if(path.dirname(realBase)!==realRoot||path.basename(realBase)!=='.jovabook-test')throw Error('Resolved test storage is outside the expected repository.');
 await rejectLinks(BASE_DIR,io);
 const markerStat=await lstatOrNull(MARKER_FILE,io);
 if(!markerStat||!markerStat.isFile()||markerStat.isSymbolicLink())throw Error('Missing or unsafe test-only marker. Existing storage will not be changed.');
 let marker;try{marker=JSON.parse(await io.readFile(MARKER_FILE,'utf8'));}catch{throw Error('Unreadable test-only marker. Existing storage will not be changed.');}
 const expected={format:FORMAT,fixtures:FIXTURES,repository:realRoot,storage:'.jovabook-test/data',network:'disabled'};
 if(Object.keys(marker).sort().join('|')!==Object.keys(expected).sort().join('|')||Object.entries(expected).some(([key,value])=>marker[key]!==value))throw Error('Unexpected test-only marker. Existing storage will not be changed.');
 const dataStat=await lstatOrNull(DATA_DIR,io);
 if(dataStat&&(!dataStat.isDirectory()||dataStat.isSymbolicLink()||path.dirname(await io.realpath(DATA_DIR))!==realBase))throw Error('Refusing an unsafe database directory.');
 return {exists:true,dataExists:!!dataStat,realRoot};
}

async function createOwnedStorage(){
 const existing=await lstatOrNull(BASE_DIR);
 if(existing){if(existing.isSymbolicLink()||!existing.isDirectory())throw Error('Refusing unsafe existing test storage.');const entries=await fs.readdir(BASE_DIR);if(entries.length){return assertPathSafety();}}
 else await fs.mkdir(BASE_DIR,{mode:0o700});
 const realRoot=await fs.realpath(REPO_ROOT),realBase=await fs.realpath(BASE_DIR);
 if(path.dirname(realBase)!==realRoot||path.basename(realBase)!=='.jovabook-test')throw Error('Unexpected resolved test storage path.');
 await fs.writeFile(MARKER_FILE,JSON.stringify({format:FORMAT,fixtures:FIXTURES,repository:realRoot,storage:'.jovabook-test/data',network:'disabled'},null,2)+'\n',{flag:'wx',mode:0o600});
 return assertPathSafety();
}

async function withLock(run){
 await assertPathSafety();const nonce=randomUUID();let handle;
 try{handle=await fs.open(LOCK_FILE,'wx',0o600);}catch(error){if(error.code==='EEXIST')throw Error('Test database is busy or a previous CLI stopped unexpectedly. Inspect .jovabook-test/cli.lock and ensure no CLI is running before removing only that lock file.');throw error;}
 try{await handle.writeFile(JSON.stringify({pid:process.pid,nonce,startedAt:new Date().toISOString()})+'\n');await assertPathSafety();return await run();}
 finally{await handle.close();const stat=await lstatOrNull(LOCK_FILE);if(stat?.isFile()&&!stat.isSymbolicLink()){try{const lock=JSON.parse(await fs.readFile(LOCK_FILE,'utf8'));if(lock.nonce===nonce)await fs.unlink(LOCK_FILE);}catch{ /* A changed lock is never removed. */ }}}
}

/* Split SQL without breaking function bodies, quoted strings or nested comments. */
export function splitSqlStatements(sql){
 const statements=[];let start=0,index=0,quote='',dollar='',block=0,line=false,escapeString=false;
 while(index<sql.length){const c=sql[index],next=sql[index+1];
  if(line){if(c==='\n'||c==='\r')line=false;index++;continue;}
  if(block){if(c==='/'&&next==='*'){block++;index+=2;}else if(c==='*'&&next==='/'){block--;index+=2;}else index++;continue;}
  if(dollar){if(sql.startsWith(dollar,index)){index+=dollar.length;dollar='';}else index++;continue;}
  if(quote){if(c==='\\'&&escapeString){index+=2;continue;}if(c===quote){if(next===quote)index+=2;else{quote='';index++;}}else index++;continue;}
  if(c==='-'&&next==='-'){line=true;index+=2;continue;}if(c==='/'&&next==='*'){block=1;index+=2;continue;}
  if(c==="'"||c==='"'){quote=c;escapeString=c==="'"&&/[eE]/.test(sql[index-1]||'')&&!/[A-Za-z0-9_$]/.test(sql[index-2]||'');index++;continue;}
  if(c==='$'){const match=sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);if(match){dollar=match[0];index+=dollar.length;continue;}}
  if(c===';'){statements.push(sql.slice(start,index+1));start=index+1;}index++;
 }
 if(quote||dollar||block)throw Error('Unclosed SQL quote, function body or comment.');
 if(sql.slice(start).trim())statements.push(sql.slice(start));return statements;
}

function withoutLeadingComments(text){let out=text;for(;;){out=out.trimStart();if(out.startsWith('--')){const end=out.search(/[\r\n]/);out=end<0?'':out.slice(end+1);continue;}if(out.startsWith('/*')){let depth=1,index=2;while(depth&&index<out.length){if(out.startsWith('/*',index)){depth++;index+=2;}else if(out.startsWith('*/',index)){depth--;index+=2;}else index++;}if(depth)throw Error('Unclosed SQL comment.');out=out.slice(index);continue;}return out;}}
export function prepareSchemaSql(source){
 if(/\b(?:net|cron|http|dblink)\s*\.|\b(?:pg_net|pg_cron|dblink_connect|http_get|http_post)\b|\bcreate\s+(?:foreign\s+data\s+wrapper|server)\b|\bcopy\b[\s\S]{0,100}\bprogram\b/i.test(source))throw Error('Network, scheduling or external transport SQL is not supported in the isolated database.');
 return splitSqlStatements(source).filter(statement=>{const head=withoutLeadingComments(statement),extension=head.match(/^create\s+extension\s+(?:if\s+not\s+exists\s+)?(?:"([^"]+)"|([\w]+))/i);if(!extension)return true;if((extension[1]||extension[2]).toLowerCase()==='pgcrypto')return false;throw Error('Unsupported extension in local test schema.');}).join('\n');
}

async function sources(){const entries=await Promise.all(SOURCE_FILES.map(async name=>{const raw=await fs.readFile(path.join(REPO_ROOT,'booking-demo','supabase',name),'utf8');return {name,sql:prepareSchemaSql(raw),sha256:createHash('sha256').update(raw).digest('hex')};}));return {entries,hashes:Object.fromEntries(entries.map(entry=>[entry.name,entry.sha256]))};}
async function metadata(db){const exists=(await db.query("select to_regclass('jovabook_test.metadata')::text name")).rows[0].name;if(!exists)return null;return (await db.query('select * from jovabook_test.metadata where singleton')).rows[0]||null;}
async function assertOwnedDatabase(db,{allowEmpty=false}={}){const meta=await metadata(db);if(meta){if(meta.format!==FORMAT||meta.fixtures!==FIXTURES)throw Error('Unexpected internal database marker. Refusing this database.');return meta;}const known=(await db.query("select to_regclass('public.salons')::text name")).rows[0].name;if(allowEmpty&&!known)return null;throw Error('Missing internal test-only database marker. Existing data will not be changed.');}
async function bootstrap(db,source){
 await db.exec(`create schema if not exists jovabook_test;revoke all on schema jovabook_test from public;
 create table jovabook_test.metadata(singleton boolean primary key default true check(singleton),format text not null,fixtures text not null,source_hashes jsonb not null,initialized_at timestamptz);
 create schema auth;create table auth.users(id uuid primary key);
 do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role;end if;end$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.query('insert into jovabook_test.metadata(format,fixtures,source_hashes) values($1,$2,$3)',[FORMAT,FIXTURES,JSON.stringify(source.hashes)]);
 await db.exec(source.entries[0].sql);
 // Match the hosted table privileges before the later migrations revoke sensitive writes.
 await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select on all tables in schema public to anon;');
 for(const entry of source.entries.slice(1))await db.exec(entry.sql);
 await db.exec(`update jovabook_private.email_config set enabled=false,worker_token_hash=null,webhook_secret=null,webhook_id=null,sender='bookings@example.test',public_url='https://booking.example.test';`);
 for(let index=0;index<2;index++){
  const number=index+1,email='owner-'+number+'@example.test',client='client-'+number+'@example.test';
  await db.query('insert into auth.users(id) values($1)',[OWNERS[index]]);
  await db.query(`insert into public.salons(id,owner_id,name,slug,owner_name,email,email_norm,address,phone,settings,status) values($1,$2,$3,$4,$5,$6,$6,'Fictional test address','00000000000',$7,'active')`,[SALONS[index],OWNERS[index],'Fictional Business '+number,'fictional-business-'+number,'Test Owner '+number,email,JSON.stringify({seeded:true,hours:{start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]},buffer:0,notice:0,workspace:{}})]);
  await db.query("insert into public.categories(salon_id,id,name) values($1,'consultations','Consultations')",[SALONS[index]]);
  await db.query("insert into public.staff(salon_id,id,name,role) values($1,'owner','Test calendar','Owner')",[SALONS[index]]);
  await db.query("insert into public.services(salon_id,id,name,price,duration,category_id,staff_ids) values($1,'consultation','Test consultation',25,30,'consultations',array['owner'])",[SALONS[index]]);
  await db.query("insert into public.customers(salon_id,id,name,email,notes) values($1,'test-client',$2,$3,'Fictional test fixture only')",[SALONS[index],'Test Client '+number,client]);
  const date=(await db.query("select ((now() at time zone 'Europe/London')::date+14)::text date")).rows[0].date;
  const booking=(await db.query("select public.create_booking($1,'consultation','owner',$2,'10:00',$3,$4,'','','Card') result",['fictional-business-'+number,date,'Test Client '+number,client])).rows[0].result;
  if(!booking.ok)throw Error('Could not seed fictional booking fixtures.');
 }
 await db.exec('update jovabook_test.metadata set initialized_at=now() where singleton;');
}

async function assertOfflineState(db){
 const config=(await db.query('select enabled,worker_token_hash,webhook_secret,webhook_id from jovabook_private.email_config where singleton')).rows[0];
 if(!config||config.enabled||config.worker_token_hash!==null||config.webhook_secret!==null||config.webhook_id!==null)throw Error('Unsafe test delivery configuration. Refusing further operations; this CLI requires delivery disabled and no worker/webhook credentials.');
 const forbidden=(await db.query("select extname from pg_extension where extname in ('pg_net','pg_cron','http','dblink','postgres_fdw')")).rows;
 if(forbidden.length)throw Error('Unexpected network or scheduling extension in test database.');
 const synthetic=(await db.query("select (select count(*) from public.salons where email !~ '^[^@]+@example[.]test$')+(select count(*) from public.customers where email !~ '^[^@]+@example[.]test$')+(select count(*) from public.bookings where email !~ '^[^@]+@example[.]test$')+(select count(*) from jovabook_private.email_queue where recipient !~ '^[^@]+@example[.]test$') invalid")).rows[0];
 if(Number(synthetic.invalid)!==0)throw Error('Non-fixture recipient data detected. Only synthetic @example.test addresses are allowed.');
}

async function status(db,source){const meta=await assertOwnedDatabase(db);if(!meta.initialized_at)throw Error('Initialization did not complete. Use reset --confirm=test-only to rebuild these local fixtures.');await assertOfflineState(db);const counts=(await db.query("select (select count(*)::int from salons) businesses,(select count(*)::int from customers) clients,(select count(*)::int from bookings) bookings,(select count(*)::int from jovabook_private.email_queue) queued_records")).rows[0];const sourceDrift=Object.keys(meta.source_hashes).length!==Object.keys(source.hashes).length||Object.entries(source.hashes).some(([name,hash])=>meta.source_hashes[name]!==hash);return {database:'isolated local PGlite',storage:DATA_DIR,initialized:true,initializedAt:meta.initialized_at,fixtures:FIXTURES,sourceDrift,emailDeliveryEnabled:false,workerKeyConfigured:false,network:'disabled',authServer:false,...counts};}

async function verify(db,source){
 const summary=await status(db,source);if(summary.sourceDrift)throw Error('Schema sources changed. Rebuild the marked local fixtures with reset --confirm=test-only.');const checks=[];let savepoint=0;
 const assert=(condition,message)=>{if(!condition)throw Error('Verification failed: '+message);};
 async function denied(sql,args=[]){const point='denied_'+(++savepoint);await db.exec('savepoint '+point);let rejected=false;try{await db.query(sql,args);}catch(error){if(!['42501','23514'].includes(error.code))throw error;rejected=true;}finally{await db.exec('rollback to savepoint '+point+';release savepoint '+point);}assert(rejected,'cross-tenant or privileged SQL was accepted');}
 await db.exec('begin');
 try{
  for(let index=0;index<2;index++){
   await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[OWNERS[index]]);await db.exec('set local role authenticated');
   const salons=(await db.query('select id from public.salons')).rows;assert(salons.length===1&&salons[0].id===SALONS[index],'owner salon visibility');
   for(const table of ['categories','staff','services','customers','bookings','email_log','payments','subscription_change_requests']){const rows=(await db.query('select salon_id from public.'+table)).rows;assert(rows.every(row=>row.salon_id===SALONS[index]),'owner row isolation for '+table);}
   await denied("insert into public.customers(salon_id,id,name,email) values($1,'cross-tenant-probe','Synthetic probe','probe@example.test')",[SALONS[1-index]]);
   await denied("update public.customers set salon_id=$1 where id='test-client'",[SALONS[1-index]]);
   const removed=(await db.query('delete from public.customers where salon_id=$1 returning id',[SALONS[1-index]])).rows;assert(removed.length===0,'cross-tenant delete');
   await denied("update public.email_log set status='Delivered'");
   await denied('select * from jovabook_private.email_queue');
   await denied("select public.request_plan_change('standard',$1)",[SALONS[1-index]]);
   checks.push('Owner '+(index+1)+': own reads, cross-business writes denied, email log read-only, private queue denied');
  }
  await db.exec('reset role;set local role anon');
  assert(Number((await db.query('select count(*) count from public.customers')).rows[0].count)===0,'anonymous client rows');
  assert(Number((await db.query('select count(*) count from public.bookings')).rows[0].count)===0,'anonymous booking rows');
  const publicView=(await db.query("select public.public_salon('fictional-business-1') info")).rows[0].info;
  assert(publicView?.slug==='fictional-business-1'&&!JSON.stringify(publicView).includes('client-1@example.test')&&!JSON.stringify(publicView).includes('Test Client 1'),'public booking data privacy');
  await denied('select public.email_delivery_info()');
  checks.push('Anonymous: no client/booking table access; public booking details omit client identity');
  await db.exec('reset role');await assertOfflineState(db);checks.push('Delivery disabled, no worker/webhook credentials, no transport extensions, synthetic recipients only');
 }finally{await db.exec('rollback');}
 return {...summary,verified:true,checks};
}

export async function runCli(args=process.argv.slice(2),env=process.env){
 const {command}=parseArguments(args);if(command==='help'){process.stdout.write(HELP);return;}
 assertLocalEnvironment(env);installOfflineGuard();const source=await sources();
 const safety=await assertPathSafety({allowMissing:command==='init'||command==='status'});
 if(command==='status'&&(!safety.exists||!safety.dataExists)){process.stdout.write(JSON.stringify({database:'isolated local PGlite',storage:DATA_DIR,initialized:false,network:'disabled',authServer:false},null,2)+'\n');return;}
 if(command==='init'&&!safety.exists)await createOwnedStorage();
 if(command==='init'&&safety.exists&&!safety.dataExists)await assertPathSafety();
 return withLock(async()=>{
  const {PGlite}=require('@electric-sql/pglite');const db=new PGlite(DATA_DIR);
  try{
   if(command==='init'){const existing=await assertOwnedDatabase(db,{allowEmpty:true});if(!existing)await bootstrap(db,source);else if(!existing.initialized_at)throw Error('Incomplete local initialization. Run reset --confirm=test-only.');}
   else if(command==='reset'){
    await assertPathSafety();await assertOwnedDatabase(db,{allowEmpty:true});
    await db.exec('reset role;drop schema if exists jovabook_private cascade;drop schema if exists jovabook_test cascade;drop schema if exists public cascade;drop schema if exists auth cascade;create schema public;');
    await bootstrap(db,source);
   }
   const result=command==='verify'?await verify(db,source):await status(db,source);
   process.stdout.write(JSON.stringify({...result,command},null,2)+'\n');return result;
  }finally{await db.close();}
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCli().catch(error=>{console.error('JovaBook test database: '+error.message);process.exitCode=1;});
