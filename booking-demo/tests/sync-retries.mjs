import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const app=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replaceAll('\r\n','\n'),accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const sid='20000000-0000-4000-8000-000000000001',owner='owner-a',tables=['categories','staff','services','customers','bookings','email_log','payments'];
const reply=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const part=(from,to)=>app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const model={failure:503,accessFailure:false,hold:null},requests=[],stored=new Map([['jovabook-auth',JSON.stringify({access_token:'access',refresh_token:'refresh',expires_at:Date.now()/1000+3600,user:{id:owner}})]]),timers=new Map();let nextTimer=0,status;
 const storage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)};
 const access={ok:true,access:'active',business:{id:sid,name:'Studio',slug:'studio',plan:'essential',status:'active'},lifecycle:{},billing:{connected:false,canCheckout:false}};
 const window={JOVA_SUPABASE:{url:'https://mock.example.test',key:'public'}};
 vm.runInNewContext(accounts,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,localStorage:storage,sessionStorage:storage,location:{origin:'https://book.example.test'},fetch:async(url,options)=>{requests.push({url,options});if(url==='/api/jovabook/billing/status')return model.accessFailure?reply({ok:false},503):reply(access);if(model.hold)await model.hold;if(model.failure==='network')throw Error('Synthetic network outage');return reply(null,model.failure);}});
 const current={id:sid,ownerId:owner,subscription:{status:'active'},customers:[{id:'pending',name:'Retained Client'}]},state={active:sid,salons:[current]},dir=window.JovaAccounts.create(()=>state,()=>{});
 const element=tag=>{const e={tag,style:{},children:[],listeners:{},attrs:{},className:'',setAttribute:(key,value)=>e.attrs[key]=value,appendChild:child=>e.children.push(child),addEventListener:(key,fn)=>e.listeners[key]=fn};let text='';Object.defineProperty(e,'textContent',{get:()=>text,set:value=>{text=value;e.children=[];}});return e;};
 const document={hidden:false,createElement:element,getElementById:()=>status,body:{appendChild:el=>status=el}};
 const env={dir,state,document,navigator:{onLine:true},Promise,Date,Math,JSON,Object,Number,Error,Map,KEY:'cache',localStorage:storage,TABLES:tables,WRITE_TABLES:tables.filter(x=>x!=='email_log'),snap:{[sid]:Object.fromEntries(tables.map(t=>[t,{}]))},salonSnap:{[sid]:'{}'},syncDirty:false,syncBusy:false,syncFail:0,syncTimer:null,saveRevision:1,
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),rowsOf:()=>Object.fromEntries(tables.map(t=>[t,t==='customers'?current.customers:[]])),salonFields:()=>({}),salon:()=>current,isLive:()=>true,teamMode:()=>false,billingRestricted:()=>false,hasUnsavedEditor:()=>true,render:()=>{},closeModal:()=>{},toast:()=>{},installAccessOnly:()=>{},loadLive:()=>assert.fail('No full reload during failed sync')};
 vm.createContext(env);vm.runInContext(part('function showSync(kind){','async function persistWebsite(')+part('var syncBlocked=false,','window.addEventListener(\'beforeunload\''),env);
 const tick=async()=>{const entry=timers.entries().next().value;if(!entry)return null;const [id,timer]=entry;timers.delete(id);timer.fn();await settle();return timer.delay;};
 return {env,model,current,state,dir,requests,stored,timers,tick,get status(){return status;},get button(){return status?.children[0];},async ready(){assert.equal((await dir.ownerAccess()).ok,true);requests.length=0;},save(){env.saveRevision++;env.queueSync();},retry(){this.button.listeners.click();}};
}
test('persistent server or network save failures stop after the initial attempt and two retries',async()=>{
 for(const failure of [503,'network']){const h=harness();await h.ready();h.model.failure=failure;h.save();const delays=[];while(h.timers.size)delays.push(await h.tick());assert.deepEqual(delays,[350,2000,4000]);assert.equal(h.requests.length,6);assert.equal(h.requests.filter(r=>r.url==='/api/jovabook/billing/status').length,3);assert.equal(h.env.syncDirty,true);assert.equal(h.env.syncBlocked,true);assert.equal(h.current.customers[0].name,'Retained Client');assert.equal(h.status.textContent,'Changes unsaved');assert.equal(h.button.textContent,'Retry');assert.equal(h.button.attrs['aria-label'],'Retry saving changes');}
});
test('explicit Retry and a new user save each receive a fresh bounded budget',async()=>{
 const h=harness();await h.ready();h.save();while(h.timers.size)await h.tick();const first=h.requests.length;h.retry();assert.equal(h.env.syncFail,0);while(h.timers.size)await h.tick();assert.equal(h.requests.length-first,6);h.current.customers[0].name='Edited draft';h.save();assert.equal(h.env.syncFail,0);while(h.timers.size)await h.tick();assert.equal(h.requests.length-first,12);assert.equal(h.current.customers[0].name,'Edited draft');
});
test('hidden or offline tabs pause before requests and never restart merely on visibility or connectivity changes',async()=>{
 for(const mode of ['hidden','offline']){const h=harness();await h.ready();if(mode==='hidden')h.env.document.hidden=true;else h.env.navigator.onLine=false;h.save();assert.equal(h.requests.length,0);assert.equal(h.timers.size,0);assert.equal(h.env.syncDirty,true);assert.equal(h.status.textContent,'Changes unsaved');h.env.document.hidden=false;h.env.navigator.onLine=true;await settle();assert.equal(h.requests.length,0);h.retry();await h.tick();assert.equal(h.requests.length,2);}
});
test('a tab hidden while a retry waits pauses without spending another network attempt',async()=>{
 const h=harness();await h.ready();h.save();await h.tick();assert.equal(h.requests.length,2);h.env.document.hidden=true;await h.tick();assert.equal(h.requests.length,2);assert.equal(h.timers.size,0);assert.equal(h.env.syncBlocked,true);assert.equal(h.current.customers.length,1);
});
test('stale timers and Retry controls cannot write after logout or an owner change',async()=>{
 for(const mode of ['logout','owner']){const h=harness();await h.ready();h.save();await h.tick();if(mode==='logout')await h.dir.logout();else h.stored.set('jovabook-auth',JSON.stringify({access_token:'other',user:{id:'owner-b'}}));h.requests.length=0;while(h.timers.size)await h.tick();assert.equal(h.requests.length,0);h.env.showSync('unsaved');h.retry();assert.equal(h.requests.length,0);assert.equal(h.timers.size,0);}
});
test('a failed access check blocks immediately without mutation retries',async()=>{
 const h=harness();await h.ready();h.model.accessFailure=true;h.save();await h.tick();assert.equal(h.requests.length,1);assert.equal(h.env.syncBlocked,true);assert.equal(h.timers.size,0);
});
test('a new save during an in-flight failed write gets its own retry budget',async()=>{
 const h=harness();await h.ready();let release;h.model.hold=new Promise(resolve=>release=resolve);h.save();await h.tick();assert.equal(h.env.syncBusy,true);h.current.customers[0].name='Newer edit';h.save();release();h.model.hold=null;await settle();assert.equal(h.env.syncFail,0);while(h.timers.size)await h.tick();assert.equal(h.requests.length,8,'One old attempt plus the new save and two retries');assert.equal(h.env.syncFail,3);assert.equal(h.current.customers[0].name,'Newer edit');
});
test('a late in-flight failed response cannot restart saving after logout',async()=>{
 const h=harness();await h.ready();let release;h.model.hold=new Promise(resolve=>release=resolve);h.save();await h.tick();await h.dir.logout();h.env.syncDirty=false;h.requests.length=0;release();h.model.hold=null;await settle();assert.equal(h.timers.size,0);assert.equal(h.requests.length,0);assert.equal(h.env.syncDirty,false);
});

