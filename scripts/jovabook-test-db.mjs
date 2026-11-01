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
export const MANIFEST_VERSION=2,BOOTSTRAP_VERSION=2;
export const SOURCE_FILES=Object.freeze(['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql',
 'migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031225418_jovabook_website_images.sql',
 'migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql',
 'migrations/20261101005929_jovabook_customer_portal.sql','migrations/20261101013754_jovabook_monthly_commission.sql',
 'migrations/20261101014425_jovabook_booking_horizon.sql','migrations/20261101023215_jovabook_website_image_scope_fix.sql',
 'migrations/20261101045624_jovabook_premium_website.sql',
 'migrations/20261101051342_jovabook_business_integrations.sql','migrations/20261101051423_jovabook_annual_billing.sql',
 'migrations/20261101054615_jovabook_commission_supervisor.sql']);
export const OMITTED_SOURCE_FILES=Object.freeze(['migrations/20261031162535_jovabook_email_scheduler.sql',
 'migrations/20261101054233_jovabook_recovery_scheduler.sql','migrations/20261101055544_jovabook_commission_scheduler.sql']);
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
 const providers=/^(?:STRIPE_.*|SMS_WORKS_JWT|TWILIO_.*|MAILCHIMP_.*|PAYPAL_.*|JOVABOOK_(?:EMAIL|SMS|BILLING|CUSTOMER|COMMISSION|MONTHLY_COMMISSION|LIFECYCLE|INTEGRATIONS|RECOVERY|ANNUAL)_.*)$/i;
 const names=Object.keys(env).filter(name=>env[name]&&(forbidden.test(name)||providers.test(name)));
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

