import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const app=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replaceAll('\r\n','\n');
const sid='20000000-0000-4000-8000-000000000001',owner='owner-a';
const tables=['categories','staff','services','customers','bookings','email_log','payments'];
const access={ok:true,access:'active',business:{id:sid,name:'Studio',slug:'studio',plan:'essential',status:'active'},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:false,canCheckout:false}};
const response=data=>({ok:true,status:200,json:async()=>data});
const block=(from,to)=>app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));
async function run(kind,editing=true,{rowChange=false,foreignConfirmation=false}={}){
 const requests=[],stored=new Map([['jovabook-auth',JSON.stringify({access_token:'mock-access',refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner}})]]);
 const storage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
 let row={id:sid,owner_id:owner,name:'Studio',email:'studio@example.test',phone:'01234567890',address:'Road',plan:'essential',settings:{seeded:true,country:'GB',currency:'GBP',timezone:'Europe/London',hours:{},buffer:0,notice:0,about:'',workspace:{website:{headline:'Original'}}}};
 const window={JOVA_SUPABASE:{url:'https://isolated.example.test',key:'mock-public'}};
 vm.runInNewContext(accounts,{window,localStorage:storage,sessionStorage:storage,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://booking.example.test'},fetch:async(url,options)=>{
  requests.push({url,method:options.method||'POST'});
  if(url==='/api/jovabook/billing/status')return response(access);
  const name=new URL(url).pathname.split('/').at(-1);
  if(name==='save_salon'){const p=JSON.parse(options.body);row={...row,name:p.p_name,email:p.p_email,phone:p.p_phone,address:p.p_address,settings:p.p_settings};return response(null);}
  if(name==='salons')return response([row]);
  if(name==='owner_capabilities')return response({plan:'essential'});
  if(name==='email_delivery_info')return response({enabled:false,provider:'Resend',reminder_hours:24});
  return response([]);
 }});
 const current={id:sid,ownerId:owner,name:row.name,email:row.email,phone:row.phone,address:row.address,about:'',buffer:0,notice:0,hours:{},country:'GB',timezone:'Europe/London',currency:'GBP',workspace:row.settings.workspace,categories:[],staff:[],services:[],customers:[],bookings:[],emails:[],payments:{transactions:[]}};
 const state={active:sid,salons:[current]},dir=window.JovaAccounts.create(()=>state,()=>{});
 const fields=x=>({p_name:x.name,p_email:x.email,p_phone:x.phone,p_address:x.address,p_settings:{seeded:true,about:x.about,buffer:x.buffer,notice:x.notice,hours:x.hours,country:x.country,currency:x.currency,timezone:x.timezone,workspace:x.workspace}});
 const rowsOf=()=>Object.fromEntries(tables.map(t=>[t,t==='customers'?current.customers:[]]));
 const env={dir,state,window:{addEventListener:()=>{}},Promise,Date,JSON,Object,Number,Math,Error,KEY:'cache',localStorage:storage,TABLES:tables,WRITE_TABLES:tables.filter(t=>t!=='email_log'),snap:{[sid]:Object.fromEntries(tables.map(t=>[t,{}]))},salonSnap:{[sid]:JSON.stringify(fields(current))},saveRevision:0,syncBusy:false,syncDirty:false,syncBlocked:false,syncTimer:null,syncFail:0,liveLoadSequence:0,verifiedOwnerIdentity:owner,
  clearTimeout,setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);t.unref();return t;},
  salon:()=>state.salons[0],businessOwner:()=>owner,isLive:()=>true,teamMode:()=>false,salonFields:fields,rowsOf,showSync:()=>{},render:()=>{},toast:()=>{},closeModal:()=>{},hasUnsavedEditor:()=>editing,signedIn:()=>true,syncPending:()=>env.syncBusy||env.syncDirty,scheduleAccessCheck:()=>{},purgeLive:()=>{},queueSync:()=>{},markSynced:()=>{},buildLive:(r)=>({...current,name:r.name,workspace:r.settings.workspace}),JovaSchedule:{normalize:v=>v},JovaBusinessLocale:{resolve:x=>x.settings||x}};
 env.save=()=>{env.saveRevision++;env.syncDirty=true;};
 vm.createContext(env);
 vm.runInContext(block('async function flushSync(){','async function persistWebsite(')+block('async function persistWebsite(',"window.addEventListener('beforeunload'")+block('async function loadLive(','// Take other people')+block('async function persistBusinessDetails(','async function saveBusinessDetails('),env);
 // Establish verified tenant once, then exclude opening from save measurements.
 assert.equal((await dir.loadDiary()).ok,true);requests.length=0;
 if(rowChange)current.customers.push({id:'new-client',name:'Client'});
 if(foreignConfirmation)env.salonConfirmations.set(env.salonConfirmationKey(sid,'old-owner'),1);
 let result;
 if(kind==='loadDiary')result=await dir.loadDiary();
 if(kind==='loadLive')result=await env.loadLive();
 if(kind==='business')result=await env.persistBusinessDetails({...current,name:'Changed'},sid,owner);
 if(kind==='website')result=await env.persistWebsite({headline:'Changed'},sid,owner);
 if(kind==='generic'){current.workspace={...current.workspace,title:'Changed'};env.save();await env.pump();result={ok:!env.syncBlocked};}
 assert.equal(result.ok,true,JSON.stringify(result));
 return {kind,editing,total:requests.length,vercel:requests.filter(r=>r.url.startsWith('/api/')).length,supabase:requests.filter(r=>r.url.startsWith('https:')).length,requests,env,dir,storage};
}

