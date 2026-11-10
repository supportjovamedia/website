import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createJovaBookBillingHandlers} from '../lib/jovabook-billing.mjs';
import {accessDiagnostic} from '../lib/jovabook-access-diagnostics.mjs';
import {OFFER_VERSION} from '../lib/jovabook-offer.mjs';

const uid='10000000-0000-4000-8000-000000000001',sid='20000000-0000-4000-8000-000000000001';
const privateText='private-owner@example.test Bearer private-token';
function fixture({modern=true,failAuth=false,failFinal=false,timeout=false,throwLog=false,headers={}}={}){
 const logs=[],calls=[];let accessReads=0;
 const env={JOVABOOK_SUPABASE_URL:'https://fixture.supabase.co',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture',...(modern?{JOVABOOK_OFFER_VERSION:OFFER_VERSION}:{})};
 const send=async url=>{calls.push(url);if(url.endsWith('/auth/v1/user')){if(timeout)throw new DOMException(privateText,'TimeoutError');return failAuth?Response.json({message:privateText},{status:503}):Response.json({id:uid,email:privateText});}if(url.endsWith('/owner_account_access')){if(failFinal&&++accessReads===2)return Response.json({message:privateText},{status:502});return Response.json({ok:true,access:'active',business:{id:sid},billing:{connected:false}});}throw Error('Unexpected upstream call');};
 const handler=createJovaBookBillingHandlers({env,send,accessLog:record=>{logs.push(record);if(throwLog)throw Error('Logging unavailable');}});
 const request=new Request('https://www.jovamedia.com/api/jovabook/billing/status',{method:'POST',headers:{Authorization:'Bearer private-token','Content-Type':'application/json','x-jovabook-access-reason':'restore','x-jovabook-client':'20261110-record-pages',...headers},body:'{}'});
 return {logs,calls,request,handler};
}
test('native Auth503 is diagnosed before account or provider reads without leaking any input',async()=>{
 const f=fixture({failAuth:true}),response=await f.handler.status(f.request);assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(f.calls.length,1);assert.equal(f.logs.length,1);assert.deepEqual({...f.logs[0],elapsed_ms:0},{event:'jovabook_access_status',reason:'restore',client:'20261110-record-pages',stage:'auth-user',status:503,code:'upstream_http',elapsed_ms:0,upstream_status:503});assert(!JSON.stringify(f.logs).includes('private'));assert(!JSON.stringify(f.logs).includes(uid));
});
test('final access failure is distinguished from initial native Auth and logs only safe stage/status labels',async()=>{
 const f=fixture({failFinal:true}),response=await f.handler.status(f.request);assert.equal(response.status,503);assert.equal(f.logs[0].stage,'access-final');assert.equal(f.logs[0].upstream_status,502);assert.equal(f.calls.length,3);assert(!JSON.stringify(f.logs).includes(privateText));
});
test('successful legacy and current status retain authorization and no-store with one diagnostic each',async()=>{
 for(const modern of [false,true]){const f=fixture({modern,throwLog:true}),response=await f.handler.status(f.request);assert.equal(response.status,200);assert.equal((await response.json()).business.id,sid);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(f.logs.length,1);assert.equal(f.logs[0].stage,'complete');assert.equal(f.logs[0].code,'ok');assert.equal(f.calls.filter(url=>url.endsWith('/auth/v1/user')).length,1);}
});
test('unknown client or reason strings and timeout messages never become log values',async()=>{
 const f=fixture({timeout:true,headers:{'x-jovabook-client':privateText,'x-jovabook-access-reason':privateText}});assert.equal((await f.handler.status(f.request)).status,503);assert.equal(f.logs[0].reason,'unknown');assert.equal(f.logs[0].client,'unknown');assert.equal(f.logs[0].code,'timeout');assert(!JSON.stringify(f.logs).includes('private'));
 const logs=[],diagnostic=accessDiagnostic(new Request('https://fixture.test'),record=>logs.push(record));diagnostic.stage(privateText);diagnostic.finish(new Response(null,{status:400}));diagnostic.finish(new Response(null,{status:200}));assert.equal(logs.length,1);assert.equal(logs[0].stage,'input');
});
test('missing credentials still fail before upstream work or data access',async()=>{
 const f=fixture(),request=new Request(f.request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal((await f.handler.status(request)).status,401);assert.equal(f.calls.length,0);assert.equal(f.logs[0].stage,'auth-user');assert.equal(f.logs[0].code,'denied');
});

const routeSource=await readFile(new URL('../app/api/jovabook/billing/status/route.js',import.meta.url),'utf8');
function routeFixture(){const calls=[],logs=[],context={Response,after:()=>{},console:{info:(...args)=>logs.push(args)},createJovaBookBillingHandlers:options=>({status:async request=>{calls.push(request);options.accessLog({event:'jovabook_access_status',reason:'restore',stage:'complete',status:200});return Response.json({ok:false,message:'Denied'},{status:401,headers:{'Cache-Control':'no-store'}});}})};vm.runInNewContext(routeSource.replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ').replace(/export async function /g,'async function ').replace(/export function /g,'function ')+'\nthis.api={POST,OPTIONS};',context);return {api:context.api,calls,logs};}
test('exact booking-origin preflight is cached separately and performs no authorization or billing work',()=>{
 const f=routeFixture(),request=new Request('https://www.jovamedia.com/api/jovabook/billing/status',{method:'OPTIONS',headers:{Origin:'https://book.jovamedia.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,x-jovabook-access-reason,x-jovabook-client'}}),response=f.api.OPTIONS(request);assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://book.jovamedia.com');assert.equal(response.headers.get('Access-Control-Max-Age'),'86400');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);assert.match(response.headers.get('Access-Control-Allow-Headers'),/Authorization/);assert.match(response.headers.get('Access-Control-Allow-Headers'),/x-jovabook-client/);assert.equal(f.calls.length,0);assert.equal(f.logs.length,0);
});
test('POST CORS preserves the original authorization response and hostile origins receive no CORS permission',async()=>{
 for(const origin of ['https://book.jovamedia.com','https://book.jovamedia.com.evil.test','https://evil.test']){const f=routeFixture(),request=new Request('https://www.jovamedia.com/api/jovabook/billing/status',{method:'POST',headers:{Origin:origin},body:'{}'}),response=await f.api.POST(request);assert.equal(response.status,401);assert.equal((await response.json()).ok,false);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin==='https://book.jovamedia.com'?origin:null);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);assert.match(response.headers.get('Vary'),/Origin/);assert.equal(f.calls.length,1);assert.equal(f.calls[0],request);assert.equal(f.logs.length,1);const preflight=f.api.OPTIONS(new Request(request.url,{method:'OPTIONS',headers:{Origin:origin}}));if(origin!=='https://book.jovamedia.com')assert.equal(preflight.headers.get('Access-Control-Max-Age'),null);}
});
