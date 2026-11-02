import test from 'node:test';
import assert from 'node:assert/strict';
import {createJovaBookDepositReadinessHandlers} from '../lib/jovabook-deposit-readiness.mjs';

const sid='20000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000001';
const platform='acct_FictionalPlatform',account='acct_FictionalSalon';
const settings={JOVABOOK_SUPABASE_URL:'https://fixture.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'public-fixture',JOVABOOK_CUSTOMER_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN:'b'.repeat(64),JOVABOOK_DEPOSIT_WEBHOOK_SECRET:'whsec_FictionalSecret',JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY:'sk_test_FictionalSecret',JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID:platform,JOVABOOK_CUSTOMER_STRIPE_MODE:'test',JOVABOOK_STRIPE_SECRET_KEY:'sk_test_SeparateSaasSecret',JOVABOOK_CUSTOMER_PAYMENTS_ENABLED:'false',JOVABOOK_CUSTOMER_PAYMENTS_APPROVED:'false',JOVABOOK_DEPOSIT_WORKER_READY:'false'};
const request=(body={salon_id:sid},{token='owner-fixture',origin='https://book.jovamedia.com',method='POST',raw}={})=>new Request('https://book.jovamedia.com/api/jovabook/deposits/readiness',{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})},...(method==='POST'?{body:raw??JSON.stringify(body)}:{})});
function fixture(options={}){
 const db=[],providers=[],envReads=[];let ownerVerified=false;
 const env=new Proxy({...settings,...options.env},{get(target,key){envReads.push(key);if(options.guardConfig&&!ownerVerified&&key.startsWith('JOVABOOK_CUSTOMER_'))throw Error('Configuration read before owner proof');return target[key];}});
 const send=async(url,init)=>{
  const path=new URL(url).pathname;db.push({path,method:init.method,body:init.body&&JSON.parse(init.body)});
  if(path==='/auth/v1/user'){assert.equal(init.method,'GET');if(options.expired)return Response.json({}, {status:401});return Response.json({id:uid,email_confirmed_at:options.unverified?null:'2026-11-01'});}
  if(path==='/rest/v1/rpc/owner_account_access'){assert.equal(init.method,'POST');const access=options.access||{ok:true,access:'active',business:{id:sid}};ownerVerified=access.ok===true&&access.access==='active'&&access.business?.id===sid;return Response.json(access);}
  assert.equal(ownerVerified,true,'Worker called before owner proof');
  assert.equal(path,'/rest/v1/rpc/booking_deposit_worker');assert.equal(init.method,'POST');const body=JSON.parse(init.body);assert.deepEqual(body,{p_token:settings.JOVABOOK_CUSTOMER_WORKER_TOKEN,p_action:'owner_status',p_payload:{salon_id:sid,user_id:uid}});
  if(options.dbFailure)throw Error('PRIVATE DATABASE ERROR '+settings.JOVABOOK_CUSTOMER_WORKER_TOKEN);
  return Response.json({ok:true,salon_id:sid,account_id:account,ready:false,payments:{enabled:false},attention:[{email:'private-customer@example.test',payment_intent:'pi_Private'}],...options.status});
 };
 const mutation=()=>{throw Error('Unexpected provider mutation');};
 const stripe={accounts:{retrieveCurrent:async()=>{providers.push('platform');if(options.platformFailure)throw Error(settings.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY);return {id:options.platform||platform};},retrieve:async id=>{providers.push('merchant');assert.equal(ownerVerified,true);assert.equal(id,account);if(options.merchantFailure)throw Error('PRIVATE MERCHANT ERROR');return {id:account,charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{card_payments:'active'},...options.merchant};}},checkout:{sessions:{create:mutation,expire:mutation}},refunds:{create:mutation},paymentIntents:{create:mutation},customers:{create:mutation}};
 return {db,providers,envReads,handlers:createJovaBookDepositReadinessHandlers({env,send,stripe})};
}

