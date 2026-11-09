import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replaceAll('\r\n','\n');
const restoreSource=source.slice(source.indexOf('async function restoreOwnerSession(){'),source.indexOf("window.addEventListener('storage',e=>{"));
const storageStart=source.indexOf("window.addEventListener('storage',e=>{");
const storageSource=source.slice(storageStart,source.indexOf('(async function boot(){',storageStart));
const bootSource=source.slice(source.indexOf('(async function boot(){'),source.indexOf('function admin_route(){',source.indexOf('(async function boot(){')));
function harness({hash='#login',result={ok:true,salon:{id:'business-a'}},publicPage=false,customerPage=false,load,google}={}){
 let signed=false,owner='owner-a',hasAuth=true;const events=[],listeners={};
 const location={pathname:'/',search:'',hash};
 const env={console,Promise,Date,setTimeout,clearTimeout,KEY:'jovabook-essential-demo-v2',TABLES:[],snap:{},salonSnap:{},syncDirty:false,syncBlocked:false,syncTimer:null,accessRefreshTimer:null,verifiedOwnerIdentity:null,observedOwnerIdentity:owner,ownerAccessState:null,ownerLoadError:'',loadingOwner:false,restoringOwnerSession:false,ownerRestoreRoute:'',ownerRestoreAttempt:0,liveLoadSequence:0,state:{active:'old-business'},location,window:{addEventListener:(name,handler)=>listeners[name]=handler},
  dir:{remote:true,hasSession:()=>hasAuth,sessionIdentity:()=>owner,hasPendingOwnerSessionAdoption:()=>false},
  OWNER_ROUTES:['dashboard','calendar','bookings','customers','billing'],
  route:()=>location.hash.slice(1)||'login',signedIn:()=>signed,signIn:()=>{signed=true;events.push('signIn');},signOut:()=>signed=false,
  customerScope:()=>customerPage,pubMode:()=>publicPage,salon:()=>({id:env.state.active}),isLive:()=>false,onbGet:()=>null,
  purgeLive:()=>events.push('purge'),render:()=>events.push({type:'render',signed,loading:env.loadingOwner,restoring:env.restoringOwnerSession,error:env.ownerLoadError}),
  billingRestricted:()=>false,history:{replaceState:(_a,_b,url)=>{location.hash=url.includes('#')?'#'+url.split('#')[1]:'';}},
  invalidateOwnerView:()=>{events.push('invalidated');signed=false;env.restoringOwnerSession=false;env.loadingOwner=false;env.ownerRestoreAttempt++;env.liveLoadSequence++;env.verifiedOwnerIdentity=null;},
  syncPending:()=>false,hasUnsavedEditor:()=>false,document:{querySelector:()=>null},$:()=>null,draft:{},
  loadLive:async()=>{env.liveLoadSequence++;events.push('verify');const response=load?await load():result;if(response.ok){env.verifiedOwnerIdentity=owner;env.ownerAccessState={access:'active',business:{status:'active'}};}return response;}
 };
 if(google)env.window.JovaGoogleAuth={callback:async()=>google};
 const ctx=vm.createContext(env);vm.runInContext(restoreSource,ctx);
 return {env,events,listeners,runBoot:()=>vm.runInContext(bootSource,ctx),installStorage:()=>vm.runInContext(storageSource,ctx),restore:()=>env.restoreOwnerSession(),owner:value=>owner=value,auth:value=>hasAuth=value,get signed(){return signed;}};
}
test('fresh persisted session with no tab marker shows loader and verifies before signIn',async()=>{
 let release;const h=harness({load:()=>new Promise(resolve=>release=resolve)}),pending=h.runBoot();
 assert.equal(h.signed,false);assert.equal(h.env.loadingOwner,true);assert.equal(h.env.restoringOwnerSession,true);assert.equal(h.env.location.hash,'#dashboard');
 const frame=h.events.find(event=>event?.type==='render');assert(frame&&!frame.signed&&frame.loading&&frame.restoring);
 release({ok:true,salon:{id:'business-a'}});await pending;
 assert.equal(h.signed,true);assert.equal(h.env.state.active,'business-a');assert(h.events.indexOf('verify')<h.events.indexOf('signIn'));
});
test('saved owner deep link survives successful re-verification',async()=>{
 const h=harness({hash:'#bookings'});await h.runBoot();assert.equal(h.env.location.hash,'#bookings');assert.equal(h.signed,true);
});
test('same-owner shared diary updates during restoration cannot invalidate the session',async()=>{
 let release;const h=harness({hash:'#calendar',load:()=>new Promise(resolve=>release=resolve)});h.installStorage();const pending=h.runBoot();
 h.listeners.storage({key:h.env.KEY,newValue:'{}'});assert(!h.events.includes('invalidated'));
 release({ok:true,salon:{id:'business-a'}});await pending;assert.equal(h.signed,true);assert.equal(h.env.location.hash,'#calendar');
});
test('real identity changes and revocations invalidate a loading view and reject late results',async()=>{
 for(const owner of ['owner-b',null]){
  let release;const h=harness({load:()=>new Promise(resolve=>release=resolve)});h.installStorage();const pending=h.runBoot();h.owner(owner);if(!owner)h.auth(false);
  h.listeners.storage({key:'jovabook-auth',newValue:null});assert(h.events.includes('invalidated'));release({ok:true,salon:{id:'old-owner-business'}});await pending;assert.equal(h.signed,false);assert(!h.events.includes('signIn'));
 }
});
test('temporary service failure keeps auth, shows retry state, and succeeds without a login',async()=>{
 let failed=true;const h=harness({load:async()=>failed?{ok:false,network:true,message:'Temporary failure'}:{ok:true,salon:{id:'business-a'}}});await h.runBoot();
 assert.equal(h.signed,false);assert.equal(h.env.dir.hasSession(),true);assert.equal(h.env.ownerLoadError,'Temporary failure');assert.equal(h.env.restoringOwnerSession,true);
 failed=false;h.env.loadingOwner=true;await h.env.reloadOwner();assert.equal(h.signed,true);assert.equal(h.env.ownerLoadError,'');
});
test('same-owner refresh race retries once and repeated stale responses offer retry',async()=>{
 let reads=0;const h=harness({load:async()=>++reads===1?{ok:false,stale:true}:{ok:true,salon:{id:'business-a'}}});await h.runBoot();assert.equal(reads,2);assert.equal(h.signed,true);
 const failed=harness({load:async()=>({ok:false,stale:true})});await failed.runBoot();assert.equal(failed.signed,false);assert.equal(failed.env.loadingOwner,false);assert.match(failed.env.ownerLoadError,/try again/);
});
test('unverified public/customer pages never restore or query the owner diary',async()=>{
 for(const options of [{publicPage:true,hash:'#book/service'},{customerPage:true,hash:'#customer/login'},{hash:'#book/service'},{hash:'#manage/missing'},{hash:'#website'},{hash:'#forgot'},{hash:'#reset'}]){const h=harness(options);await h.runBoot();assert(!h.events.includes('verify'));assert(!h.events.includes('signIn'));assert.equal(h.env.location.hash,options.hash);}
});
test('Google transient adoption uses its pending retry without consuming a second OAuth code',async()=>{
 const h=harness();let retries=0;h.env.dir.hasPendingOwnerSessionAdoption=()=>true;h.env.dir.retryOwnerSessionAdoption=async()=>{retries++;h.env.dir.hasPendingOwnerSessionAdoption=()=>false;return {ok:true};};
 await h.restore();assert.equal(retries,1);assert.equal(h.signed,true);assert(h.events.indexOf('verify')<h.events.indexOf('signIn'));
});
test('definitive revoked or tenant-mismatched sessions fail closed',async()=>{
 for(const result of [{ok:false,auth:true},{ok:false,invalidTenant:true},{ok:false,wrongPortal:true}]){const h=harness({result});await h.runBoot();assert.equal(h.signed,false);assert(h.events.includes('invalidated'));assert(!h.events.includes('signIn'));}
});

