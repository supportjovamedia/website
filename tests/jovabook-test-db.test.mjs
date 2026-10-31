import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseArguments,assertLocalEnvironment,assertPathSafety,splitSqlStatements,prepareSchemaSql,REPO_ROOT,BASE_DIR,DATA_DIR} from '../scripts/jovabook-test-db.mjs';

test('CLI accepts only its four local commands and reset requires the exact test-only option',()=>{
 for(const command of ['init','status','verify'])assert.equal(parseArguments([command]).command,command);
 assert.equal(parseArguments(['reset','--confirm=test-only']).command,'reset');assert.equal(parseArguments([]).command,'help');
 for(const args of [['reset'],['reset','--confirm','test-only'],['init','--path','/tmp/other'],['verify','--url=postgres://production'],['status','https://production.example.test'],['reset','--confirm=test-only','--path=other']])assert.throws(()=>parseArguments(args));
 assert.equal(DATA_DIR,path.join(REPO_ROOT,'.jovabook-test','data'));assert(!DATA_DIR.startsWith(path.join(REPO_ROOT,'booking-demo')+path.sep));
});

test('remote database and delivery environment settings are refused without revealing values',()=>{
 assert.doesNotThrow(()=>assertLocalEnvironment({NODE_ENV:'development',PATH:'local'}));
 for(const name of ['DATABASE_URL','DIRECT_URL','TEST_DATABASE_URL','JOVABOOK_TEST_DB_URL','SUPABASE_URL','JOVABOOK_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_ACCESS_TOKEN','POSTGRES_PRISMA_URL','PGLITE_DATA_DIR','PGHOST','PGPASSWORD','RESEND_API_KEY','SMTP_HOST']){assert.throws(()=>assertLocalEnvironment({[name]:'do-not-reveal-secret'}),error=>error.message.includes(name)&&!error.message.includes('do-not-reveal-secret'));}
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