test('disabled payment gates still permit read-only owner, worker and separate account checks',async()=>{
 const f=fixture(),before={...settings},response=await f.handlers.readiness(request()),body=await response.json();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),'https://book.jovamedia.com');assert.equal(body.read_only,true);assert.deepEqual(body.activation,{payments_enabled:false,payments_approved:false,deposit_worker_ready:false});assert.equal(body.account_checks_passed,true);assert.equal(body.database.persisted_payment_ready,false);assert.equal(body.activation_ready,false);assert(body.missing_proof.includes('sql_payment_enablement_and_verified_binding'));assert.deepEqual(f.providers,['platform','merchant']);assert.deepEqual(settings,before);
 assert.deepEqual(f.db.map(x=>x.path),['/auth/v1/user','/rest/v1/rpc/owner_account_access','/rest/v1/rpc/booking_deposit_worker']);
});
test('wrong owner, customer, operator and restricted owner are denied before payment configuration or provider reads',async()=>{
 for(const access of [{ok:true,access:'active',business:{id:'30000000-0000-4000-8000-000000000001'}},{ok:false,access:'wrong_portal',role:'customer'},{ok:false,access:'wrong_portal',role:'operator'},{ok:true,access:'deleting',business:{id:sid}}]){
  const f=fixture({access,guardConfig:true}),response=await f.handlers.readiness(request()),body=await response.json();assert.equal(response.status,403);assert.deepEqual(Object.keys(body).sort(),['message','ok']);assert.deepEqual(f.providers,[]);assert.equal(f.db.length,2);assert(!f.envReads.some(key=>key.startsWith('JOVABOOK_CUSTOMER_')));
 }
});
test('missing auth, invalid auth and unverified email never reach owner worker or provider',async()=>{
 for(const [options,auth,expected,calls] of [[{},null,401,0],[{expired:true},'expired',401,1],[{unverified:true},'unverified',403,1]]){const f=fixture(options),response=await f.handlers.readiness(request(undefined,{token:auth}));assert.equal(response.status,expected);assert.equal(f.db.length,calls);assert.deepEqual(f.providers,[]);}
});
test('hostile origin, unexpected input, malformed business and oversized requests have no downstream calls',async()=>{
 for(const req of [request(undefined,{origin:'https://hostile.example.test'}),request({salon_id:sid,account_id:account}),request({salon_id:'bad'}),request(undefined,{raw:'{'}),request(undefined,{raw:'x'.repeat(8193)}),request(undefined,{method:'GET'})]){const f=fixture(),response=await f.handlers.readiness(req);assert([400,403,405].includes(response.status));assert.deepEqual(f.db,[]);assert.deepEqual(f.providers,[]);}
});
test('a mismatched platform blocks every connected merchant check and never leaks account IDs',async()=>{
 const f=fixture({platform:'acct_WrongPlatform'}),response=await f.handlers.readiness(request()),body=await response.json();assert.equal(body.platform.state,'mismatch');assert.equal(body.merchant.state,'not_checked');assert.equal(body.account_checks_passed,false);assert.deepEqual(f.providers,['platform']);assert(!JSON.stringify(body).includes('acct_'));
});
test('a missing, foreign or platform merchant binding is never queried as a connected business',async()=>{
 for(const [status,state] of [[{account_id:null},'not_connected'],[{salon_id:'30000000-0000-4000-8000-000000000001'},'not_checked'],[{account_id:platform},'mismatch'],[{account_id:'invalid'},'not_checked']]){const f=fixture({status}),response=await f.handlers.readiness(request()),body=await response.json();assert.equal(body.merchant.state,state);assert.equal(body.account_checks_passed,false);assert.deepEqual(f.providers,['platform']);}
});
test('paused charges and payouts remain account facts and do not falsely pass readiness',async()=>{
 const f=fixture({merchant:{charges_enabled:false,payouts_enabled:false}}),body=await(await f.handlers.readiness(request())).json();assert.equal(body.merchant.state,'verified');assert.equal(body.merchant.charges_enabled,false);assert.equal(body.merchant.payouts_enabled,false);assert.equal(body.account_checks_passed,false);assert.equal(body.activation_ready,false);
});
test('wrong merchant identities and provider failures stay unverified without propagating error details',async()=>{
 for(const [options,state] of [[{merchant:{id:'acct_Foreign'}},'mismatch'],[{merchantFailure:true},'unavailable'],[{platformFailure:true},'not_checked']]){const f=fixture(options),body=await(await f.handlers.readiness(request())).json();assert.equal(body.merchant.state,state);assert.equal(body.account_checks_passed,false);assert(!JSON.stringify(body).includes('PRIVATE'));assert(!JSON.stringify(body).includes(settings.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY));}
});
test('worker absence is a partial diagnostic, never a guessed connection or new binding',async()=>{
 const f=fixture({dbFailure:true}),body=await(await f.handlers.readiness(request())).json();assert.equal(body.database.state,'unavailable');assert.equal(body.database.persisted_payment_ready,null);assert.equal(body.merchant.state,'not_checked');assert.equal(body.account_checks_passed,false);assert.deepEqual(f.providers,['platform']);assert(!JSON.stringify(body).includes('PRIVATE'));
});
test('missing, reused or mode-inconsistent credentials report booleans without provider calls',async()=>{
 for(const env of [{JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY:''},{JOVABOOK_STRIPE_SECRET_KEY:settings.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY},{JOVABOOK_CUSTOMER_STRIPE_MODE:'live'}]){const f=fixture({env}),body=await(await f.handlers.readiness(request())).json();assert.equal(body.platform.state,'unconfigured');assert.equal(body.account_checks_passed,false);assert.deepEqual(f.providers,[]);}
 const f=fixture({env:{JOVABOOK_CUSTOMER_WORKER_TOKEN:'',JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN:'',JOVABOOK_DEPOSIT_WEBHOOK_SECRET:''}}),body=await(await f.handlers.readiness(request())).json();assert.equal(body.configuration.customer_worker,false);assert.equal(body.configuration.refund_worker,false);assert.equal(body.configuration.webhook_signing,false);assert.equal(body.database.state,'unconfigured');assert.equal(f.db.length,2);
});
test('even all flags and persisted readiness cannot assert webhook, scheduler or refund execution',async()=>{
 const f=fixture({env:{JOVABOOK_CUSTOMER_PAYMENTS_ENABLED:'true',JOVABOOK_CUSTOMER_PAYMENTS_APPROVED:'true',JOVABOOK_DEPOSIT_WORKER_READY:'true'},status:{ready:true}}),body=await(await f.handlers.readiness(request())).json();assert(Object.values(body.activation).every(Boolean));assert.equal(body.account_checks_passed,true);assert.equal(body.activation_ready,false);assert(body.missing_proof.includes('connected_account_mode_binding'));assert(body.missing_proof.includes('production_webhook_delivery'));assert(body.missing_proof.includes('deposit_scheduler_execution'));assert(body.missing_proof.includes('refund_worker_execution'));assert(body.missing_proof.includes('captured_deposit_and_refund'));
});
test('response projection excludes credentials, internal references and customer data returned by dependencies',async()=>{
 const f=fixture(),response=await f.handlers.readiness(request()),serialized=await response.text();for(const value of [platform,account,settings.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY,settings.JOVABOOK_CUSTOMER_WORKER_TOKEN,settings.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN,settings.JOVABOOK_DEPOSIT_WEBHOOK_SECRET,'private-customer@example.test','pi_Private',uid])assert(!serialized.includes(value),value);
});
test('CORS preflight exposes no configuration and unauthorised sites receive no allow-origin',async()=>{
 const f=fixture(),allowed=await f.handlers.options(request(undefined,{method:'OPTIONS'}));assert.equal(allowed.status,204);assert.equal(await allowed.text(),'');const blocked=await f.handlers.options(request(undefined,{method:'OPTIONS',origin:'https://hostile.example.test'}));assert.equal(blocked.status,403);assert.equal(blocked.headers.get('access-control-allow-origin'),null);assert.deepEqual(f.db,[]);assert.deepEqual(f.providers,[]);
});
