import Stripe from 'stripe';

const ORIGINS=new Set(['https://book.jovamedia.com','https://jovamedia.com','https://www.jovamedia.com']);
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
const accountId=value=>typeof value==='string'&&/^acct_[A-Za-z0-9_]+$/.test(value);
const fail=(status,message)=>Object.assign(Error(message),{status});

/** Diagnostic only. Never call payment handlers, integration verification,
 * owner_verify, reconciliation, scheduler claims or provider mutations here. */
export function createJovaBookDepositReadinessHandlers({env=process.env,send=fetch,stripe:injected}={}){
 let client=injected;
 const stripe=()=>client||(client=new Stripe(env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',timeout:10000,maxNetworkRetries:0}));
 function headers(request){const origin=request.headers.get('origin');return {'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',Vary:'Origin',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}:{})};}
 const reply=(request,status,data)=>Response.json(data,{status,headers:headers(request)});
 function origin(request){const value=request.headers.get('origin');if(value&&!ORIGINS.has(value))throw fail(403,'Open this request from JovaBook.');}
 function databaseConfigured(){try{const url=new URL(env.JOVABOOK_SUPABASE_URL);return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash&&!!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY;}catch{return false;}}
 async function api(path,body,token){
  if(!databaseConfigured())throw fail(503,'Readiness could not be verified.');
  const response=await send(new URL(path,env.JOVABOOK_SUPABASE_URL).href,{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let data;try{data=await response.json();}catch{}
  if(!response.ok)throw fail(response.status===401?401:response.status===403?403:503,'Your business could not be verified.');
  return data;
 }
 async function input(request){
  origin(request);if(request.method!=='POST')throw fail(405,'POST only.');
  const reader=request.body?.getReader(),chunks=[];let size=0;
  if(reader)for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();throw fail(400,'Invalid request.');}chunks.push(part.value);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'Invalid request.');}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(key=>key!=='salon_id')||!UUID.test(body.salon_id||''))throw fail(400,'Choose your business.');
  return body;
 }
 async function owner(request,salon){
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!token)throw fail(401,'Log in to check your business.');
  const user=await api('/auth/v1/user',undefined,token);
  if(!UUID.test(user?.id||'')||!user.email_confirmed_at)throw fail(403,'Verify your business account first.');
  // This RPC enforces server-owned business/customer/operator separation.
  const access=await api('/rest/v1/rpc/owner_account_access',{},token);
  if(access?.ok!==true||access.access!=='active'||access.business?.id!==salon)throw fail(403,'This business is unavailable for this account.');
  return {salon_id:salon,user_id:user.id};
 }
 function configuration(){
  const mode=env.JOVABOOK_CUSTOMER_STRIPE_MODE;
  const paymentKey=['live','test'].includes(mode)&&new RegExp('^(sk|rk)_'+mode+'_[A-Za-z0-9]+$').test(env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY||'');
  return {
   customer_worker:HEX.test(env.JOVABOOK_CUSTOMER_WORKER_TOKEN||''),
   refund_worker:HEX.test(env.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN||'')&&env.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN!==env.JOVABOOK_CUSTOMER_WORKER_TOKEN,
   webhook_signing:/^whsec_[A-Za-z0-9]+$/.test(env.JOVABOOK_DEPOSIT_WEBHOOK_SECRET||''),
   payment_provider:paymentKey&&accountId(env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID),
   separate_payment_key:paymentKey&&env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY!==env.JOVABOOK_STRIPE_SECRET_KEY
  };
 }
 async function readiness(request){try{
  const body=await input(request),actor=await owner(request,body.salon_id);
  // No flags, secret-presence information or provider access before owner proof.
  const config=configuration(),activation={payments_enabled:env.JOVABOOK_CUSTOMER_PAYMENTS_ENABLED==='true',payments_approved:env.JOVABOOK_CUSTOMER_PAYMENTS_APPROVED==='true',deposit_worker_ready:env.JOVABOOK_DEPOSIT_WORKER_READY==='true'};
  const database={state:config.customer_worker?'unavailable':'unconfigured',persisted_payment_ready:null};
  let boundAccount=null;
  if(config.customer_worker){try{
   // Audited existing SQL branch: owner lock and SELECTs only, even with gates off.
   // Do not serialize its payments, attention entries or account reference.
   const data=await api('/rest/v1/rpc/booking_deposit_worker',{p_token:env.JOVABOOK_CUSTOMER_WORKER_TOKEN,p_action:'owner_status',p_payload:actor});
   if(data?.ok!==true||data.salon_id!==actor.salon_id||typeof data.ready!=='boolean'||data.account_id!=null&&!accountId(data.account_id))throw Error('Invalid owner status.');
   database.state='verified';database.persisted_payment_ready=data.ready;boundAccount=data.account_id||null;
  }catch{/* A missing worker/migration is an explicit proof gap, never enablement. */}}
  const platform={state:'unconfigured'},merchant={state:database.state==='verified'&&!boundAccount?'not_connected':'not_checked'};
  if(config.payment_provider&&config.separate_payment_key){
   platform.state='unavailable';try{
    const value=await stripe().accounts.retrieveCurrent();
    platform.state=value?.id===env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID?'verified':'mismatch';
   }catch{/* Do not return provider error text or credentials. */}
   if(platform.state==='verified'&&boundAccount){
    if(boundAccount===env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID)merchant.state='mismatch';
    else{merchant.state='unavailable';try{
     const value=await stripe().accounts.retrieve(boundAccount);
     if(value?.id!==boundAccount)merchant.state='mismatch';
     else Object.assign(merchant,{state:'verified',charges_enabled:value.charges_enabled===true,payouts_enabled:value.payouts_enabled===true,details_submitted:value.details_submitted===true,card_payments_active:value.capabilities?.card_payments==='active'});
    }catch{/* Restricted/deauthorised merchant access remains unverified. */}}
   }
  }
  const merchantReady=merchant.state==='verified'&&merchant.charges_enabled&&merchant.payouts_enabled&&merchant.details_submitted&&merchant.card_payments_active;
  // owner_status exposes the OAuth account binding, but not its saved mode.
  const missingProof=['connected_account_mode_binding','production_webhook_delivery','deposit_scheduler_execution','refund_worker_execution','captured_deposit_and_refund'];
  if(database.persisted_payment_ready!==true)missingProof.push('sql_payment_enablement_and_verified_binding');
  // Account capabilities cannot prove webhook delivery, durable worker operation
  // or a real captured-deposit refund. This endpoint never claims activation ready.
  return reply(request,200,{ok:true,read_only:true,configuration:config,activation,database,platform,merchant,account_checks_passed:Object.values(config).every(Boolean)&&database.state==='verified'&&platform.state==='verified'&&merchantReady===true,activation_ready:false,missing_proof:missingProof});
 }catch(error){return reply(request,error.status||503,{ok:false,message:error.status&&error.status<500?error.message:'Readiness could not be verified. No payment settings were changed.'});}}
 async function options(request){try{origin(request);return new Response(null,{status:204,headers:headers(request)});}catch{return reply(request,403,{ok:false,message:'Open this request from JovaBook.'});}}
 return {readiness,options};
}
