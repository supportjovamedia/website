import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {webcrypto} from 'node:crypto';
const accounts=await readFile(new URL('../accounts.js',import.meta.url),'utf8'),google=await readFile(new URL('../google-auth.js',import.meta.url),'utf8');
const id='30000000-0000-4000-8000-000000000001';
const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
function native({confirmed=true,wrongPortal=false}={}){
 const local=new Map(),tab=new Map(),calls=[],state={salons:[],accounts:[],resets:[]},window={JOVA_SUPABASE:{url:'https://fixture.example.test',key:'public-fixture'}};
 vm.runInNewContext(accounts,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://book.jovamedia.com',search:'?portal=owner'},localStorage:storage(local),sessionStorage:storage(tab),fetch:async(url,options)=>{calls.push({url,options});let data={ok:true};if(url.endsWith('/auth/v1/user'))data={id,email:'owner@example.test',email_confirmed_at:confirmed?new Date().toISOString():null,user_metadata:{full_name:'Avery Smith'}};else if(url==='/api/jovabook/billing/status')data=wrongPortal?{ok:true,access:'wrong_portal',role:'operator'}:{ok:true,access:'no_business',no_business:true,business:null};else if(url.includes('/region'))data={allowed:true};else if(url.includes('/signup'))data={user:{id}};return {ok:true,status:200,json:async()=>data};}});
 return {api:window.JovaAccounts.create(()=>state,()=>{}),local,tab,calls};
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
