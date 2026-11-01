import Stripe from 'stripe';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createMonthlyCommission} from './jovabook-monthly-commission.mjs';
import {SUBSCRIPTION_PLANS as CATALOG,catalogConfigured,monthlyCatalogConfigured,subscriptionPrice,subscriptionForPrice,validateSubscriptionPrice,validCadence} from './jovabook-subscription-catalog.mjs';
const RETURN='https://book.jovamedia.com/#billing';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const objectId=v=>typeof v==='string'?v:v?.id;
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);};
async function rawBody(request,max=65536){const reader=request.body?.getReader();if(!reader)return '';const chunks=[];let n=0;for(;;){const x=await reader.read();if(x.done)break;n+=x.value.length;if(n>max){await reader.cancel();throw Error('Request too large.');}chunks.push(x.value);}return Buffer.concat(chunks).toString('utf8');}
const approvedUrl=(value,hosts)=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}};
export function createJovaBookBillingHandlers({env=process.env,send=fetch,stripe:injected,now=Date.now}={}){
 let instance=injected;const stripe=()=>instance||(instance=new Stripe(env.JOVABOOK_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:0}));
 const monthly=createMonthlyCommission({env,send,stripe,now});
 const configured=()=>env.JOVABOOK_BILLING_ENABLED==='true'&&env.JOVABOOK_BILLING_APPROVED==='true'&&!!env.JOVABOOK_STRIPE_SECRET_KEY&&/^acct_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_ACCOUNT_ID||'')&&['test','live'].includes(env.JOVABOOK_STRIPE_MODE)&&/^[0-9a-f]{64}$/.test(env.JOVABOOK_BILLING_WORKER_TOKEN||'')&&monthlyCatalogConfigured(env);
 let merchantProof;
 async function merchant(fresh=false){const identity=hash([env.JOVABOOK_STRIPE_SECRET_KEY,env.JOVABOOK_STRIPE_ACCOUNT_ID]);if(!fresh&&merchantProof?.identity===identity&&merchantProof.until>now())return;const account=await stripe().accounts.retrieveCurrent();if(account?.id!==env.JOVABOOK_STRIPE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('The expected merchant is not ready to collect payment.');merchantProof={identity,until:now()+60000};}
 async function api(path,body,token){const url=new URL(path,env.JOVABOOK_SUPABASE_URL);if(url.protocol!=='https:')throw Error('Invalid account server.');const r=await send(url.href,{method:path==='/auth/v1/user'?'GET':'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});let data;try{data=await r.json();}catch{}if(!r.ok)throw Object.assign(Error('Your account could not be verified.'),{status:r.status===401?401:503});return data;}
 const worker=(action,payload={})=>api('/rest/v1/rpc/booking_billing_worker',{p_token:action.startsWith('lifecycle_')?env.JOVABOOK_LIFECYCLE_WORKER_TOKEN:env.JOVABOOK_BILLING_WORKER_TOKEN,p_action:action,p_payload:payload});
 async function owner(request,body,{allowNoBusiness=false}={}){const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!token)throw Object.assign(Error('Log in to manage your subscription.'),{status:401});const user=await api('/auth/v1/user',undefined,token);if(!uuid(user?.id))throw Object.assign(Error('Your account could not be verified.'),{status:401});const access=await api('/rest/v1/rpc/owner_account_access',{},token);if(allowNoBusiness&&access?.no_business===true&&access.access==='no_business'&&access.business===null&&body.salon_id==null)return {user,access,token,salon:null};if(!uuid(access?.business?.id)||body.salon_id!=null&&body.salon_id!==access.business.id)throw Object.assign(Error('Your business changed. Refresh Subscription.'),{status:403});return {user,access,token,salon:access.business.id};}
 async function input(request,keys){if(request.method!=='POST')throw Object.assign(Error('POST only.'),{status:405});let b;try{b=JSON.parse(await rawBody(request,8192)||'{}');}catch{throw Object.assign(Error('Invalid request.'),{status:400});}if(!b||Array.isArray(b)||typeof b!=='object'||Object.keys(b).some(k=>!keys.includes(k)))throw Object.assign(Error('Invalid request.'),{status:400});return b;}
 const unavailable=()=>reply(503,{ok:false,billing_unavailable:true,message:'Billing is not connected yet. Your existing plan-change request is still available.'});
 const error=e=>reply(e.status||503,{ok:false,message:e.status&&e.status<500?e.message:'Billing could not be verified. Your access has not been changed.'});
 async function catalog(plan,cadence='monthly'){const approved=subscriptionPrice(env,plan,cadence);return validateSubscriptionPrice(await stripe().prices.retrieve(approved.id),approved,env.JOVABOOK_STRIPE_MODE);}
 async function annualReady(salon,supported){if(!catalogConfigured(env)||!supported||env.JOVABOOK_COMMISSION_SUPERVISOR_ENABLED!=='true'||!/^[0-9a-f]{64}$/.test(env.JOVABOOK_COMMISSION_HTTP_TOKEN||'')||env.JOVABOOK_COMMISSION_HTTP_TOKEN===env.JOVABOOK_COMMISSION_WORKER_TOKEN||!monthly.enabled()||env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED!=='true'||env.JOVABOOK_ANNUAL_COMMISSION_INVOICING_ENABLED!=='true')return false;const summary=await monthly.summary(salon);if(summary.annual_billing_ready!==true||summary.supervisor_ready!==true)return false;const context=await worker('context',{salon});if(context?.enabled!==true||context.annual_supported!==true||context.deletion_state)return false;for(const plan of Object.keys(CATALOG))for(const cadence of ['monthly','annual'])await catalog(plan,cadence);return true;}
 async function monthlyReady(salon){
  if(!monthly.enabled()||env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED!=='true'||env.JOVABOOK_COMMISSION_SUPERVISOR_ENABLED!=='true'||!/^[0-9a-f]{64}$/.test(env.JOVABOOK_COMMISSION_HTTP_TOKEN||'')||env.JOVABOOK_COMMISSION_HTTP_TOKEN===env.JOVABOOK_COMMISSION_WORKER_TOKEN)return false;
  const summary=await monthly.summary(salon);return summary.available===true&&summary.billing_ready===true;
 }
 async function status(request){try{const b=await input(request,['salon_id']);const {access,salon}=await owner(request,b,{allowNoBusiness:true});const connected=configured()&&access.billing?.connected===true;if(connected)await merchant();const {billing_ready:billingReady,annual_billing_ready:annualBillingReady,...commission}=await monthly.summary(salon);let annualSupported=false;try{annualSupported=connected&&await annualReady(salon,access.billing?.annual_schema_supported===true);}catch{}return reply(200,{...access,billing:{...access.billing,connected,canCheckout:connected&&access.access!=='deleting',annual_supported:annualSupported,commission_summary:commission,commission_terms_version:monthly.termsVersion,annual_commission_terms_version:annualSupported?monthly.annualTermsVersion:null,monthly_commission_ready:commission.available===true&&billingReady===true&&env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED==='true'}});}catch(e){return error(e);}}
 async function checkout(request){try{
  const b=await input(request,['salon_id','plan','cadence','request_id','terms_version']);b.cadence??='monthly';const context=await owner(request,b);if(!configured())return unavailable();if(!uuid(b.request_id)||!CATALOG[b.plan]||!validCadence(b.cadence))throw Object.assign(Error('Choose a plan, billing frequency and start a fresh billing request.'),{status:400});if(context.access.access==='deleting')throw Object.assign(Error('This account needs billing reconciliation. Contact support.'),{status:409});
  const termsVersion=monthly.enabled()?monthly.termsVersionFor(b.cadence):null;if(termsVersion&&b.terms_version!==termsVersion)throw Object.assign(Error('Review the subscription and appointment commission before continuing.'),{status:400});
  const data=await worker('context',{owner:context.user.id,salon:context.salon});if(!data?.enabled||b.cadence==='annual'&&!await annualReady(context.salon,data.annual_supported===true)) return unavailable();await merchant();
  if(data.subscription_id){const sub=await stripe().subscriptions.retrieve(data.subscription_id,{expand:['latest_invoice']});if(objectId(sub.customer)!==data.customer_id)throw Error('Subscription binding mismatch.');if(!['canceled','incomplete_expired'].includes(sub.status)){
   const debt=(await all(p=>stripe().invoices.list(p),{customer:data.customer_id,subscription:sub.id})).filter(inv=>objectId(inv.customer)===data.customer_id&&invoiceSubscription(inv)===sub.id&&['open','uncollectible'].includes(inv.status)&&inv.amount_remaining>0).sort((a,b)=>a.created-b.created);
   const invoice=debt[0]||(typeof sub.latest_invoice==='object'?sub.latest_invoice:null),url=invoice&&['open','uncollectible'].includes(invoice.status)&&approvedUrl(invoice.hosted_invoice_url,['invoice.stripe.com']);if(url)return reply(200,{ok:true,url,kind:'recovery'});throw Object.assign(Error('Use the verified plan-change flow for an existing subscription.'),{status:409});}}
  if(b.cadence==='monthly'&&b.plan!=='premium'&&!await monthlyReady(context.salon))return reply(503,{ok:false,billing_unavailable:true,message:'Monthly subscription and appointment commission billing are still being connected. No payment has been taken.'});
  if(data.open_action?.result){
   const prior=data.open_action;if(prior.kind!=='checkout'||prior.target!==b.plan||(prior.cadence||'monthly')!==b.cadence||!prior.provider_id)throw Object.assign(Error('Resolve the existing hosted billing request first.'),{status:409});
   if(termsVersion&&prior.commission_terms_version!==termsVersion)throw Object.assign(Error('The earlier hosted request needs reconciliation before the new billing terms can apply.'),{status:409});
   const session=await stripe().checkout.sessions.retrieve(prior.provider_id);if(!belongs(session,data))throw Error('Checkout ownership mismatch.');
   if(session.status==='open')return reply(200,prior.result);
   if(session.status==='expired')await worker('action_resolve',{salon:context.salon,id:prior.id,closed_verified:true});
   else {await reconcile(data);throw Object.assign(Error('Payment is being verified. Refresh Subscription.'),{status:409});}
  }
  const price=await catalog(b.plan,b.cadence),action=await worker('action_begin',{owner:context.user.id,salon:context.salon,request:b.request_id,kind:'checkout',target:b.plan,cadence:b.cadence,hash:hash({kind:'checkout',plan:b.plan,cadence:b.cadence,...(termsVersion?{terms_version:termsVersion}:{})})});if(termsVersion)await monthly.acceptTerms(context.salon,action.id,b.plan,termsVersion,b.cadence);if(action.result)return reply(200,action.result);if(now()-Date.parse(action.created_at)>23*3600000)throw Object.assign(Error('This billing request needs reconciliation before another can be created.'),{status:409});
  let customer=data.customer_id;if(!customer){const created=await stripe().customers.create({email:context.user.email,metadata:{app:'jovabook',salon_id:context.salon}},{idempotencyKey:'jovabook-customer-'+context.salon});customer=created.id;await worker('bind_customer',{salon:context.salon,owner:context.user.id,customer});}
  const reviewed=subscriptionPrice(env,b.plan,b.cadence),base=`${b.plan[0].toUpperCase()+b.plan.slice(1)} is £${reviewed.amount/100} per ${b.cadence==='annual'?'year, paid upfront with a 20% subscription discount':'month'}`;
  const disclosure=b.plan==='premium'?base+' with 0% appointment commission.':base+' plus 1% of the full service price when an appointment takes place. Commission is billed monthly on your subscription anniversary day, separately from an annual subscription. Unbilled fees carry forward until paid. Cancelled, no-show and free-trial appointments are excluded. Stripe processing fees are separate.';
  const session=await stripe().checkout.sessions.create({mode:'subscription',customer,line_items:[{price:price.id,quantity:1}],payment_method_types:['card'],client_reference_id:context.salon,metadata:{app:'jovabook',salon_id:context.salon,action_id:action.id,...(termsVersion?{billing_terms_version:termsVersion}:{})},subscription_data:{metadata:{app:'jovabook',salon_id:context.salon}},...(termsVersion?{custom_text:{submit:{message:disclosure}}}:{}),success_url:RETURN,cancel_url:RETURN},{idempotencyKey:'jovabook-checkout-'+action.id});
  const url=approvedUrl(session.url,['checkout.stripe.com']);if(!url)throw Error('Invalid hosted Checkout URL.');const result={ok:true,url,kind:'checkout'};await worker('action_finish',{salon:context.salon,id:action.id,result,provider_id:session.id});return reply(200,result);
 }catch(e){return error(e);}}
 // Bound pagination deliberately stops rather than silently ignoring old payable
 // objects. Large or unexpected provider accounts require manual reconciliation.
 async function all(list,params){let after;const values=[];for(let i=0;i<10;i++){const page=await list({...params,limit:100,...(after?{starting_after:after}:{})});if(!Array.isArray(page.data))throw Error('Invalid provider list.');values.push(...page.data);if(!page.has_more)return values;after=page.data.at(-1)?.id;if(!after)throw Error('Invalid provider cursor.');}throw Error('Provider reconciliation exceeds its safe bound.');}
 const belongs=(value,data)=>objectId(value.customer)===data.customer_id&&value.metadata?.app==='jovabook'&&value.metadata?.salon_id===data.salon_id;
 const invoiceSubscription=value=>objectId(value.parent?.subscription_details?.subscription||value.subscription);
 const linePrice=line=>objectId(line.pricing?.price_details?.price||line.price);
 const pricePlan=id=>subscriptionForPrice(env,id)?.plan;
 async function subscription(data){
  if(!data.customer_id)return null;
  const values=await all(p=>stripe().subscriptions.list(p),{customer:data.customer_id,status:'all'});
  const ours=values.filter(x=>belongs(x,data)),running=ours.filter(x=>!['canceled','incomplete_expired'].includes(x.status));
  if(running.length>1)throw Error('Multiple subscriptions require reconciliation.');
  const candidate=running[0]||ours.find(x=>x.id===data.subscription_id);
  if(!candidate){if(data.subscription_id)throw Error('The bound subscription was not found.');return null;}
  const value=await stripe().subscriptions.retrieve(candidate.id,{expand:['latest_invoice','items.data.price']});
  if(!belongs(value,data)||value.livemode!==(env.JOVABOOK_STRIPE_MODE==='live'))throw Error('Subscription ownership mismatch.');
  return value;
 }
 async function canonical(data,sub){
  if(!sub)return {customer:data.customer_id,status:'none',paid_verified:false};
  const items=sub.items?.data;
  if(items?.length!==1||items[0].quantity!==1)throw Error('Unexpected subscription items.');
  const item=items[0],approved=subscriptionForPrice(env,objectId(item.price)),plan=approved?.plan,cadence=approved?.cadence;
  if(!plan)throw Error('Unknown subscription price.');await catalog(plan,cadence);
  const end=item.current_period_end||sub.current_period_end;
  if(!Number.isSafeInteger(end))throw Error('Missing subscription period.');
  const invoices=await all(p=>stripe().invoices.list(p),{customer:data.customer_id,subscription:sub.id});
  const outstanding=invoices.filter(inv=>objectId(inv.customer)===data.customer_id&&invoiceSubscription(inv)===sub.id&&['open','uncollectible'].includes(inv.status)&&inv.billing_reason==='subscription_cycle'&&inv.attempted===true&&inv.amount_remaining>0).sort((a,b)=>a.created-b.created);
  const recurringFailed=outstanding.length>0;
  let paid=false,historical=null;const verifiedPlans=new Set([objectId(item.price)]);
  for(const inv of invoices){
   const balancePaid=inv.amount_due===0&&inv.amount_remaining===0&&inv.starting_balance<0;
   if(inv.status!=='paid'||!(inv.amount_paid>0||balancePaid)||inv.currency!=='gbp'||objectId(inv.customer)!==data.customer_id||invoiceSubscription(inv)!==sub.id)continue;
   const lines=await all(p=>stripe().invoices.listLineItems(inv.id,p),{});
   for(const line of lines){const prior=subscriptionForPrice(env,linePrice(line));if(!prior||line.amount<=0||line.quantity!==1||!Number.isSafeInteger(line.period?.end))continue;
    if(!verifiedPlans.has(prior.id)){await catalog(prior.plan,prior.cadence);verifiedPlans.add(prior.id);}
    if(!historical||historical.end<line.period.end)historical={plan:prior.plan,cadence:prior.cadence,end:line.period.end};
    if(linePrice(line)===objectId(item.price)&&line.period.end>=end)paid=true;
   }
  }
  paid=paid&&!recurringFailed&&!['past_due','unpaid','paused','incomplete','incomplete_expired'].includes(sub.status);
  const start=item.current_period_start||sub.current_period_start,anchor=sub.billing_cycle_anchor||start;
  if(cadence==='annual'&&(!Number.isSafeInteger(start)||!Number.isSafeInteger(anchor)||anchor>start||end<=start))throw Error('Missing annual subscription anniversary.');
  return {customer:data.customer_id,subscription:sub.id,status:sub.status,plan,cadence,subscription_period_start:Number.isSafeInteger(start)?new Date(start*1000).toISOString():null,subscription_period_end:new Date(end*1000).toISOString(),subscription_anchor:Number.isSafeInteger(anchor)?new Date(anchor*1000).toISOString():null,paid_verified:paid&&end*1000>now(),paid_until:new Date(end*1000).toISOString(),historical_paid:!!historical,historical_plan:historical?.plan||null,historical_cadence:historical?.cadence||null,historical_paid_until:historical?new Date(historical.end*1000).toISOString():null,cancel_at_period_end:sub.cancel_at_period_end===true,recurring_failed:recurringFailed,failed_at:recurringFailed&&outstanding[0].created?new Date(outstanding[0].created*1000).toISOString():null};
 }
 async function reconcile(data){
  const start=await worker('sync_begin',{salon:data.salon_id});if(!start)return {gone:true};
  const sub=await subscription(data),state=await canonical(data,sub);
  const result=await worker('sync_apply',{salon:data.salon_id,fence:start.fence,...state});
  if(result?.stale)throw Error('A newer payment reconciliation won.');return {sub,state,result};
 }
 async function webhook(request){
  try{
   if(request.method!=='POST')return reply(405,{ok:false});
   if(!configured()||!env.JOVABOOK_STRIPE_WEBHOOK_SECRET)return unavailable();
   let event;try{event=stripe().webhooks.constructEvent(await rawBody(request,262144),request.headers.get('stripe-signature'),env.JOVABOOK_STRIPE_WEBHOOK_SECRET,300);}catch{return reply(400,{ok:false,message:'Invalid billing signature.'});}
   if(event.livemode!==(env.JOVABOOK_STRIPE_MODE==='live'))return reply(400,{ok:false});
   await merchant();
   const relevant=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.created','invoice.finalized','invoice.voided','invoice.marked_uncollectible','invoice.paid','invoice.payment_failed','credit_note.created','credit_note.voided','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','subscription_schedule.completed','subscription_schedule.released','subscription_schedule.updated'];
   if(!relevant.includes(event.type))return reply(200,{ok:true,ignored:true});
   const first=await worker('event_begin',{id:event.id});if(first?.processed)return reply(200,{ok:true,duplicate:true});
   const customer=objectId(event.data?.object?.customer);if(!customer)return reply(400,{ok:false});
   const data=await worker('context',{customer});
   if(data){const checked=await reconcile(data);if(data.schedule_id){let schedule=await stripe().subscriptionSchedules.retrieve(data.schedule_id);if(objectId(schedule.customer)!==customer)throw Error('Schedule ownership mismatch.');
    // Once the lower price has actually been paid, its permanent paid-plan cap
    // replaces the temporary hold. Releasing preserves that subscription price.
    if(schedule.status==='active'&&checked.state?.paid_verified&&checked.state.plan===data.pending_target&&checked.state.cadence===(data.pending_cadence||'monthly')&&Date.parse(data.pending_effective_at)<=now()){await stripe().subscriptionSchedules.release(schedule.id,{preserve_cancel_date:false},{idempotencyKey:'jovabook-applied-release-'+schedule.id});schedule=await stripe().subscriptionSchedules.retrieve(schedule.id);}
    if(['released','completed','canceled'].includes(schedule.status))await worker('downgrade_release',{salon:data.salon_id,released_verified:true});}const commission=await monthly.event(event,data);if(commission?.collected)await reconcile(data);}
   await worker('event_finish',{id:event.id});return reply(200,{ok:true});
  }catch{return reply(503,{ok:false,message:'Billing will be reconciled before this event is acknowledged.'});}
 }
 async function change(request){try{
  const b=await input(request,['salon_id','plan','cadence','request_id','terms_version']);b.cadence??='monthly';const context=await owner(request,b);
  if(!configured())return unavailable();if(!uuid(b.request_id)||!CATALOG[b.plan]||!validCadence(b.cadence))throw Object.assign(Error('Choose a plan, billing frequency and a fresh request.'),{status:400});
  const termsVersion=monthly.enabled()?monthly.termsVersionFor(b.cadence):null;if(termsVersion&&b.terms_version!==termsVersion)throw Object.assign(Error('Review the subscription and appointment commission before continuing.'),{status:400});
  let data=await worker('context',{salon:context.salon,owner:context.user.id});if(!data?.enabled||data.deletion_state||b.cadence==='annual'&&!await annualReady(context.salon,data.annual_supported===true))return unavailable();await merchant();
  const existing=await worker('action_lookup',{salon:context.salon,request:b.request_id,target:b.plan,cadence:b.cadence});if(existing?.result){if(termsVersion&&existing.commission_terms_version!==termsVersion)throw Object.assign(Error('Start a fresh review for the current billing terms.'),{status:409});return reply(200,existing.result);}
  await reconcile(data);data=await worker('context',{salon:context.salon,owner:context.user.id});
  const sub=await subscription(data);if(!sub||sub.status!=='active'||!data.ever_paid||data.failed_at||!data.paid_until||Date.parse(data.paid_until)<=now())throw Object.assign(Error('Pay the current subscription before changing plan.'),{status:409});
  const prior=data.open_action,same=prior?.request_id===b.request_id&&prior?.target===b.plan&&(prior.cadence||'monthly')===b.cadence;
  if(same&&prior.result)return reply(200,prior.result);
  if(sub.pending_update||sub.cancel_at_period_end||!same&&(data.pending_target||sub.schedule||prior))throw Object.assign(Error('Cancel or resolve the existing scheduled change first.'),{status:409});
  const item=sub.items.data[0],approved=subscriptionForPrice(env,objectId(item.price)),current=approved?.plan,price=await catalog(b.plan,b.cadence);
  if(!approved)throw Error('Unknown current subscription price.');
  if(current===b.plan&&approved.cadence===b.cadence)throw Object.assign(Error('You already have this plan and billing frequency.'),{status:409});
  const cadenceChange=approved.cadence!==b.cadence,upgrading=!cadenceChange&&CATALOG[b.plan].limit>CATALOG[current].limit;
  // A dedicated hosted confirmation offers only this selected upgrade. Generic
  // portal navigation is never opened, so a downgrade cannot bypass roster checks.
  if(upgrading){
   if(!/^bpc_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_UPGRADE_PORTAL_CONFIG||''))return unavailable();
   const config=await stripe().billingPortal.configurations.retrieve(env.JOVABOOK_STRIPE_UPGRADE_PORTAL_CONFIG);
   if(!config.active||!config.features?.subscription_update?.enabled||config.features.subscription_update.proration_behavior!=='always_invoice')throw Error('Upgrade confirmation is not configured safely.');
   const action=await worker('action_begin',{salon:context.salon,owner:context.user.id,request:b.request_id,kind:'upgrade',target:b.plan,cadence:b.cadence,hash:hash({kind:'upgrade',plan:b.plan,cadence:b.cadence,...(termsVersion?{terms_version:termsVersion}:{})})});if(termsVersion)await monthly.acceptTerms(context.salon,action.id,b.plan,termsVersion,b.cadence);if(action.result)return reply(200,action.result);
   if(now()-Date.parse(action.created_at)>23*3600000)throw Object.assign(Error('The previous request needs reconciliation.'),{status:409});
   const session=await stripe().billingPortal.sessions.create({customer:data.customer_id,configuration:config.id,return_url:RETURN,flow_data:{type:'subscription_update_confirm',subscription_update_confirm:{subscription:sub.id,items:[{id:item.id,price:price.id,quantity:1}]},after_completion:{type:'redirect',redirect:{return_url:RETURN}}}},{idempotencyKey:'jovabook-upgrade-'+action.id});
   const url=approvedUrl(session.url,['billing.stripe.com']);if(!url)throw Error('Invalid upgrade confirmation URL.');const result={ok:true,kind:'upgrade',url};await worker('action_finish',{salon:context.salon,id:action.id,result,provider_id:session.id});return reply(200,result);
  }
  const kind=cadenceChange?'schedule':'downgrade',action=await worker('action_begin',{salon:context.salon,owner:context.user.id,request:b.request_id,kind,target:b.plan,cadence:b.cadence,hash:hash({kind,plan:b.plan,cadence:b.cadence,...(termsVersion?{terms_version:termsVersion}:{})})});if(termsVersion)await monthly.acceptTerms(context.salon,action.id,b.plan,termsVersion,b.cadence);if(action.result)return reply(200,action.result);
  await worker(cadenceChange?'schedule_hold':'downgrade_hold',{salon:context.salon,target:b.plan,cadence:b.cadence});
  // A timeout retains the restrictive local cap and pending action. Its stable
  // idempotency key is reused only within Stripe's retention window.
  if(now()-Date.parse(action.created_at)>23*3600000)throw Object.assign(Error('The scheduled change needs reconciliation.'),{status:409});
  const made=sub.schedule?await stripe().subscriptionSchedules.retrieve(objectId(sub.schedule)):await stripe().subscriptionSchedules.create({from_subscription:sub.id},{idempotencyKey:'jovabook-schedule-'+action.id});
  if(objectId(made.customer)!==data.customer_id||objectId(made.subscription)!==sub.id||!made.current_phase)throw Error('Schedule binding mismatch.');
  const end=item.current_period_end||sub.current_period_end;
  await worker('downgrade_schedule',{salon:context.salon,schedule:made.id,effective_at:new Date(end*1000).toISOString()});
  const scheduled=await stripe().subscriptionSchedules.update(made.id,{end_behavior:'release',proration_behavior:'none',metadata:{app:'jovabook',salon_id:context.salon},phases:[{start_date:made.current_phase.start_date,end_date:end,items:[{price:objectId(item.price),quantity:1}],proration_behavior:'none'},{start_date:end,items:[{price:price.id,quantity:1}],duration:{interval:b.cadence==='annual'?'year':'month',interval_count:1},proration_behavior:'none'}]},{idempotencyKey:'jovabook-schedule-phases-'+action.id});
  const next=scheduled.phases?.find(x=>x.start_date===end);
  if(objectId(scheduled.customer)!==data.customer_id||objectId(next?.items?.[0]?.price)!==price.id)throw Error('Scheduled downgrade is unverified.');
  const result={ok:true,kind:'scheduled',plan:b.plan,cadence:b.cadence,change:cadenceChange?'billing_frequency':'downgrade',effective_at:new Date(end*1000).toISOString()};await worker('action_finish',{salon:context.salon,id:action.id,result,provider_id:made.id});return reply(200,result);
 }catch(e){return error(e);}}
 async function cancelChange(request){try{
  const b=await input(request,['salon_id','request_id']),context=await owner(request,b);if(!configured())return unavailable();if(!uuid(b.request_id))throw Object.assign(Error('Start a fresh cancellation request.'),{status:400});await merchant();
  const data=await worker('context',{salon:context.salon,owner:context.user.id});if(!data?.pending_target||!data.schedule_id)throw Object.assign(Error('There is no verified scheduled downgrade to cancel.'),{status:409});
  const schedule=await stripe().subscriptionSchedules.retrieve(data.schedule_id);
  if(objectId(schedule.customer)!==data.customer_id||objectId(schedule.subscription||schedule.released_subscription)!==data.subscription_id)throw Error('Schedule ownership mismatch.');
  if(!['released','completed','canceled'].includes(schedule.status))await stripe().subscriptionSchedules.release(schedule.id,{preserve_cancel_date:false},{idempotencyKey:'jovabook-release-'+schedule.id});
  const verified=await stripe().subscriptionSchedules.retrieve(schedule.id);
  if(!['released','completed','canceled'].includes(verified.status))throw Error('Schedule release is unverified.');
  await reconcile(data);await worker('downgrade_release',{salon:context.salon,released_verified:true});if(['downgrade','schedule'].includes(data.open_action?.kind))await worker('action_resolve',{salon:context.salon,id:data.open_action.id,closed_verified:true});return reply(200,{ok:true,kind:'schedule_cancelled'});
 }catch(e){return error(e);}}
 async function cancel(request){try{
  const b=await input(request,['salon_id','request_id']),context=await owner(request,b);if(!configured())return unavailable();if(!uuid(b.request_id))throw Object.assign(Error('Start a fresh cancellation request.'),{status:400});await merchant();
  const data=await worker('context',{salon:context.salon,owner:context.user.id});if(data.pending_target||data.schedule_id)throw Object.assign(Error('Cancel the scheduled downgrade first.'),{status:409});const sub=await subscription(data);if(!sub||sub.pending_update)throw Object.assign(Error('Resolve the current billing change first.'),{status:409});
  const action=await worker('action_begin',{salon:context.salon,request:b.request_id,kind:'cancel',hash:hash({kind:'cancel'})});if(action.result)return reply(200,action.result);
  await stripe().subscriptions.update(sub.id,{cancel_at_period_end:true},{idempotencyKey:'jovabook-cancel-'+action.id});
  const verified=await stripe().subscriptions.retrieve(sub.id);if(!verified.cancel_at_period_end||!belongs(verified,data))throw Error('Cancellation is unverified.');
  await reconcile(data);const refreshed=await worker('context',{salon:context.salon,owner:context.user.id});if(!refreshed?.paid_until)throw Error('Paid access end is unverified.');const result={ok:true,kind:'cancellation_scheduled',effective_at:refreshed.paid_until};await worker('action_finish',{salon:context.salon,id:action.id,result});return reply(200,result);
 }catch(e){return error(e);}}
 async function expireCheckout(data,id){
  let session=await stripe().checkout.sessions.retrieve(id);
  if(!belongs(session,data)||session.mode!=='subscription')throw Error('Unverified hosted Checkout ownership.');
  if(session.status==='open'){
   if(session.payment_status==='paid')throw Error('A payment must be reconciled first.');
   await stripe().checkout.sessions.expire(id);session=await stripe().checkout.sessions.retrieve(id);
  }
  if(session.status!=='expired'&&session.status!=='complete')throw Error('Hosted Checkout is not closed.');
  return session;
 }
 async function providerClosed(data){
  if(!data.customer_id)return true;
  const sessions=await all(p=>stripe().checkout.sessions.list(p),{customer:data.customer_id});
  for(const session of sessions){if(!belongs(session,data))throw Error('Unscoped Checkout requires review.');await expireCheckout(data,session.id);}
  const subscriptions=await all(p=>stripe().subscriptions.list(p),{customer:data.customer_id,status:'all'});
  if(subscriptions.some(x=>!belongs(x,data)))throw Error('Unscoped subscription requires review.');
  const ids=new Set(subscriptions.map(x=>x.id));
  for(const sub of subscriptions){
   if(sub.schedule){const schedule=await stripe().subscriptionSchedules.retrieve(objectId(sub.schedule));if(objectId(schedule.customer)!==data.customer_id||objectId(schedule.subscription)!==sub.id)throw Error('Unscoped schedule.');if(!['released','completed','canceled'].includes(schedule.status))await stripe().subscriptionSchedules.release(schedule.id,{preserve_cancel_date:false},{idempotencyKey:'jovabook-purge-release-'+schedule.id});}
   if(!['canceled','incomplete_expired'].includes(sub.status))await stripe().subscriptions.cancel(sub.id,{invoice_now:false,prorate:false},{idempotencyKey:'jovabook-purge-cancel-'+sub.id});
  }
  // Canceling a subscription alone does not close already-issued invoices or
  // pending invoice items. Only this dedicated customer's verified objects count.
  const pending=await all(p=>stripe().invoiceItems.list(p),{customer:data.customer_id,pending:true});
  for(const item of pending){if(objectId(item.customer)!==data.customer_id||!(ids.has(objectId(item.subscription))||item.metadata?.app==='jovabook'&&item.metadata?.salon_id===data.salon_id))throw Error('Unscoped invoice item.');await stripe().invoiceItems.del(item.id);}
  const invoices=await all(p=>stripe().invoices.list(p),{customer:data.customer_id});
  for(const invoice of invoices){
   if(objectId(invoice.customer)!==data.customer_id||!ids.has(invoiceSubscription(invoice)))throw Error('Unscoped invoice requires review.');
   const payments=await all(p=>stripe().invoicePayments.list(p),{invoice:invoice.id});
   for(const payment of payments){
    if(payment.payment?.type!=='payment_intent'||!objectId(payment.payment.payment_intent))throw Error('Unknown payment type requires review.');
    let intent=await stripe().paymentIntents.retrieve(objectId(payment.payment.payment_intent));
    if(objectId(intent.customer)!==data.customer_id)throw Error('Payment ownership mismatch.');
    if(['processing','requires_capture','succeeded'].includes(intent.status)&&payment.status!=='paid')throw Error('An in-flight payment blocks deletion.');
    if(!['succeeded','canceled'].includes(intent.status)){
     if(!['requires_payment_method','requires_confirmation','requires_action'].includes(intent.status))throw Error('Unknown payment state blocks deletion.');
     await stripe().paymentIntents.cancel(intent.id,{}, {idempotencyKey:'jovabook-purge-intent-'+intent.id});intent=await stripe().paymentIntents.retrieve(intent.id);
     if(intent.status!=='canceled')throw Error('Payment cancellation is unverified.');
    }
   }
   const current=await stripe().invoices.retrieve(invoice.id);
   if(['open','uncollectible'].includes(current.status))await stripe().invoices.voidInvoice(current.id,{}, {idempotencyKey:'jovabook-purge-void-'+current.id});
   else if(current.status==='draft')await stripe().invoices.del(current.id);
   else if(!['paid','void'].includes(current.status))throw Error('Unknown invoice state.');
  }
  const remaining=await all(p=>stripe().subscriptions.list(p),{customer:data.customer_id,status:'all'});
  if(remaining.some(x=>!belongs(x,data)||!['canceled','incomplete_expired'].includes(x.status)))throw Error('Future subscription charging is not closed.');
  const payable=await all(p=>stripe().invoices.list(p),{customer:data.customer_id});
  if(payable.some(x=>!ids.has(invoiceSubscription(x))||!['paid','void'].includes(x.status)))throw Error('An invoice can still charge.');
  const open=await all(p=>stripe().checkout.sessions.list(p),{customer:data.customer_id});
  if(open.some(x=>!belongs(x,data)||x.status==='open'))throw Error('Checkout is still open.');
  return true;
 }
 async function cleanup(){
  const manifests=await worker('lifecycle_cleanup_manifest');
  if(!manifests.length)return {pending:0};
  const key=env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY;if(!key)return {pending:manifests.length};
  let pending=manifests.length;
  for(const manifest of manifests){
   if(!uuid(manifest.salon_id)||!uuid(manifest.id)||!Array.isArray(manifest.assets))throw Error('Invalid cleanup manifest.');
   const names=[];
   for(const asset of manifest.assets){if(asset.bucket!=='jovabook-website-images'||!new RegExp('^'+manifest.salon_id+'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$').test(asset.name))throw Error('Unscoped cleanup asset.');names.push(asset.name);}
   if(names.length){const url=new URL('/storage/v1/object/jovabook-website-images',env.JOVABOOK_SUPABASE_URL);if(url.protocol!=='https:')throw Error('Invalid Storage origin.');const response=await send(url.href,{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:names}),signal:AbortSignal.timeout(10000)});if(!response.ok)continue;}
   await worker('lifecycle_cleanup_done',{id:manifest.id});pending--;
  }
  return {pending};
 }
 async function lifecycle(request){let claim;try{
  const b=await input(request,['mode','salon_id']);
  if(!/^[0-9a-f]{64}$/.test(env.JOVABOOK_LIFECYCLE_AUTH_TOKEN||'')||!equal(request.headers.get('authorization'), 'Bearer '+env.JOVABOOK_LIFECYCLE_AUTH_TOKEN))return reply(401,{ok:false});
  const mode=b.mode||'dry_run';if(!['dry_run','execute','cleanup'].includes(mode))return reply(400,{ok:false});
  const report=await worker('lifecycle_dryrun');
  if(mode==='dry_run')return reply(200,{ok:true,dry_run:true,candidates:report});
  if(mode==='cleanup'){if(!env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY)return reply(503,{ok:false,message:'Asset cleanup is not configured.'});return reply(200,{ok:true,cleanup:await cleanup()});}
  if(!configured()||env.JOVABOOK_LIFECYCLE_ENABLED!=='true'||!env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY)return reply(503,{ok:false,message:'Deletion is disabled.'});
  await merchant(true);
  if(!uuid(b.salon_id))return reply(400,{ok:false,message:'Choose one exact business from the dry run.'});
  const candidate=report.find(x=>x.salon_id===b.salon_id);if(!candidate?.provider_ready||!candidate.deletion_enabled)return reply(409,{ok:false,message:'This business is not eligible for deletion.'});
  let data=await worker('context',{salon:b.salon_id});if(!data)return reply(200,{ok:true,already_absent:true});
  if(data.customer_id){await reconcile(data);data=await worker('context',{salon:b.salon_id});}
  if(data.open_action){
   const action=data.open_action;if(action.kind!=='checkout'||!action.provider_id)throw Error('An unresolved provider action blocks deletion.');
   const closed=await expireCheckout(data,action.provider_id);if(closed.status==='complete'){await reconcile(data);throw Error('Completed Checkout must be reconciled before deletion.');}
   await worker('action_resolve',{salon:b.salon_id,id:action.id,closed_verified:true});
  }
  claim=await worker('lifecycle_claim',{salon:b.salon_id});if(!claim)return reply(409,{ok:false,message:'Access or billing changed. Nothing was deleted.'});
  await providerClosed({...claim,salon_id:b.salon_id});
  // Reconcile after all charge sources are closed, then let the database lock
  // choose between the verified payment restoration and exact tenant purge.
  if(claim.customer_id){const checked=await reconcile({...claim,salon_id:b.salon_id});if(checked.state?.paid_verified)return reply(200,{ok:true,restored:true});}
  await merchant(true);
  await worker('lifecycle_provider_closed',{salon:b.salon_id,lease:claim.lease,closed_verified:true});
  const result=await worker('lifecycle_purge',{salon:b.salon_id,lease:claim.lease});
  if(!result?.purged)return reply(409,{ok:false,message:'Payment or account state changed. Nothing was deleted.'});
  return reply(200,{ok:true,purged:true,salon_id:b.salon_id,auth_retained:result.auth_retained,cleanup:await cleanup()});
 }catch{if(claim?.lease)try{await worker('lifecycle_abort',{salon:claim.salon_id,lease:claim.lease});}catch{/* An unknown database outcome must be inspected before another attempt. */}return reply(503,{ok:false,message:'Deletion stopped for reconciliation. No blind retry or cross-business cleanup is permitted.'});}}
 return {status,checkout,webhook,change,cancelChange,cancel,lifecycle,worker,owner,input,error,configured,stripe,catalog,reconcile};
}
