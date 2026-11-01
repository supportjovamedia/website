import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {parseArguments,assertLocalEnvironment,assertPathSafety,splitSqlStatements,prepareSchemaSql,sources,bootstrap,status,verify,assessManifest,assertSyntheticDatabase,validateSourceInventory,SOURCE_FILES,OMITTED_SOURCE_FILES,MANIFEST_VERSION,REPO_ROOT,BASE_DIR,DATA_DIR} from '../scripts/jovabook-test-db.mjs';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');

test('CLI accepts only its four local commands and reset requires the exact test-only option',()=>{
 for(const command of ['init','status','verify'])assert.equal(parseArguments([command]).command,command);
 assert.equal(parseArguments(['reset','--confirm=test-only']).command,'reset');assert.equal(parseArguments([]).command,'help');
 for(const args of [['reset'],['reset','--confirm','test-only'],['init','--path','/tmp/other'],['verify','--url=postgres://production'],['status','https://production.example.test'],['reset','--confirm=test-only','--path=other']])assert.throws(()=>parseArguments(args));
 assert.equal(DATA_DIR,path.join(REPO_ROOT,'.jovabook-test','data'));assert(!DATA_DIR.startsWith(path.join(REPO_ROOT,'booking-demo')+path.sep));
});

test('remote database and delivery environment settings are refused without revealing values',()=>{
 assert.doesNotThrow(()=>assertLocalEnvironment({NODE_ENV:'development',PATH:'local'}));
 for(const name of ['DATABASE_URL','DIRECT_URL','TEST_DATABASE_URL','JOVABOOK_TEST_DB_URL','SUPABASE_URL','JOVABOOK_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_ACCESS_TOKEN','POSTGRES_PRISMA_URL','PGLITE_DATA_DIR','PGHOST','PGPASSWORD','RESEND_API_KEY','SMTP_HOST','STRIPE_SECRET_KEY','JOVABOOK_CUSTOMER_WORKER_TOKEN','JOVABOOK_SMS_WORKER_TOKEN','JOVABOOK_MONTHLY_COMMISSION_ENABLED','JOVABOOK_BILLING_ENABLED','JOVABOOK_INTEGRATIONS_ENCRYPTION_KEY','JOVABOOK_RECOVERY_ENABLED','JOVABOOK_ANNUAL_COMMISSION_INVOICING_ENABLED','SMS_WORKS_JWT','MAILCHIMP_API_KEY','PAYPAL_CLIENT_SECRET','TWILIO_AUTH_TOKEN']){assert.throws(()=>assertLocalEnvironment({[name]:'do-not-reveal-secret'}),error=>error.message.includes(name)&&!error.message.includes('do-not-reveal-secret'));}
 assert.throws(()=>assertLocalEnvironment({NODE_ENV:'production'}));assert.throws(()=>assertLocalEnvironment({VERCEL:'1'}));
});

function fakeIO({baseLink=false,dataLink=false,nestedLink=false,markerChange=false}={}){
 const normal={isSymbolicLink:()=>false,isDirectory:()=>true,isFile:()=>false},file={isSymbolicLink:()=>false,isDirectory:()=>false,isFile:()=>true},link={isSymbolicLink:()=>true,isDirectory:()=>false,isFile:()=>false};
 const marker={format:'jovabook-isolated-local-test-v1',fixtures:'fictional-example-test-v1',repository:REPO_ROOT,storage:'.jovabook-test/data',network:'disabled'};if(markerChange)marker.storage='/unexpected';
 return {realpath:async value=>value,lstat:async value=>value===BASE_DIR?(baseLink?link:normal):value===DATA_DIR?(dataLink?link:normal):value.endsWith('marker.json')?file:value.endsWith('external')?link:file,readdir:async value=>value===BASE_DIR?[{name:'marker.json'},{name:'data'}]:nestedLink?[{name:'external'}]:[],readFile:async()=>JSON.stringify(marker)};
}
test('fixed storage guards reject markers, symbolic links and junction-shaped paths before reset can open a database',async()=>{
 assert.equal((await assertPathSafety({io:fakeIO()})).dataExists,true);
 for(const option of [{baseLink:true},{dataLink:true},{nestedLink:true},{markerChange:true}])await assert.rejects(assertPathSafety({io:fakeIO(option)}));
});

test('schema splitting preserves semicolons inside quoted strings, escaped strings, comments and function bodies',()=>{
 const sql=String.raw`-- leading ; comment
 select 'a;''b'; /* outer ; /* nested ; */ done */ select E'a\'b;z';
 create function example() returns void language plpgsql as $body$begin perform 'x;y'; end;$body$;
 select "semi;colon";`;
 assert.equal(splitSqlStatements(sql).length,4);assert.throws(()=>splitSqlStatements('select $$unclosed;'));
 const escape=String.raw`select E'a\'b;z'; select 2;`;assert.equal(splitSqlStatements(escape).length,2);
});

test('only optional pgcrypto extension is removed and network or unsupported extension SQL is refused',()=>{
 const prepared=prepareSchemaSql('/* a /* nested */ comment */ CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions; select 1;');assert.equal(prepared.includes('CREATE EXTENSION'),false);assert(prepared.includes('select 1;'));
 for(const sql of ['create extension pg_net;','create extension something_else;','select net.http_post(\'https://example.test\');','select cron.schedule(\'job\',\'select 1\');','create server external foreign data wrapper postgres_fdw;'])assert.throws(()=>prepareSchemaSql(sql));
});

