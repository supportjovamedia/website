import Stripe from 'stripe';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

const BASE='https://book.jovamedia.com';
const ORIGINS=new Set([BASE,'https://jovamedia.com','https://www.jovamedia.com']);
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
const SLUG=/^[a-z0-9][a-z0-9-]{1,62}$/;
const id=(v,p)=>typeof v==='string'&&new RegExp('^'+p+'_[A-Za-z0-9_]+$').test(v);
const objectId=v=>typeof v==='string'?v:v?.id;
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>Object.assign(Error(message),{status});
const same=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);};
const checkoutUrl=value=>{try{const u=new URL(value);return u.origin==='https://checkout.stripe.com'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}};

export function depositsConfigured(env){
 return env.JOVABOOK_DEPOSIT_WORKER_READY==='true'&&/^whsec_[A-Za-z0-9]+$/.test(env.JOVABOOK_DEPOSIT_WEBHOOK_SECRET||'')&&
 HEX.test(env.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN||'')&&env.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN!==env.JOVABOOK_CUSTOMER_WORKER_TOKEN&&
 env.JOVABOOK_CUSTOMER_PAYMENTS_ENABLED==='true'&&env.JOVABOOK_CUSTOMER_PAYMENTS_APPROVED==='true'&&
 /^https:\/\/[^/]+\/?$/.test(env.JOVABOOK_SUPABASE_URL||'')&&!!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY&&HEX.test(env.JOVABOOK_CUSTOMER_WORKER_TOKEN||'')&&
 ['live','test'].includes(env.JOVABOOK_CUSTOMER_STRIPE_MODE)&&id(env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID,'acct')&&
 new RegExp('^(sk|rk)_'+env.JOVABOOK_CUSTOMER_STRIPE_MODE+'_[A-Za-z0-9]+$').test(env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY||'')&&
 env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY!==env.JOVABOOK_STRIPE_SECRET_KEY;
}

/** Customer money is a direct charge on the business account. No application fee
 * or subscription charge is added here. Every external side effect is injectable. */
