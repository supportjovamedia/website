import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const owner='30000000-0000-4000-8000-000000000001',sid='20000000-0000-4000-8000-000000000001';
const payload={name:'My Studio',slug:'my-studio'},session={access_token:'mock-token',refresh_token:'mock-refresh',expires_at:Date.now()/1000+3600,user:{id:owner}};
const reply=(data,status=200)=>({ok:status<400,status,json:async()=>data});
function harness(){
 const calls=[],local=new Map(),tab=new Map(),model={created:false,failAfterCreate:true,statusOverride:null,nativeOwner:owner,confirmed:true,now:Date.now()};
 const storage=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
 class Clock extends Date{static now(){return model.now;}}
 const window={JOVA_SUPABASE:{url:'https://mock.example.test',key:'public'}};
 const access=()=>model.statusOverride||{ok:true,access:model.created?'setup':'no_business',...(!model.created?{no_business:true}:{}),business:model.created?{id:sid,name:payload.name,slug:payload.slug,plan:'essential',status:'setup'}:null,lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:false,canCheckout:false}};
 vm.runInNewContext(source,{window,crypto:webcrypto,Uint8Array,Date:Clock,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://book.example.test'},localStorage:storage(local),sessionStorage:storage(tab),fetch:async(url,options)=>{
  calls.push({url,options});
  if(url.includes('grant_type=password'))return reply(session);
  if(url.includes('grant_type=refresh_token'))return reply({...session,access_token:'refreshed-token'});
  if(url.endsWith('/auth/v1/user'))return reply({id:model.nativeOwner,email:'owner@example.test',email_confirmed_at:model.confirmed?'2026-11-01T00:00:00Z':null,user_metadata:{full_name:'Owner'}},model.nativeStatus||200);
  if(url==='/api/jovabook/billing/status'){if(model.created&&model.failAfterCreate){model.failAfterCreate=false;return reply({ok:false,message:'Temporary failure'},503);}return reply(access());}
  if(url.includes('/rpc/create_business_for_existing_user')){model.created=true;return reply({ok:true,salon_id:sid});}
  return reply({ok:true});
 }});
 const state={salons:[],accounts:[],resets:[]};return {api:window.JovaAccounts.create(()=>state,()=>{}),calls,local,model,creates:()=>calls.filter(x=>x.url.includes('/rpc/create_business_for_existing_user')).length};
}
async function ambiguous(){const h=harness();assert.equal((await h.api.login('owner@example.test','Fixture2026')).needsBusiness,true);const first=await h.api.createBusinessForExistingUser(payload);assert.equal(first.ok,false);assert.equal(h.creates(),1);return h;}

test('a created business continues after temporary post-create access failure without another create',async()=>{
 const h=await ambiguous(),before=h.calls.length,result=await h.api.createBusinessForExistingUser(payload);assert.equal(result.ok,true);assert.equal(result.account.salonId,sid);assert.equal(h.creates(),1);assert(h.calls.slice(before).some(x=>x.url.endsWith('/auth/v1/user')));assert.equal(h.api.existingBusinessContext(),null);
});
test('same-owner token refresh can recover the exact pending creation with native identity verification',async()=>{
 const h=await ambiguous();h.local.set('jovabook-auth',JSON.stringify({...session,expires_at:1}));const result=await h.api.createBusinessForExistingUser(payload);assert.equal(result.ok,true);assert.equal(h.creates(),1);assert(h.calls.some(x=>x.url.includes('grant_type=refresh_token')));
});
test('repeated transient verification failures retain only the original created business for retry',async()=>{
 const h=await ambiguous();h.model.failAfterCreate=true;assert.equal((await h.api.createBusinessForExistingUser(payload)).ok,false);h.model.nativeStatus=503;assert.equal((await h.api.createBusinessForExistingUser(payload)).ok,false);assert.equal(h.api.existingBusinessContext(),null);h.model.nativeStatus=200;assert.equal((await h.api.createBusinessForExistingUser(payload)).ok,true);assert.equal(h.creates(),1);
});
test('pending creation never reconciles changed names, slugs, business or native owner',async()=>{
 for(const mode of ['input-name','input-slug','business','name','slug','active','native','unconfirmed']){
  const h=await ambiguous();let input=payload;
  if(mode.startsWith('input'))input={...payload,[mode==='input-name'?'name':'slug']:'changed'};
  else if(mode==='native')h.model.nativeOwner='another-owner';
  else if(mode==='unconfirmed')h.model.confirmed=false;
  else{h.model.statusOverride={ok:true,access:'setup',business:{id:sid,name:payload.name,slug:payload.slug,plan:'essential',status:'setup'},lifecycle:{},billing:{connected:false,canCheckout:false}};const business=h.model.statusOverride.business;business[mode==='business'?'id':mode==='active'?'status':mode]=mode==='business'?'20000000-0000-4000-8000-000000000002':mode==='active'?'active':'Changed';}
  const result=await h.api.createBusinessForExistingUser(input);assert.equal(result.ok,false,mode);assert.equal(h.creates(),1,mode);
 }
});
test('logout, owner change and expiry invalidate pending business continuation',async()=>{
 for(const mode of ['logout','owner','expired']){const h=await ambiguous();if(mode==='logout'){await h.api.logout();h.local.set('jovabook-auth',JSON.stringify(session));}if(mode==='owner')h.local.set('jovabook-auth',JSON.stringify({...session,user:{id:'different-owner'}}));if(mode==='expired')h.model.now+=600001;const result=await h.api.createBusinessForExistingUser(payload);assert.equal(result.ok,false,mode);assert.equal(h.creates(),1,mode);}
});