test('a flood of same-owner cache events schedules no remote fetches or cache echo',async()=>{
 const h=harness();await h.restore();h.installStorage();const before=h.events.filter(event=>event==='verify').length,timers=[];h.env.setTimeout=fn=>timers.push(fn);
 for(let index=0;index<100;index++)h.listeners.storage({key:h.env.KEY,newValue:JSON.stringify({cache:index})});
 assert.equal(timers.length,0,'Cache broadcasts cannot schedule an API read');assert.equal(h.events.filter(event=>event==='verify').length,before);assert.equal(h.signed,true);
 h.owner('owner-b');h.listeners.storage({key:h.env.KEY,newValue:'{}'});assert(h.events.includes('invalidated'),'An actual identity change still fails closed');
});

test('unchanged expired access deadline is checked once, while new deadline or identity can recheck',()=>{
 const start=source.indexOf('const accessDeadlineAttempts=new Set();'),end=source.indexOf('const TEAM_ROUTES=',start),timers=new Map();let time=2000,next=0,reloads=0,identity='owner-a';
 const access={access:'active',business:{id:'business-a',status:'active'},lifecycle:{trialEndsAt:null},full_until:'1970-01-01T00:00:01.000Z',server_now:'1970-01-01T00:00:02.000Z'};
 const env={Date:{parse:Date.parse,now:()=>time},Set,Math,Number,accessRefreshTimer:null,syncTimer:null,dir:{sessionIdentity:()=>identity},salon:()=>({id:'business-a'}),signedIn:()=>true,clearTimeout:id=>timers.delete(id),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},closeModal:()=>{},render:()=>{},reloadOwner:()=>{reloads++;env.scheduleAccessCheck(access);}};
 vm.runInNewContext(source.slice(start,end),env);env.scheduleAccessCheck(access);assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,1000);
 const run=()=>{const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();};
 run();assert.equal(reloads,1);assert.equal(timers.size,0,'A stale active response must not arm another one-second timer');
 for(let index=0;index<10;index++)env.scheduleAccessCheck(access);assert.equal(timers.size,0);
 access.full_until='1970-01-01T00:00:05.000Z';env.scheduleAccessCheck(access);assert.equal(timers.size,1);time=6000;run();assert.equal(reloads,2);assert.equal(timers.size,0);
 identity='owner-b';env.scheduleAccessCheck(access);assert.equal(timers.size,1,'A distinct owner gets its own re-verification');
});