export function createJovaBookDepositHandlers({env=process.env,send=fetch,stripe:injected,now=Date.now}={}){
 let client=injected;
 const stripe=()=>client||(client=new Stripe(env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',timeout:10000,maxNetworkRetries:0}));
 const live=()=>env.JOVABOOK_CUSTOMER_STRIPE_MODE==='live';
 const configured=()=>depositsConfigured(env);
 const headers=r=>({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',Vary:'Origin',...(ORIGINS.has(r.headers.get('origin'))?{'Access-Control-Allow-Origin':r.headers.get('origin'),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}:{})});
 const reply=(r,status,data)=>Response.json(data,{status,headers:headers(r)});
 const error=(r,e)=>reply(r,e.status||503,{ok:false,message:e.status&&e.status<500?e.message:'We could not complete this payment check. Keep this page and try again. Your payment will not be taken twice.'});
 function origin(r){if(!ORIGINS.has(r.headers.get('origin')))throw fail(403,'Open this request from JovaBook.');}
 async function raw(r,max=16384){const reader=r.body?.getReader(),chunks=[];let size=0;if(reader)for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max){await reader.cancel();throw fail(400,'Request is too large.');}chunks.push(part.value);}return Buffer.concat(chunks).toString('utf8');}
 async function input(r,keys){origin(r);if(r.method!=='POST')throw fail(405,'POST only.');let b;try{b=JSON.parse(await raw(r));}catch(e){if(e.status)throw e;throw fail(400,'Invalid request.');}if(!b||Array.isArray(b)||typeof b!=='object'||Object.keys(b).some(k=>!keys.includes(k)))throw fail(400,'Invalid request.');return b;}
 async function api(path,body,token){const response=await send(new URL(path,env.JOVABOOK_SUPABASE_URL),{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});let result;try{result=await response.json();}catch{}if(!response.ok)throw fail(response.status===401?401:409,'This business, booking or checkout has changed. Refresh and try again.');return result;}
 const worker=(action,payload={})=>api('/rest/v1/rpc/booking_deposit_worker',{p_token:env.JOVABOOK_CUSTOMER_WORKER_TOKEN,p_action:action,p_payload:payload});
 async function platform(){const a=await stripe().accounts.retrieveCurrent();if(a?.id!==env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID)throw Error('Wrong payment platform.');}
 async function merchant(account,strict=true){if(!id(account,'acct')||account===env.JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID)throw Error('Invalid business account.');const a=await stripe().accounts.retrieve(account);if(a?.id!==account||strict&&(!a.charges_enabled||!a.payouts_enabled||!a.details_submitted||a.capabilities?.card_payments!=='active'))throw fail(409,'The business must finish its Stripe payment setup first.');return a;}
 async function owner(r,salon){if(!UUID.test(salon||''))throw fail(400,'Choose your business.');const token=r.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!token)throw fail(401,'Log in to manage deposits.');const [user,access]=await Promise.all([api('/auth/v1/user',undefined,token),api('/rest/v1/rpc/owner_account_access',{},token)]);if(!UUID.test(user?.id||'')||!user.email_confirmed_at||access?.ok!==true||access.business?.id!==salon||access.access!=='active')throw fail(403,'This business is unavailable for this account.');return {salon_id:salon,user_id:user.id};}
 const metadata=h=>({app:'jovabook-deposit',checkout_id:h.id,salon_id:h.salon_id,booking_id:h.booking_id});
 function validHold(h){return UUID.test(h?.id||'')&&UUID.test(h.salon_id||'')&&id(h.account_id,'acct')&&Number.isSafeInteger(h.amount)&&h.amount>=30&&h.amount<=1000000&&h.currency==='gbp'&&Number.isFinite(Date.parse(h.created_at))&&Number.isFinite(Date.parse(h.expires_at))&&typeof h.booking_id==='string'&&h.booking_id.length>=30;}
 function sessionMatches(s,h){return id(s?.id,'cs')&&s.mode==='payment'&&s.livemode===live()&&s.client_reference_id===h.id&&s.amount_total===h.amount&&s.currency===h.currency&&Object.entries(metadata(h)).every(([k,v])=>s.metadata?.[k]===v)&&(!h.provider_id||s.id===h.provider_id);}
 async function findSession(h){let after;const matches=[];for(let page=0;page<10;page++){const batch=await stripe().checkout.sessions.list({created:{gte:Math.floor(Date.parse(h.created_at)/1000)-5,lte:Math.floor(Date.parse(h.expires_at)/1000)+60},limit:100,...(after?{starting_after:after}:{})},{stripeAccount:h.account_id});if(!Array.isArray(batch.data))throw Error('Invalid checkout history.');matches.push(...batch.data.filter(s=>s.metadata?.checkout_id===h.id));if(!batch.has_more){if(matches.length>1)throw Error('Duplicate checkout needs attention.');return matches[0]||null;}after=batch.data.at(-1)?.id;if(!after)break;}throw Error('Checkout history needs attention.');}
 async function readSession(h){const s=h.provider_id?await stripe().checkout.sessions.retrieve(h.provider_id,{}, {stripeAccount:h.account_id}):await findSession(h);if(s&&!sessionMatches(s,h))throw Error('Checkout binding mismatch.');return s;}
 async function reconcile(h){
  if(!validHold(h))throw Error('Invalid checkout record.');
  if(h.stage==='paid'){const result=await worker('paid',{id:h.id,account_id:h.account_id,provider_id:h.provider_id});return {stage:'paid',...result};}
  if(h.stage==='expired')return {ok:true,stage:h.resolution==='externally_refunded'?'refunded':'expired'};
  await merchant(h.account_id,false);const s=await readSession(h);
  if(!s){if(now()>Date.parse(h.expires_at)+5*60000){await worker('expired_without_session',{id:h.id});return {ok:true,stage:'expired'};}return {ok:true,stage:'pending'};}
  if(!h.provider_id){await worker('attach',{id:h.id,account_id:h.account_id,provider_id:s.id,url:checkoutUrl(s.url)});h={...h,provider_id:s.id};}
  if(s.status==='expired'){await worker('expired',{id:h.id,account_id:h.account_id,provider_id:s.id});return {ok:true,stage:'expired'};}
  if(s.payment_status!=='paid'){
   const pendingIntent=objectId(s.payment_intent);
   if(s.status==='complete'&&id(pendingIntent,'pi')){
    const failed=await stripe().paymentIntents.retrieve(pendingIntent,{expand:['latest_charge']},{stripeAccount:h.account_id}),charge=failed?.latest_charge;
    if(failed?.id===pendingIntent&&failed.livemode===live()&&failed.amount===h.amount&&failed.currency===h.currency&&failed.amount_received===0&&['canceled','requires_payment_method'].includes(failed.status)&&Object.entries(metadata(h)).every(([k,v])=>failed.metadata?.[k]===v)&&(!charge||typeof charge==='object'&&charge.status==='failed'&&charge.paid===false&&charge.captured===false)){
     await worker('expired',{id:h.id,account_id:h.account_id,provider_id:s.id});return {ok:true,stage:'expired'};
    }
   }
   return {ok:true,stage:'pending',...(s.status==='open'&&checkoutUrl(s.url)?{url:checkoutUrl(s.url)}:{})};
  }
  const piId=objectId(s.payment_intent);if(!id(piId,'pi'))throw Error('Missing payment proof.');
  const pi=await stripe().paymentIntents.retrieve(piId,{expand:['latest_charge']},{stripeAccount:h.account_id}),ch=pi?.latest_charge;
  if(pi?.id!==piId||pi.status!=='succeeded'||pi.livemode!==live()||pi.currency!==h.currency||pi.amount!==h.amount||pi.amount_received!==h.amount||pi.transfer_data||pi.application_fee_amount||Object.entries(metadata(h)).some(([k,v])=>pi.metadata?.[k]!==v)||!ch||typeof ch!=='object'||!id(ch.id,'ch')||ch.paid!==true||ch.captured!==true||ch.status!=='succeeded'||ch.currency!==h.currency||ch.amount_captured!==h.amount||!Number.isSafeInteger(ch.amount_refunded)||ch.amount_refunded<0||ch.amount_refunded>h.amount||objectId(ch.payment_intent)!==piId)throw Error('Payment proof mismatch.');
  if(ch.disputed||ch.amount_refunded>0){
   const proof={id:h.id,account_id:h.account_id,provider_id:s.id,payment_intent:piId};
   if(!ch.disputed&&ch.amount_refunded===h.amount){
    const refunds=await stripe().refunds.list({payment_intent:piId,limit:100},{stripeAccount:h.account_id});
    if(!refunds.has_more&&Array.isArray(refunds.data)&&refunds.data.length&&refunds.data.every(r=>id(r.id,'re')&&(r.livemode===undefined||r.livemode===live())&&r.status==='succeeded'&&objectId(r.payment_intent)===piId&&objectId(r.charge)===ch.id&&r.currency===h.currency&&Number.isSafeInteger(r.amount)&&r.amount>0)&&refunds.data.reduce((sum,r)=>sum+r.amount,0)===h.amount){
     const closed=await worker('externally_refunded',{...proof,amount:h.amount,currency:h.currency});if(closed?.ok!==true)throw Error('Refund reconciliation was not recorded.');return {ok:true,stage:'refunded'};
    }
   }
   await worker('attention',{...proof,reason:ch.disputed?'dispute':'external_refund'});
   return {ok:true,stage:'needs_attention',message:'This payment needs the business to review it in Stripe. No booking has been confirmed. Contact the business before paying again.'};
  }
  const saved=await worker('paid',{id:h.id,account_id:h.account_id,provider_id:s.id,payment_intent:piId,amount:h.amount,currency:h.currency,captured_at:ch.created});
  if(saved?.ok!==true)throw Error('Payment confirmation was not recorded.');return {stage:'paid',...saved};
 }
 async function settings(r){try{const b=await input(r,['salon_id','deposit_percent']);if(!configured())return reply(r,503,{ok:false,available:false,message:'Stripe deposits are not activated yet.'});const actor=await owner(r,b.salon_id);await platform();let data=await worker('owner_status',actor);if(data.account_id){let ready=false;try{await merchant(data.account_id);ready=true;}catch{}data=await worker('owner_verify',{...actor,account_id:data.account_id,ready});}if(b.deposit_percent!==undefined){if(typeof b.deposit_percent!=='number'||!Number.isFinite(b.deposit_percent))throw fail(400,'Enter a valid deposit percentage.');if(b.deposit_percent>0&&!data.ready)throw fail(409,'Connect a payment-ready Stripe account first.');data=await worker('owner_save',{...actor,deposit_percent:b.deposit_percent});}return reply(r,200,{ok:true,salon_id:b.salon_id,ready:data.ready===true,connected:!!data.account_id,payments:data.payments,attention:data.attention||[]});}catch(e){return error(r,e);}}
 async function start(r){try{
  const b=await input(r,['slug','request_id','verifier','service_id','staff_id','date','time','name','email','phone','notes']);
  if(!configured())return reply(r,503,{ok:false,message:'Online deposits are not available yet. Contact the business.'});
  if(!SLUG.test(b.slug||'')||!UUID.test(b.request_id||'')||!HEX.test(b.verifier||'')||!['service_id','date','time','name','email'].every(k=>typeof b[k]==='string')||['staff_id','phone','notes'].some(k=>b[k]!==undefined&&typeof b[k]!=='string'))throw fail(400,'Check your booking details.');
  await platform();const quote=await worker('quote',{slug:b.slug});await merchant(quote.account_id);
  const forwarded=r.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const payload={...b,verifier_hash:hash(b.verifier),network_hash:createHmac('sha256',env.JOVABOOK_CUSTOMER_WORKER_TOKEN).update(forwarded).digest('hex')};delete payload.verifier;
  const h=await worker('begin',payload);if(!validHold(h)||h.account_id!==quote.account_id)throw Error('Checkout account changed.');
  if(h.stage==='paid'||h.provider_id||now()>Date.parse(h.created_at)+4*60000)return reply(r,200,{...(await reconcile(h)),id:h.id});
  const returnUrl=BASE+'/?salon='+encodeURIComponent(b.slug)+'#book/deposit';
  const s=await stripe().checkout.sessions.create({mode:'payment',client_reference_id:h.id,customer_email:h.email,
   line_items:[{price_data:{currency:h.currency,unit_amount:h.amount,product_data:{name:'Deposit: '+h.service_name,description:h.date+' at '+h.time}},quantity:1}],
   metadata:metadata(h),payment_intent_data:{metadata:metadata(h)},expires_at:Math.floor(Date.parse(h.expires_at)/1000),success_url:returnUrl,cancel_url:returnUrl,
   custom_text:{submit:{message:'Your booking is confirmed after payment. Online cancellation is available until 24 hours before the booking. Eligible cancellations receive a deposit refund.'}}
  },{stripeAccount:h.account_id,idempotencyKey:'jovabook-deposit-'+h.id});
  if(!sessionMatches(s,h)||s.status!=='open'||!checkoutUrl(s.url))throw Error('Invalid hosted checkout.');
  await worker('attach',{id:h.id,account_id:h.account_id,provider_id:s.id,url:checkoutUrl(s.url)});
  return reply(r,200,{ok:true,stage:'pending',id:h.id,url:checkoutUrl(s.url)});
 }catch(e){return error(r,e);}}
 async function status(r){try{const b=await input(r,['id','verifier','cancel']);if(!UUID.test(b.id||'')||!HEX.test(b.verifier||'')||b.cancel!==undefined&&typeof b.cancel!=='boolean')throw fail(400,'Return to the original booking page.');if(!configured())throw fail(503,'Payments are temporarily unavailable.');await platform();let h=await worker('status',{id:b.id,verifier_hash:hash(b.verifier)});if(!validHold(h))throw Error('Invalid checkout.');if(b.cancel&&['creating','open'].includes(h.stage)){const session=await readSession(h);if(session?.status==='open'&&session.payment_status!=='paid'){try{await stripe().checkout.sessions.expire(session.id,{}, {stripeAccount:h.account_id});}catch{/* A payment may have completed concurrently. Reconcile its current state. */}if(!h.provider_id){await worker('attach',{id:h.id,account_id:h.account_id,provider_id:session.id,url:checkoutUrl(session.url)});h={...h,provider_id:session.id};}}}return reply(r,200,{...(await reconcile(h)),id:h.id});}catch(e){return error(r,e);}}
 async function webhook(r){try{if(!configured()||!/^whsec_[A-Za-z0-9]+$/.test(env.JOVABOOK_DEPOSIT_WEBHOOK_SECRET||''))throw Error('Not configured.');const signature=r.headers.get('stripe-signature');if(!signature)throw fail(400,'Missing signature.');let e;try{e=stripe().webhooks.constructEvent(await raw(r,262144),signature,env.JOVABOOK_DEPOSIT_WEBHOOK_SECRET);}catch{throw fail(400,'Invalid signature.');}if(e.livemode!==live()||!id(e.account,'acct'))throw fail(400,'Invalid account event.');if(!['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(e.type))return reply(r,200,{received:true});const s=e.data?.object;if(s?.metadata?.app!=='jovabook-deposit')return reply(r,200,{received:true});if(!UUID.test(s.metadata.checkout_id||''))throw fail(400,'Invalid event.');await platform();const h=await worker('context',{id:s.metadata.checkout_id});if(!validHold(h)||h.account_id!==e.account||!sessionMatches(s,h))throw fail(400,'Invalid checkout binding.');if(!h.provider_id)await worker('attach',{id:h.id,account_id:h.account_id,provider_id:s.id,url:checkoutUrl(s.url)});await reconcile({...h,provider_id:s.id});return reply(r,200,{received:true});}catch(e){return error(r,e);}}
 async function reconcileWorker(r){try{const key=env.JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN;if(!HEX.test(key||'')||!same(r.headers.get('authorization'),'Bearer '+key))throw fail(401,'Unauthorized.');if(!configured())throw Error('Not configured.');await platform();const jobs=await worker('reconcile');if(!Array.isArray(jobs)||jobs.length>10)throw Error('Invalid reconciliation list.');let processed=0;for(const job of jobs){try{const h=await worker('context',{id:job.id});await reconcile(h);processed++;}catch{/* Retry durably on the next worker pass, never release an uncertain payment. */}}return reply(r,200,{ok:true,processed,pending:jobs.length-processed});}catch(e){return error(r,e);}}
 async function options(r){try{origin(r);return new Response(null,{status:204,headers:headers(r)});}catch(e){return error(r,e);}}
 return {settings,start,status,webhook,reconcileWorker,options};
}