function baseline(h){h.env.snap[sid]=Object.fromEntries(tables.map(table=>[table,Object.fromEntries(h.env.rowsOf(h.current)[table].map(row=>[row.id,JSON.stringify(row)]))]));h.env.salonSnap[sid]=JSON.stringify(h.env.salonFields(h.current));}
test('unchanged cache saves and edit then revert make zero access, mutation or refresh requests',async()=>{
 const h=harness();await h.ready();baseline(h);h.save();assert.equal(h.env.syncDirty,false);assert.equal(h.timers.size,0);assert.equal(h.requests.length,0);
 h.current.customers[0].name='Edited';h.save();assert.equal(h.timers.size,1);h.current.customers[0].name='Retained Client';h.save();assert.equal(h.env.syncDirty,false);assert.equal(h.timers.size,0);assert.equal(h.requests.length,0);
 h.current.customers[0].name='Edited';h.save();h.current.customers[0].name='Retained Client';await h.tick();assert.equal(h.requests.length,0,'Pump checks queued reverts before billing access');assert.equal(h.env.syncDirty,false);
});
test('remote diff includes known deletions and salon changes but ignores read-only email rows and team-only exclusions',async()=>{
 const h=harness();await h.ready();baseline(h);h.env.snap[sid].email_log.extra='{}';assert.equal(h.env.hasRemoteChanges(h.current),false);
 h.env.snap[sid].customers.removed='{}';assert.equal(h.env.hasRemoteChanges(h.current),true);
 h.env.teamMode=()=>true;assert.equal(h.env.hasRemoteChanges(h.current),false,'Team mode cannot delete owner records');
 h.env.salonSnap[sid]='changed';assert.equal(h.env.hasRemoteChanges(h.current),false);h.env.teamMode=()=>false;assert.equal(h.env.hasRemoteChanges(h.current),true);
});
test('a revert during an in-flight success is persisted after the first write updates the snapshot',async()=>{
 const h=harness();await h.ready();baseline(h);h.model.failure=200;let release;h.model.hold=new Promise(resolve=>release=resolve);h.current.customers[0].name='In flight';h.save();await h.tick();assert.equal(h.env.syncBusy,true);h.current.customers[0].name='Retained Client';h.save();release();h.model.hold=null;await settle();await settle();
 const writes=h.requests.filter(r=>r.url.includes('/rest/v1/customers'));assert.equal(writes.length,2);assert.equal(JSON.parse(writes[0].options.body)[0].name,'In flight');assert.equal(JSON.parse(writes[1].options.body)[0].name,'Retained Client');assert.equal(h.env.syncDirty,false);
});