export function validateSourceInventory(migrations){
 const unknown=migrations.filter(name=>!SOURCE_FILES.includes(name)&&!OMITTED_SOURCE_FILES.includes(name));
 if(unknown.length)throw Error('Unreviewed local schema migrations: '+unknown.sort().join(', ')+'. Update the offline manifest explicitly before using this database.');
}
export async function sources(){
 const directory=path.join(REPO_ROOT,'booking-demo','supabase');
 const migrations=(await fs.readdir(path.join(directory,'migrations'))).filter(name=>name.endsWith('.sql')).map(name=>'migrations/'+name);
 validateSourceInventory(migrations);
 const entries=await Promise.all(SOURCE_FILES.map(async name=>{const raw=await fs.readFile(path.join(directory,name),'utf8');return {name,sql:prepareSchemaSql(raw),sha256:createHash('sha256').update(raw).digest('hex')};}));
 const hashes=Object.fromEntries(entries.map(entry=>[entry.name,entry.sha256])),order=entries.map(entry=>entry.name);
 const digest=createHash('sha256').update(JSON.stringify({version:MANIFEST_VERSION,bootstrap:BOOTSTRAP_VERSION,fixtures:FIXTURES,order,hashes,omitted:OMITTED_SOURCE_FILES})).digest('hex');
 return {entries,hashes,order,digest};
}
export function assessManifest(meta,source){
 const hashes=meta?.source_hashes&&typeof meta.source_hashes==='object'?meta.source_hashes:{};
 const added=source.order.filter(name=>!Object.hasOwn(hashes,name)),removed=Object.keys(hashes).filter(name=>!Object.hasOwn(source.hashes,name));
 const changed=source.order.filter(name=>Object.hasOwn(hashes,name)&&hashes[name]!==source.hashes[name]);
 const versionMismatch=meta?.manifest_version!==MANIFEST_VERSION;
 const orderMismatch=JSON.stringify(meta?.source_order)!==JSON.stringify(source.order);
 const omissionsMismatch=JSON.stringify(meta?.omitted_sources)!==JSON.stringify(OMITTED_SOURCE_FILES);
 const digestMismatch=meta?.manifest_digest!==source.digest;
 return {current:!versionMismatch&&!orderMismatch&&!omissionsMismatch&&!digestMismatch&&!added.length&&!removed.length&&!changed.length,versionMismatch,orderMismatch,omissionsMismatch,digestMismatch,added,removed,changed};
}
async function metadata(db){const exists=(await db.query("select to_regclass('jovabook_test.metadata')::text name")).rows[0].name;if(!exists)return null;return (await db.query('select * from jovabook_test.metadata where singleton')).rows[0]||null;}
async function assertOwnedDatabase(db,{allowEmpty=false}={}){const meta=await metadata(db);if(meta){if(meta.format!==FORMAT||meta.fixtures!==FIXTURES)throw Error('Unexpected internal database marker. Refusing this database.');return meta;}const tables=(await db.query("select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in('r','p','v','m','f') and n.nspname not like 'pg_%' and n.nspname<>'information_schema'")).rows;if(allowEmpty&&!tables.length)return null;throw Error('Missing internal test-only database marker. Existing data will not be changed.');}
export async function bootstrap(db,source){
 await db.exec(`create schema if not exists jovabook_test;revoke all on schema jovabook_test from public;
 create table jovabook_test.metadata(singleton boolean primary key default true check(singleton),format text not null,fixtures text not null,source_hashes jsonb not null,manifest_version int not null,manifest_digest text not null,source_order jsonb not null,omitted_sources jsonb not null,initialized_at timestamptz);`);
 await db.query('insert into jovabook_test.metadata(format,fixtures,source_hashes,manifest_version,manifest_digest,source_order,omitted_sources) values($1,$2,$3,$4,$5,$6,$7)',[FORMAT,FIXTURES,JSON.stringify(source.hashes),MANIFEST_VERSION,source.digest,JSON.stringify(source.order),JSON.stringify(OMITTED_SOURCE_FILES)]);
 await db.exec(`create schema auth;create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz);
 do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role;end if;end$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,owner uuid,owner_id text,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 await db.exec(source.entries[0].sql);
 // Match the hosted table privileges before the later migrations revoke sensitive writes.
 await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select on all tables in schema public to anon;');
 for(const entry of source.entries.slice(1))await db.exec(entry.sql);
 await db.exec(`update jovabook_private.email_config set enabled=false,worker_token_hash=null,webhook_secret=null,webhook_id=null,sender='bookings@example.test',public_url='https://booking.example.test';`);
 for(let index=0;index<2;index++){
  const number=index+1,email='owner-'+number+'@example.test',client='client-'+number+'@example.test';
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[OWNERS[index],email]);
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

export async function assertSyntheticDatabase(db){
 const tests=[['public.salons','email'],['public.customers','email'],['public.bookings','email'],['jovabook_private.email_queue','recipient']];
 for(const [table,column] of tests){const exists=(await db.query('select to_regclass($1)::text name',[table])).rows[0].name;if(!exists)continue;const invalid=(await db.query(`select count(*)::int count from ${table} where ${column} is null or ${column} !~ '^[^@]+@example[.]test$'`)).rows[0].count;if(invalid)throw Error('Non-fixture recipient data detected. Only synthetic @example.test addresses are allowed.');}
 const authEmail=(await db.query("select exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email') yes")).rows[0].yes;
 if(authEmail){if((await db.query("select count(*)::int n from auth.users where email is null or email !~ '^[^@]+@example[.]test$'")).rows[0].n)throw Error('Non-fixture Auth identities detected. Refusing this database.');}
 else if((await db.query("select to_regclass('auth.users')::text name")).rows[0].name){if((await db.query('select count(*)::int n from auth.users where not(id=any($1::uuid[]))',[OWNERS])).rows[0].n)throw Error('Unexpected identities in a legacy test Auth stub. Refusing reset.');}
}
async function assertOfflineState(db){
 const config=(await db.query('select enabled,worker_token_hash,webhook_secret,webhook_id from jovabook_private.email_config where singleton')).rows[0];
 if(!config||config.enabled||config.worker_token_hash!==null||config.webhook_secret!==null||config.webhook_id!==null)throw Error('Unsafe test delivery configuration. Refusing further operations; this CLI requires delivery disabled and no worker/webhook credentials.');
 const forbidden=(await db.query("select extname from pg_extension where extname in ('pg_net','pg_cron','http','dblink','postgres_fdw')")).rows;
 if(forbidden.length)throw Error('Unexpected network or scheduling extension in test database.');
 const controls=[['sms_config',['enabled','provider_configured'],['worker_token_hash']],['billing_config',['enabled','provider_configured','deletion_enabled'],['worker_hash','lifecycle_hash']],['customer_config',['recovery_enabled','payments_enabled'],['worker_hash']],['commission_config',['enabled','invoice_enabled','annual_invoice_enabled','supervisor_enabled','supervisor_operational_ready'],['worker_hash','supervisor_http_hash']],['integration_config',['enabled','recovery_enabled'],['worker_hash']]];
 for(const [table,flags,secrets] of controls){if(!(await db.query('select to_regclass($1)::text name',['jovabook_private.'+table])).rows[0].name)continue;const config=(await db.query('select * from jovabook_private.'+table+' where singleton')).rows[0];if(!config||flags.some(key=>config[key]!==false)||secrets.some(key=>config[key]!==null))throw Error('Unsafe test provider configuration in '+table+'. Provider/deletion controls must stay disabled with no worker credentials.');}
 await assertSyntheticDatabase(db);
}

export async function status(db,source){
 const meta=await assertOwnedDatabase(db),manifest=assessManifest(meta,source),providerStateVerified=!!meta.initialized_at&&manifest.current;
 if(providerStateVerified)await assertOfflineState(db);else await assertSyntheticDatabase(db);
 const counts={};for(const [key,table] of [['businesses','public.salons'],['clients','public.customers'],['bookings','public.bookings'],['queued_records','jovabook_private.email_queue']])counts[key]=(await db.query('select to_regclass($1)::text name',[table])).rows[0].name?(await db.query('select count(*)::int n from '+table)).rows[0].n:0;
 let fixtureTrialsActive=false;if(providerStateVerified)fixtureTrialsActive=Number((await db.query('select count(*)::int n from public.salons where id=any($1::uuid[]) and jovabook_private.billing_open(id)',[SALONS])).rows[0].n)===2;
 const disabled=providerStateVerified?false:null;
 return {database:'isolated local PGlite',storage:DATA_DIR,initialized:!!meta.initialized_at,initializedAt:meta.initialized_at,fixtures:FIXTURES,sourceDrift:!manifest.current,manifestVersion:meta.manifest_version??null,expectedManifestVersion:MANIFEST_VERSION,manifest,loadedSources:meta.source_order||Object.keys(meta.source_hashes),expectedSources:source.order,omittedSources:OMITTED_SOURCE_FILES,fixtureTrialsActive,ready:providerStateVerified&&fixtureTrialsActive,requiresReset:!providerStateVerified||!fixtureTrialsActive,resetCommand:'node scripts/jovabook-test-db.mjs reset --confirm=test-only',providerStateVerified,emailDeliveryEnabled:disabled,smsDeliveryEnabled:disabled,billingProviderEnabled:disabled,customerPaymentsEnabled:disabled,customerRecoveryEnabled:disabled,commissionInvoicingEnabled:disabled,annualCommissionInvoicingEnabled:disabled,integrationsEnabled:disabled,slotRecoveryEnabled:disabled,deletionEnabled:disabled,workerKeyConfigured:disabled,network:'disabled',authServer:false,storageServer:false,...counts};
}

export async function verify(db,source){
 const meta=await assertOwnedDatabase(db);if(!meta.initialized_at||!assessManifest(meta,source).current)throw Error('Schema/bootstrap manifest is stale or incomplete. Rebuild only the marked local fixtures with reset --confirm=test-only.');
 const summary=await status(db,source);if(!summary.fixtureTrialsActive)throw Error('The synthetic business trials expired. Rebuild only the local fixtures with reset --confirm=test-only.');const checks=[];let savepoint=0;
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
   await denied("insert into storage.objects(bucket_id,name,owner_id) values('jovabook-website-images',$1,$2)",[SALONS[1-index]+'/30000000-0000-4000-8000-000000000001.jpg',OWNERS[index]]);
   await denied("select public.request_plan_change('standard',$1)",[SALONS[1-index]]);
   const imageName=SALONS[index]+'/30000000-0000-4000-8000-000000000001.jpg';await db.query("insert into storage.objects(bucket_id,name,owner_id) values('jovabook-website-images',$1,$2)",[imageName,OWNERS[index]]);
   assert((await db.query('select name from storage.objects')).rows.every(row=>row.name.startsWith(SALONS[index]+'/')),'Storage listing tenant boundary');
   assert((await db.query("update storage.objects set name=$1 where name=$2 returning id",[SALONS[index]+'/30000000-0000-4000-8000-000000000002.jpg',imageName])).rows.length===0,'Storage overwrite denied');
   assert((await db.query('delete from storage.objects where name=$1 returning id',[imageName])).rows.length===0,'Storage deletion denied');
   const access=(await db.query('select public.owner_account_access() data')).rows[0].data;assert(access.business.id===SALONS[index]&&access.access==='active','owner billing metadata isolation');
   const sms=(await db.query('select public.sms_reminder_info() data')).rows[0].data;assert(sms.enabled===false,'SMS stays disabled');
   checks.push('Owner '+(index+1)+': own reads, cross-business writes denied, read-only email log, private queues denied, isolated immutable Storage images, verified billing metadata');
  }
  await db.exec('reset role;set local role anon');
  assert(Number((await db.query('select count(*) count from public.customers')).rows[0].count)===0,'anonymous client rows');
  assert(Number((await db.query('select count(*) count from public.bookings')).rows[0].count)===0,'anonymous booking rows');
  const publicView=(await db.query("select public.public_salon('fictional-business-1') info")).rows[0].info;
  assert(publicView?.slug==='fictional-business-1'&&!JSON.stringify(publicView).includes('client-1@example.test')&&!JSON.stringify(publicView).includes('Test Client 1'),'public booking data privacy');
  assert(publicView.booking_window?.days===75&&publicView.booking_window.today&&publicView.booking_window.max_date,'authoritative75-day public window');
  const far=(await db.query("select public.create_booking('fictional-business-1','consultation','owner',($1::date+1)::text,'11:00','Synthetic probe','probe@example.test','','','Card') data",[publicView.booking_window.max_date])).rows[0].data;assert(far?.ok===false&&far.code==='booking_horizon','online day76 rejected');
  await denied("select public.customer_portal_register('fictional-business-1','Anonymous','Probe','07700 900123')");
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
   if(command==='init'){const existing=await assertOwnedDatabase(db,{allowEmpty:true});if(!existing)await bootstrap(db,source);else if(!existing.initialized_at||!assessManifest(existing,source).current)throw Error('Existing local schema/bootstrap manifest is stale or incomplete. Run reset --confirm=test-only; init never silently upgrades or erases fixtures.');}
   else if(command==='reset'){
    await assertPathSafety();await assertOwnedDatabase(db,{allowEmpty:true});await assertSyntheticDatabase(db);
    await db.exec('reset role;drop schema if exists jovabook_private cascade;drop schema if exists jovabook_test cascade;drop schema if exists storage cascade;drop schema if exists public cascade;drop schema if exists auth cascade;create schema public;');
    await bootstrap(db,source);
   }
   const result=command==='verify'?await verify(db,source):await status(db,source);
   process.stdout.write(JSON.stringify({...result,command},null,2)+'\n');return result;
  }finally{await db.close();}
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCli().catch(error=>{console.error('JovaBook test database: '+error.message);process.exitCode=1;});