const notificationSource=source.slice(source.indexOf('// Background work updates notifications only.'),source.lastIndexOf('\n})();'));
function notificationHarness(){
 let time=100000,identity='owner-a',reads=0,merges=0,invalidated=0,reply=async()=>({ok:true,rows:[]}),interval;
 const salon={id:'business-a',emails:[]},bell={outerHTML:''},stored=new Map();
 const env={Promise,Map,Math,Date:{now:()=>time,parse:Date.parse},document:{hidden:false,querySelector:()=>null,addEventListener:()=>assert.fail('No owner visibility refresh may be registered')},navigator:{onLine:true},dir:{remote:true,hasSession:()=>true,sessionIdentity:()=>identity,loadActivity:async()=>{reads++;return reply();},ownerAccess:()=>assert.fail('Notifications cannot refresh billing')},signedIn:()=>true,isLive:()=>true,salon:()=>salon,pubMode:()=>false,customerScope:()=>false,syncPending:()=>false,loadingOwner:false,restoringOwnerSession:false,loadLive:()=>assert.fail('Notifications cannot refresh the diary'),render:()=>assert.fail('Notifications cannot re-render the dashboard'),invalidateOwnerView:()=>invalidated++,JovaEmailDelivery:{latest:()=>null,changed:(_events,rows)=>rows.length>0,fromRow:row=>row},snap:{},state:{salons:[salon]},KEY:'cache',localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>{merges++;stored.set(key,value);}},$:()=>bell,notifications:{header:()=>'<button>Updated notifications</button>'},setInterval:(fn,delay)=>{interval={fn,delay};}};
 vm.runInNewContext(notificationSource,env);
 return {env,salon,bell,get reads(){return reads;},get merges(){return merges;},get invalidated(){return invalidated;},get interval(){return interval;},time:value=>time=value,owner:value=>identity=value,reply:fn=>reply=fn};
}
test('notifications are the only timed refresh and coalesce overlapping ticks without touching diary data',async()=>{
 const h=notificationHarness();assert.equal(h.interval.delay,60000);let release;h.reply(()=>new Promise(resolve=>release=resolve));const first=h.env.refreshOwnerNotifications(),second=h.env.refreshOwnerNotifications();assert.equal(h.reads,1);release({ok:true,rows:[{id:'mail-1',at:'2026-11-09T10:00:00Z'}]});await Promise.all([first,second]);assert.equal(h.salon.emails.length,1);assert.match(h.bell.outerHTML,/Updated notifications/);assert.equal(h.merges,1);
});
test('notification poll pauses hidden, offline and restoring, with bounded retry backoff',async()=>{
 const h=notificationHarness();for(const flag of ['hidden','offline','loading','restoring']){h.env.document.hidden=flag==='hidden';h.env.navigator.onLine=flag!=='offline';h.env.loadingOwner=flag==='loading';h.env.restoringOwnerSession=flag==='restoring';await h.env.refreshOwnerNotifications();}assert.equal(h.reads,0);
 h.env.loadingOwner=false;h.env.restoringOwnerSession=false;h.reply(async()=>({ok:false,network:true}));await h.env.refreshOwnerNotifications();assert.equal(h.reads,1);await h.env.refreshOwnerNotifications();assert.equal(h.reads,1);h.time(160001);h.reply(async()=>({ok:true,rows:[]}));await h.env.refreshOwnerNotifications();assert.equal(h.reads,2);
});
test('notification replies for another owner or invalid tenant cannot merge private records',async()=>{
 const h=notificationHarness();let release;h.reply(()=>new Promise(resolve=>release=resolve));const pending=h.env.refreshOwnerNotifications();h.owner('owner-b');release({ok:true,rows:[{id:'old-owner-mail',at:'2026-11-09T10:00:00Z'}]});await pending;assert.equal(h.merges,0);assert.equal(h.salon.emails.length,0);
 for(const result of [{ok:false,auth:true},{ok:false,invalidTenant:true}]){const denied=notificationHarness();denied.reply(async()=>result);await denied.env.refreshOwnerNotifications();assert.equal(denied.invalidated,1);assert.equal(denied.merges,0);}
});
test('an owner-created series still refreshes its own verified diary after saving',async()=>{
 const start=source.indexOf('async function createSeries(request){'),end=source.indexOf('function demoSubscription(',start);let reads=0,writes=0,renders=0;
 const env={Array,Set,salon:()=>({id:'business-a'}),signedIn:()=>true,seriesSupported:()=>true,isLive:()=>true,flushSync:async()=>{},syncBlocked:false,syncPending:()=>false,dir:{sessionIdentity:()=> 'owner-a',ownerRpc:async()=>{writes++;return {ok:true,data:{ok:true,bookings:[]}};}},loadLive:async()=>{reads++;return {ok:true};},render:()=>renders++};
 vm.runInNewContext(source.slice(start,end),env);const result=await env.createSeries({dates:['2026-11-10','2026-11-17'],name:'Test Client',email:'test@example.test',serviceId:'service',staffId:'staff',time:'10:00'});assert.equal(result.ok,true);assert.equal(writes,1);assert.equal(reads,1);assert.equal(renders,1);
});
