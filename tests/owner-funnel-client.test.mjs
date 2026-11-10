import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../lib/owner-funnel-client.mjs',import.meta.url),'utf8');
const first='10000000-0000-4000-8000-000000000001.'+'a'.repeat(64),second='20000000-0000-4000-8000-000000000002.'+'b'.repeat(64);
function harness(){
 const cookies=new Map([['jova-funnel-cap',first]]),calls=[],pending=[],document={};
 Object.defineProperty(document,'cookie',{get:()=>[...cookies].map(([key,value])=>key+'='+encodeURIComponent(value)).join('; '),set:value=>{const [pair,...flags]=value.split(';'),index=pair.indexOf('='),key=pair.slice(0,index),content=decodeURIComponent(pair.slice(index+1));flags.some(flag=>flag.trim()==='Max-Age=0')?cookies.delete(key):cookies.set(key,content);}});
 const context={window:{location:{hostname:'www.jovamedia.com',protocol:'https:'}},document,URL,Date,Promise,fetch:(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
 vm.runInNewContext(source.replace(/\bexport\s+/g,'')+'\nthis.api={revokeFunnel,shareFunnelConsent};',context);
 return {api:context.api,cookies,calls,pending};
}

test('concurrent consent withdrawal and effect calls share one revocation request',async()=>{
 const h=harness();h.api.shareFunnelConsent('rejected');const pending=h.api.revokeFunnel();assert.equal(h.api.revokeFunnel(),pending);assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].url,'https://www.jovamedia.com/api/jovabook/funnel');assert.equal(h.calls[0].body.action,'revoke');assert.equal(h.calls[0].body.handoff,first);assert.equal(h.calls[0].options.keepalive,true);assert.equal(h.calls[0].options.credentials,'include');
 h.pending[0].resolve({ok:true});await pending;assert(!h.cookies.has('jova-funnel-cap'));h.api.revokeFunnel();assert.equal(h.calls.length,1);
});
test('failed HTTP and network requests retain the handoff and retry only on a later call',async()=>{
 for(const network of [false,true]){const h=harness(),firstRequest=h.api.revokeFunnel();if(network)h.pending[0].reject(Error('Offline'));else h.pending[0].resolve({ok:false});await firstRequest;assert.equal(h.calls.length,1);assert.equal(h.cookies.get('jova-funnel-cap'),first);
  const retry=h.api.revokeFunnel();assert.equal(h.api.revokeFunnel(),retry);assert.equal(h.calls.length,2);h.pending[1].resolve({ok:true});await retry;assert(!h.cookies.has('jova-funnel-cap'));
 }
});
test('a new handoff has its own request and an older reply cannot clear it',async()=>{
 const h=harness(),oldRequest=h.api.revokeFunnel();h.cookies.set('jova-funnel-cap',second);const currentRequest=h.api.revokeFunnel();assert.equal(h.api.revokeFunnel(),currentRequest);assert.equal(h.calls.length,2);assert.equal(h.calls[1].body.handoff,second);
 h.pending[0].resolve({ok:true});await oldRequest;assert.equal(h.cookies.get('jova-funnel-cap'),second);assert.equal(h.api.revokeFunnel(),currentRequest);assert.equal(h.calls.length,2);h.pending[1].resolve({ok:true});await currentRequest;assert(!h.cookies.has('jova-funnel-cap'));
});
