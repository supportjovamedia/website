import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {webcrypto} from 'node:crypto';
const accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8'),google=await readFile(new URL('../google-auth.js',import.meta.url),'utf8');
const id='30000000-0000-4000-8000-000000000001';
const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
function native({confirmed=true,wrongPortal=false,emailFirst=false,verifyStatus=200,verifiedEmail='owner@example.test',adoptionFailures=0,budgetLimited=false,service={}}={}){
 const local=new Map(),tab=new Map(),calls=[],reports=[],state={salons:[],accounts:[],resets:[]},window={JovaOwnerDiagnostics:{failure:()=>{},setSession:()=>{},report:(...args)=>reports.push(args)},JOVA_SUPABASE:{url:'https://fixture.example.test',key:'public-fixture'}};
 vm.runInNewContext(accounts,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://book.jovamedia.com',search:'?portal=owner'},localStorage:storage(local),sessionStorage:storage(tab),fetch:async(url,options)=>{calls.push({url,options});const stage=url.endsWith('/auth/v1/user')?'user':url.endsWith('/api/jovabook/billing/status')?'access':url.endsWith('/owner_onboarding_progress')?'onboarding':null,failure=service[stage];if(failure==='network')throw Error('Fixture network failure');if(failure?.promise)await failure.promise;let data={ok:true},status=200;if(url.endsWith('/reserve_owner_verification'))data=budgetLimited?{ok:false,limited:true,remaining:0}:{ok:true,remaining:2};else if(url.endsWith('/auth/v1/verify')){status=verifyStatus;data=status===200?{access_token:'otp-fixture-token',refresh_token:'otp-fixture-refresh',expires_in:3600}:{message:'PRIVATE_123456'};}else if(url.endsWith('/auth/v1/user')){if(adoptionFailures-->0)throw Error('Fixture connection failure');data={id,email:verifiedEmail,email_confirmed_at:confirmed?new Date().toISOString():null,user_metadata:{full_name:'Avery Smith',email_first:emailFirst,...(options.method==='PUT'?{email_first_profile_complete:true}:{})}};}else if(url.endsWith('/api/jovabook/billing/status'))data=wrongPortal?{ok:true,access:'wrong_portal',role:'operator'}:{ok:true,access:'no_business',no_business:true,business:null};else if(url.includes('/region'))data={allowed:true};else if(url.includes('/signup'))data={user:{id}};if(typeof failure==='number')status=failure;if(failure==='malformed')data={};return {ok:status<400,status,json:async()=>data};}});
 return {api:window.JovaAccounts.create(()=>state,()=>{}),local,tab,calls,reports,service};
}
test('Google sessions are verified against Auth before storage and another portal cannot open business setup',async()=>{
 for(const options of [{confirmed:false},{wrongPortal:true}]){const h=native(options),result=await h.api.acceptGoogleSession({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600,user:{id:'forged'}});assert.equal(result.ok,false);assert.equal(h.local.has('jovabook-auth'),false);assert(!h.calls.some(c=>c.url.includes('create_business')));}
 const h=native(),result=await h.api.acceptGoogleSession({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600,user:{id:'forged'}});assert.equal(result.ok,true);assert.equal(result.needsBusiness,true);assert.equal(JSON.parse(h.local.get('jovabook-auth')).user.id,id);assert(!h.calls.some(c=>c.url.includes('create_business')));
});
test('email-first account creation saves submitted profile, requests verification and never persists a password',async()=>{
 const h=native(),r=await h.api.registerOwnerProfile({email:'owner@example.test',password:'FixtureOnly2026',firstName:'Avery',lastName:'Smith',country:'GB'});assert.equal(r.verificationRequired,true);const request=h.calls.find(c=>c.url.includes('/signup')),body=JSON.parse(request.options.body);assert.equal(body.data.first_name,'Avery');assert.equal(body.data.last_name,'Smith');assert.equal(body.data.country,'GB');assert.equal(body.data.signup_intent,'business');assert(!Object.hasOwn(body.data,'password'));assert(!h.local.has('jovabook-auth'));assert(![...h.local.values(),...h.tab.values()].some(x=>x.includes('FixtureOnly2026')));
});
test('PKCE callbacks require the recent same-tab flow, consume the code once and remove callback parameters',async()=>{
 for(const kind of ['missing','expired','cancelled','valid']){
  const tab=new Map(),calls=[],history=[],session={access_token:'fixture-only',refresh_token:'fixture-only-refresh'},window={JOVA_GOOGLE_AUTH_ENABLED:true,JOVA_SUPABASE:{url:'https://fixture.example.test',key:'fixture-public'},supabase:{createClient:()=>({auth:{exchangeCodeForSession:async code=>{calls.push(code);return {data:{session}};}}})}};
  if(kind!=='missing')tab.set('jovabook-google-start',JSON.stringify({started:Date.now()-(kind==='expired'?700000:0)}));
  vm.runInNewContext(google,{window,URL,URLSearchParams,Date,Promise,sessionStorage:storage(tab),location:{search:'?portal=owner&'+(kind==='cancelled'?'error=access_denied':'code=fixture-code'),pathname:'/'},history:{replaceState:(a,b,url)=>history.push(url)},document:{addEventListener:()=>{}}});
  const r=await window.JovaGoogleAuth.callback();assert.equal(r.handled,true);assert.equal(r.ok,kind==='valid');assert.equal(calls.length,kind==='valid'?1:0);assert(history.every(x=>!x.includes('fixture-code')&&!x.includes('access_denied')));assert(!tab.has('jovabook-google-start'));
  if(kind==='valid'){await window.JovaGoogleAuth.callback();assert.equal(calls.length,1);}
 }
});


test('email-first entry sends verification before any profile and stores no usable password',async()=>{
 const h=native(),result=await h.api.requestOwnerVerification('owner@example.test');assert.equal(result.verificationRequired,true);const payload=JSON.parse(h.calls.find(c=>c.url.includes('/signup')).options.body);assert.equal(payload.data.email_first,true);assert.equal(payload.data.signup_intent,'business');assert(!Object.hasOwn(payload.data,'owner_name'));assert(payload.password.length>=48);assert.equal(h.local.size,0);assert.equal(h.tab.size,0);
});
test('verified email owners set their password only through Auth, never the profile SQL payload',async()=>{
 const h=native({emailFirst:true});await h.api.acceptGoogleSession({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600});assert.equal(h.api.needsOwnerPassword(),true);
 const result=await h.api.completeOwnerProfile({first_name:'Avery',last_name:'Smith',mobile:'',country:'GB',password:'ActualPassword2026'});assert.equal(result.ok,true);const profile=h.calls.filter(c=>c.url.includes('/owner_onboarding_progress')).map(c=>JSON.parse(c.options.body)).find(x=>x.p_step==='profile');assert(!Object.hasOwn(profile.p_values,'password'));assert(h.calls.some(c=>c.url.endsWith('/auth/v1/user')&&c.options.method==='PUT'));assert.equal(h.api.needsOwnerPassword(),false);
});


test('OTP rejects malformed, expired, unconfirmed and wrong-account codes without signing in',async()=>{
 for(const options of [{verifyStatus:400},{verifyStatus:429},{confirmed:false},{verifiedEmail:'other@example.test'},{wrongPortal:true}]){
  const h=native(options);const result=await h.api.verifyOwnerCode('owner@example.test','123456');assert.equal(result.ok,false);assert.equal(h.local.has('jovabook-auth'),false);assert(!JSON.stringify(h.reports).includes('123456'));
 }
 const h=native();assert.equal((await h.api.verifyOwnerCode('owner@example.test','123')).ok,false);assert.equal(h.calls.length,0);
});
test('OTP adopts only native verified identity and retries transient adoption without reusing the code',async()=>{
 const h=native({adoptionFailures:1,emailFirst:true});assert.equal((await h.api.verifyOwnerCode('owner@example.test','123456')).ok,false);assert.equal((await h.api.verifyOwnerCode('owner@example.test','123456')).ok,true);
 assert.equal(h.calls.filter(c=>c.url.endsWith('/auth/v1/verify')).length,1);assert.equal(h.api.needsOwnerPassword(),true);assert(![...h.local.values(),...h.tab.values()].some(v=>v.includes('123456')));
 const payload=JSON.parse(h.calls.find(c=>c.url.endsWith('/auth/v1/verify')).options.body);assert.equal(payload.type,'email');assert.equal(payload.token,'123456');
});
test('code requests fail closed at the shared budget and resend uses the native signup route',async()=>{
 const h=native({budgetLimited:true});assert.equal((await h.api.requestOwnerVerification('owner@example.test')).limited,true);assert.equal((await h.api.resendOwnerVerification('owner@example.test')).limited,true);assert(!h.calls.some(c=>c.url.includes('/signup')||c.url.includes('/resend')));
 const allowed=native();assert.equal((await allowed.api.resendOwnerVerification('owner@example.test')).ok,true);const payload=JSON.parse(allowed.calls.find(c=>c.url.endsWith('/auth/v1/resend')).options.body);assert.equal(payload.type,'signup');
});

const googleSession=()=>({access_token:'google-exchanged-token',refresh_token:'google-exchanged-refresh',expires_at:Date.now()/1000+3600,user:{id:'untrusted-provider-hint'}});
test('transient native identity verification remains resumable without persisting an unverified Google identity',async()=>{
 for(const failure of ['network',429,500,'malformed']){
  const service={user:failure},h=native({service}),result=await h.api.acceptGoogleSession(googleSession());
  assert.equal(result.resumable,true,String(failure));assert.equal(result.adoptionPending,true);assert.equal(result.stage,'verify_session');assert.equal(h.local.has('jovabook-auth'),false);assert.equal(h.api.hasPendingOwnerSessionAdoption(),true);
  delete service.user;const retried=await h.api.retryOwnerSessionAdoption();assert.equal(retried.ok,true);assert.equal(retried.needsBusiness,true);assert.equal(h.api.hasPendingOwnerSessionAdoption(),false);assert.equal(JSON.parse(h.local.get('jovabook-auth')).user.id,id);
  assert.equal(h.calls.filter(call=>call.url.endsWith('/auth/v1/user')).length,2);assert(!h.calls.some(call=>call.url.includes('grant_type=pkce')||call.url.includes('grant_type=password')));
 }
});

test('verified Google tokens survive transient access and onboarding failures but tenant access stays unverified until retry succeeds',async()=>{
 for(const stage of ['access','onboarding'])for(const failure of ['network',429,503,'malformed']){
  const service={[stage]:failure},h=native({service}),result=await h.api.acceptGoogleSession(googleSession());
  assert.equal(result.resumable,true,stage+' '+failure);assert.equal(result.stage,stage==='access'?'account_access':'onboarding');assert.equal(h.api.hasPendingOwnerSessionAdoption(),true);
  const kept=JSON.parse(h.local.get('jovabook-auth'));assert.equal(kept.access_token,'google-exchanged-token');assert.equal(kept.user.id,id);assert.equal(h.api.canWrite('unverified-business'),false);assert.equal(h.api.existingBusinessContext(),null);
  delete service[stage];const retried=await h.api.retryOwnerSessionAdoption();assert.equal(retried.ok,true);assert.equal(retried.needsBusiness,true);assert.equal(h.api.existingBusinessContext().email,'owner@example.test');assert.equal(h.api.hasPendingOwnerSessionAdoption(),false);assert(!h.calls.some(call=>call.url.includes('create_business')));
 }
});

test('revoked, forbidden, unconfirmed, wrong-email and wrong-portal adoptions cannot become resumable authenticated sessions',async()=>{
 for(const stage of ['user','access','onboarding'])for(const status of [401,403]){
  const h=native({service:{[stage]:status}}),result=await h.api.acceptGoogleSession(googleSession());assert.equal(result.ok,false,stage+' '+status);assert.notEqual(result.resumable,true);assert.equal(h.local.has('jovabook-auth'),false);assert.equal(h.api.hasPendingOwnerSessionAdoption(),false);
 }
 for(const options of [{confirmed:false},{wrongPortal:true}]){const h=native(options),result=await h.api.acceptGoogleSession(googleSession());assert.equal(result.ok,false);assert.notEqual(result.resumable,true);assert.equal(h.api.hasPendingOwnerSessionAdoption(),false);assert.equal(h.local.has('jovabook-auth'),false);}
 const wrong=native(),result=await wrong.api.acceptOwnerSession(googleSession(),'another@example.test');assert.equal(result.ok,false);assert.equal(wrong.local.has('jovabook-auth'),false);assert.equal(wrong.api.hasPendingOwnerSessionAdoption(),false);
});

test('pending Google adoption is invalidated by another account or logout and late native verification cannot overwrite another session',async()=>{
 const h=native({service:{user:'network'}});await h.api.acceptGoogleSession(googleSession());
 const other={...googleSession(),access_token:'other-token',user:{id:'other-owner'}};h.local.set('jovabook-auth',JSON.stringify(other));const before=h.calls.length;assert.equal(h.api.hasPendingOwnerSessionAdoption(),false);assert.equal((await h.api.retryOwnerSessionAdoption()).stale,true);assert.equal(h.calls.length,before);assert.equal(JSON.parse(h.local.get('jovabook-auth')).user.id,'other-owner');
 const logout=native({service:{access:503}});await logout.api.acceptGoogleSession(googleSession());await logout.api.logout();assert.equal(logout.api.hasPendingOwnerSessionAdoption(),false);assert.equal((await logout.api.retryOwnerSessionAdoption()).stale,true);assert.equal(logout.local.has('jovabook-auth'),false);
 let release;const gate={promise:new Promise(resolve=>release=resolve)},late=native({service:{user:gate}}),adopting=late.api.acceptGoogleSession(googleSession());await new Promise(resolve=>setImmediate(resolve));late.local.set('jovabook-auth',JSON.stringify(other));release();assert.equal((await adopting).stale,true);assert.equal(JSON.parse(late.local.get('jovabook-auth')).user.id,'other-owner');assert.equal(late.api.hasPendingOwnerSessionAdoption(),false);
});
