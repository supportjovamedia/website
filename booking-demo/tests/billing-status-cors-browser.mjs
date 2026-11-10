/** Actual cross-origin browser transport, two local servers and no public requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const routeSource=await readFile(new URL('../../app/api/jovabook/billing/status/route.js',import.meta.url),'utf8');
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));

test('actual status transport caches one preflight and keeps both authorization proofs uncached',async()=>{
 const requests=[],errors=[],sid='20000000-0000-4000-8000-000000000001',uid='30000000-0000-4000-8000-000000000001';let policy;
 const book=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local CORS transport</title>');});
 const main=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();requests.push({method:req.method,path:req.url,headers:req.headers,body});const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(body?{body}: {})});const response=await policy[req.method](request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){errors.push(String(error));res.writeHead(500);res.end();}});
 const bookOrigin=await listen(book),mainOrigin=await listen(main);let authChecks=0;
 const env={Response,after:()=>{},console:{info:()=>{}},createJovaBookBillingHandlers:()=>({status:async request=>{authChecks++;assert.equal(request.headers.get('authorization'),'Bearer local-only-token');return Response.json({ok:true,access:'active',business:{id:sid,status:'active',plan:'essential',name:'Local studio',slug:'local-studio'},lifecycle:{},billing:{connected:false,canCheckout:false}},{headers:{'Cache-Control':'no-store'}});}})};
 // The exact production-origin policy is covered by the route unit tests. Substitute
 // only origins here so Chrome enforces a real preflight against local HTTP servers.
 vm.runInNewContext(routeSource.replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ').replace(/export async function /g,'async function ').replace(/export function /g,'function ').replaceAll('https://book.jovamedia.com',bookOrigin)+'\nthis.api={POST,OPTIONS};',env);policy=env.api;
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{const page=await browser.newPage();page.on('request',request=>{assert([bookOrigin,mainOrigin].includes(new URL(request.url()).origin),'No public network request');});await page.goto(bookOrigin);
  await page.evaluate(({uid,mainOrigin})=>{window.JOVA_SUPABASE={url:mainOrigin+'/supabase',key:'local-public'};localStorage.setItem('jovabook-auth',JSON.stringify({access_token:'local-only-token',refresh_token:'local-refresh',expires_at:Date.now()/1000+3600,user:{id:uid}}));},{uid,mainOrigin});
  await page.addScriptTag({content:accounts.replaceAll('https://book.jovamedia.com',bookOrigin).replaceAll('https://www.jovamedia.com',mainOrigin)});
  const results=await page.evaluate(async()=>{const api=window.JovaAccounts.create(()=>({salons:[]}),()=>{});return [(await api.ownerAccess('restore')).ok,(await api.ownerAccess('manual-refresh')).ok];});assert.deepEqual(results,[true,true]);
  assert.deepEqual(requests.map(row=>row.method),['OPTIONS','POST','POST']);assert.equal(authChecks,2,'Both POSTs independently authorize; no access response cache');assert(requests.every(row=>row.path==='/api/jovabook/billing/status'));assert(requests.every(row=>!row.headers.cookie));
  assert.equal(requests[1].headers['x-jovabook-access-reason'],'restore');assert.equal(requests[2].headers['x-jovabook-access-reason'],'manual-refresh');assert.equal(requests[1].headers['x-jovabook-client'],'20261110-record-pages');assert.deepEqual(errors,[]);
 }finally{await browser.close();await Promise.all([close(book),close(main)]);}
});