test('offline guard rejects fetch and socket calls before any connection can be attempted',()=>{
 const moduleURL=new URL('../scripts/jovabook-test-db.mjs',import.meta.url).href;
 const script=`import {installOfflineGuard} from ${JSON.stringify(moduleURL)};import net from 'node:net';import https from 'node:https';installOfflineGuard();let blocked=0;for(const action of [()=>fetch('https://example.test'),()=>net.connect(443,'example.test'),()=>https.get('https://example.test')]){try{action();}catch(error){if(error.message.includes('Network transport is disabled'))blocked++;}}if(blocked!==3)process.exit(1);`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});

test('the explicit manifest includes all current offline schema layers and refuses unknown migrations',async()=>{
 const source=await sources();assert.equal(SOURCE_FILES.length,15);assert(SOURCE_FILES.some(name=>name.includes('website_images')));assert(SOURCE_FILES.some(name=>name.includes('sms_reminders')));assert(SOURCE_FILES.some(name=>name.includes('billing_access')));assert(SOURCE_FILES.some(name=>name.includes('customer_portal')));assert(SOURCE_FILES.some(name=>name.includes('monthly_commission')));assert(SOURCE_FILES.some(name=>name.includes('booking_horizon')));assert(SOURCE_FILES.at(-1).includes('commission_supervisor'));assert.deepEqual(source.order,[...SOURCE_FILES]);assert.match(source.digest,/^[a-f0-9]{64}$/);
 assert.doesNotThrow(()=>validateSourceInventory([...SOURCE_FILES,...OMITTED_SOURCE_FILES]));assert.throws(()=>validateSourceInventory(['migrations/20990101000000_unreviewed.sql']),/Unreviewed local schema/);
 const meta={manifest_version:MANIFEST_VERSION,manifest_digest:source.digest,source_order:source.order,omitted_sources:[...OMITTED_SOURCE_FILES],source_hashes:source.hashes};assert.equal(assessManifest(meta,source).current,true);
 for(const changed of [{manifest_version:1},{manifest_digest:'wrong'},{source_order:[...source.order].reverse()},{omitted_sources:[]},{source_hashes:{...source.hashes,[SOURCE_FILES[0]]:'wrong'}}])assert.equal(assessManifest({...meta,...changed},source).current,false);
 const legacy=assessManifest({source_hashes:Object.fromEntries(Object.entries(source.hashes).slice(0,4))},source);assert.equal(legacy.current,false);assert.equal(legacy.versionMismatch,true);assert.equal(legacy.added.length,SOURCE_FILES.length-4);
});

test('legacy internal metadata reports an explicit reset without reading absent new tables or claiming readiness',async()=>{
 const source=await sources(),db=new PGlite();try{
  await db.exec("create schema jovabook_test;create table jovabook_test.metadata(singleton boolean,format text,fixtures text,source_hashes jsonb,initialized_at timestamptz);insert into jovabook_test.metadata values(true,'jovabook-isolated-local-test-v1','fictional-example-test-v1','{}',now());");
  const result=await status(db,source);assert.equal(result.sourceDrift,true);assert.equal(result.ready,false);assert.equal(result.requiresReset,true);assert.equal(result.manifestVersion,null);assert.equal(result.providerStateVerified,false);assert.equal(result.emailDeliveryEnabled,null);assert.match(result.resetCommand,/reset --confirm=test-only/);
  await assert.rejects(verify(db,source),/manifest is stale/);assert.equal((await db.query("select to_regclass('public.salons') name")).rows[0].name,null);
 }finally{await db.close();}
});

test('current offline schema bootstraps verified synthetic identities, Storage policies and all RLS probes without transports',async()=>{
 const source=await sources(),db=new PGlite();try{
  await bootstrap(db,source);const result=await verify(db,source);assert.equal(result.verified,true);assert.equal(result.ready,true);assert.equal(result.manifestVersion,MANIFEST_VERSION);assert.equal(result.loadedSources.length,15);assert.equal(result.authServer,false);assert.equal(result.storageServer,false);assert.equal(result.smsDeliveryEnabled,false);assert.equal(result.customerPaymentsEnabled,false);assert.equal(result.commissionInvoicingEnabled,false);assert.equal(result.deletionEnabled,false);
  const identities=(await db.query('select email,email_confirmed_at from auth.users')).rows;assert.equal(identities.length,2);assert(identities.every(row=>row.email.endsWith('@example.test')&&row.email_confirmed_at));assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,0,'All image probes roll back');
  await db.exec('update jovabook_private.sms_config set enabled=true');await assert.rejects(status(db,source),/Unsafe test provider configuration/);await db.exec('update jovabook_private.sms_config set enabled=false');
  await db.exec("update auth.users set email='real-person@example.com' where email='owner-1@example.test'");await assert.rejects(assertSyntheticDatabase(db),/Non-fixture Auth/);await db.exec("update auth.users set email='owner-1@example.test' where email='real-person@example.com'");
  await db.exec('update jovabook_test.metadata set manifest_version=1');const stale=await status(db,source);assert.equal(stale.ready,false);assert.equal(stale.sourceDrift,true);await assert.rejects(verify(db,source),/manifest is stale/);
 }finally{await db.close();}
});
