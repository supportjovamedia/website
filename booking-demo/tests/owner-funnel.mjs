import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../owner-funnel.js',import.meta.url),'utf8');
const first='10000000-0000-4000-8000-000000000001.'+'a'.repeat(64),second='20000000-0000-4000-8000-000000000002.'+'b'.repeat(64);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const cookies=new Map([['jova-funnel-consent','rejected.'+Date.now()],['jova-funnel-cap',first]]),calls=[],pending=[],listeners={},stored=new Map();
 const document={body:{},querySelector:()=>null,addEventListener:(event,fn)=>(listeners[event]||=[]).push(fn)};
 Object.defineProperty(document,'cookie',{get:()=>[...cookies].map(([key,value])=>key+'='+encodeURIComponent(value)).join('; '),set:value=>{const [pair,...flags]=value.split(';'),index=pair.indexOf('='),key=pair.slice(0,index),content=decodeURIComponent(pair.slice(index+1));flags.some(flag=>flag.trim()==='Max-Age=0')?cookies.delete(key):cookies.set(key,content);}});
 const window={addEventListener:(event,fn)=>(listeners[event]||=[]).push(fn)},location={protocol:'https:',hostname:'book.jovamedia.com',pathname:'/',search:'',hash:'#login',href:'https://book.jovamedia.com/#login'};
 vm.runInNewContext(source,{window,document,location,URL,URLSearchParams,Date,Promise,history:{replaceState(){}},sessionStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},fetch:(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return new Promise(resolve=>pending.push(resolve));}});
 return {api:window.JovaOwnerFunnel,calls,pending,cookies,emit:event=>(listeners[event]||[]).forEach(fn=>fn())};
}
test('simultaneous initial, DOM-ready, pageshow and hash events share one consent revocation',async()=>{
 const h=harness();assert.equal(h.calls.length,1);for(const event of ['DOMContentLoaded','pageshow','hashchange'])h.emit(event);void h.api.revoke();assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].url,'https://www.jovamedia.com/api/jovabook/funnel');assert.equal(h.calls[0].body.action,'revoke');assert.equal(h.calls[0].options.keepalive,true);
 h.pending[0]({ok:true});await settle();assert(!h.cookies.has('jova-funnel-cap'));h.emit('pageshow');assert.equal(h.calls.length,1);
});
test('failed revocation does not create a background retry loop and a later visit can retry',async()=>{
 const h=harness();h.pending[0]({ok:false});await settle();assert.equal(h.calls.length,1);assert.equal(h.cookies.get('jova-funnel-cap'),first);
 h.emit('hashchange');assert.equal(h.calls.length,2);h.emit('pageshow');assert.equal(h.calls.length,2);h.pending[1]({ok:true});await settle();assert(!h.cookies.has('jova-funnel-cap'));
});
test('an older in-flight revocation cannot clear a newer handoff cookie',async()=>{
 const h=harness();h.cookies.set('jova-funnel-cap',second);void h.api.revoke();assert.equal(h.calls.length,2);assert.equal(h.calls[1].body.handoff,second);
 h.pending[0]({ok:true});await settle();assert.equal(h.cookies.get('jova-funnel-cap'),second);h.pending[1]({ok:true});await settle();assert(!h.cookies.has('jova-funnel-cap'));
});
