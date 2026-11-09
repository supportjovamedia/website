import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {webcrypto} from 'node:crypto';
const accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8'),google=await readFile(new URL('../google-auth.js',import.meta.url),'utf8');
const id='30000000-0000-4000-8000-000000000001';
const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
function native({confirmed=true,wrongPortal=false,emailFirst=false,verifyStatus=200,verifiedEmail='owner@example.test',adoptionFailures=0,budgetLimited=false}={}){
 const local=new Map(),tab=new Map(),calls=[],reports=[],state={salons:[],accounts:[],resets:[]},window={JovaOwnerDiagnostics:{failure:()=>{},setSession:()=>{},report:(...args)=>reports.push(args)},JOVA_SUPABASE:{url:'https://fixture.example.test',key:'public-fixture'}};
 vm.runInNewContext(accounts,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://book.jovamedia.com',search:'?portal=owner'},localStorage:storage(local),sessionStorage:storage(tab),fetch:async(url,options)=>{calls.push({url,options});let data={ok:true},status=200;if(url.endsWith('/reserve_owner_verification'))data=budgetLimited?{ok:false,limited:true,remaining:0}:{ok:true,remaining:2};else if(url.endsWith('/auth/v1/verify')){status=verifyStatus;data=status===200?{access_token:'otp-fixture-token',refresh_token:'otp-fixture-refresh',expires_in:3600}:{message:'PRIVATE_123456'};}else if(url.endsWith('/auth/v1/user')){if(adoptionFailures-->0)throw Error('Fixture connection failure');data={id,email:verifiedEmail,email_confirmed_at:confirmed?new Date().toISOString():null,user_metadata:{full_name:'Avery Smith',email_first:emailFirst,...(options.method==='PUT'?{email_first_profile_complete:true}:{})}};}else if(url==='/api/jovabook/billing/status')data=wrongPortal?{ok:true,access:'wrong_portal',role:'operator'}:{ok:true,access:'no_business',no_business:true,business:null};else if(url.includes('/region'))data={allowed:true};else if(url.includes('/signup'))data={user:{id}};return {ok:status<400,status,json:async()=>data};}});
 return {api:window.JovaAccounts.create(()=>state,()=>{}),local,tab,calls,reports};
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