test('Business details and Website saves confirm one salon with four requests, regardless of editor state',async()=>{
 for(const kind of ['business','website'])for(const editing of [true,false]){
  const r=await run(kind,editing);assert.equal(r.total,4);assert.equal(r.vercel,2);assert.equal(r.supabase,2);assert.equal(r.env.salonConfirmations.size,0);
  assert.equal(r.requests.filter(x=>x.url.includes('/rpc/save_salon')).length,1);
  assert.equal(r.requests.filter(x=>x.url.includes('/salons?')).length,1);
  for(const table of tables)assert(!r.requests.some(x=>x.url.includes('/'+table+'?')),'A salon setting must not refetch '+table);
  const read=r.requests.find(x=>x.url.includes('/salons?'));assert(read.url.includes('id=eq.'+sid));assert(read.url.includes('owner_id=eq.'+owner));
 }
});
test('initial diary and generic mutation refresh paths preserve their authorization and side-effect reads',async()=>{
 for(const [kind,total,vercel,supabase] of [['loadDiary',10,2,8],['loadLive',12,2,10],['generic',14,3,11]]){
  const r=await run(kind,false);assert.equal(r.total,total);assert.equal(r.vercel,vercel);assert.equal(r.supabase,supabase);
 }
});
test('targeted salon verification rejects a changed owner before making another request',async()=>{
 const r=await run('business');r.storage.setItem('jovabook-auth',JSON.stringify({access_token:'access-b',refresh_token:'refresh-b',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'owner-b'}}));const before=r.requests.length;
 const result=await r.dir.verifySalon(sid);assert.equal(result.ok,false);assert.equal(result.stale,true);assert.equal(r.requests.length,before);
});
test('an overlapping row mutation still receives its full authoritative refresh during a salon save',async()=>{
 const r=await run('business',false,{rowChange:true});assert(r.requests.some(x=>x.url.includes('/customers?on_conflict=')));assert(r.requests.some(x=>x.url.includes('/bookings?select=')));assert(r.requests.some(x=>x.url.includes('/payments?select=')));assert(r.total>4);assert.equal(r.env.salonConfirmations.size,0);
});
test('an old owner confirmation cannot suppress the current owner generic save refresh',async()=>{
 const r=await run('generic',false,{foreignConfirmation:true});assert.equal(r.total,14);assert(r.requests.some(x=>x.url.includes('/bookings?select=')));
});
