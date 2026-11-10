import {createHash} from 'node:crypto';
import {OFFER_VERSION,PAID_TRIAL_DAYS,offerSelection} from './jovabook-offer.mjs';
import {MESSAGE_PACKS} from './jovabook-message-packs.mjs';
import {offerPrice,offerPriceForId,offerCatalogConfigured,validateOfferPrice} from './jovabook-offer-catalog.mjs';
import {accessDiagnostic} from './jovabook-access-diagnostics.mjs';
const RETURN='https://book.jovamedia.com/#billing';
const objectId=value=>typeof value==='string'?value:value?.id;
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail=(status,message)=>Object.assign(Error(message),{status});
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
function hosted(value,host){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname===host&&!url.port&&!url.username&&!url.password?url.href:null;}catch{return null;}}

/** All entitlements come from verified Stripe objects, never client selection. */
export function createOfferBillingHandlers({env,api,stripe,owner,input,error,rawBody,funnel,observeFunnel=()=>{},now=Date.now,accessLog=()=>{}}){
 const configured=()=>env.JOVABOOK_OFFER_VERSION===OFFER_VERSION&&env.JOVABOOK_BILLING_ENABLED==='true'&&env.JOVABOOK_BILLING_APPROVED==='true'&&!!env.JOVABOOK_STRIPE_SECRET_KEY&&/^acct_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_ACCOUNT_ID||'')&&['live','test'].includes(env.JOVABOOK_STRIPE_MODE)&&/^[a-f0-9]{64}$/.test(env.JOVABOOK_BILLING_WORKER_TOKEN||'')&&offerCatalogConfigured(env);
 const worker=(action,payload={})=>api('/rest/v1/rpc/booking_offer_worker',{p_token:env.JOVABOOK_BILLING_WORKER_TOKEN,p_action:action,p_payload:payload});
 const unavailable=()=>reply(503,{ok:false,billing_unavailable:true,message:'Paid plans are being connected. Your Free workspace remains available.'});
 async function merchant(){const account=await stripe().accounts.retrieveCurrent();if(account.id!==env.JOVABOOK_STRIPE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('Unexpected or unavailable billing merchant.');}
 async function catalog(plan,cadence){const approved=offerPrice(env,plan,cadence);return validateOfferPrice(await stripe().prices.retrieve(approved.id,{expand:['tiers']}),approved,env.JOVABOOK_STRIPE_MODE);}
 async function all(list,params){let cursor;const result=[];for(let page=0;page<10;page++){const value=await list({...params,limit:100,...(cursor?{starting_after:cursor}:{})});if(!Array.isArray(value.data))throw Error('Invalid provider history.');result.push(...value.data);if(!value.has_more)return result;cursor=value.data.at(-1)?.id;if(!cursor)break;}throw Error('Provider history requires reconciliation.');}
 const belongs=(value,data)=>objectId(value.customer)===data.customer_id&&value.metadata?.app==='jovabook'&&value.metadata?.offer_version===OFFER_VERSION&&value.metadata?.salon_id===data.salon_id;
 const selected=b=>offerSelection(b.plan,b.cadence||'monthly',(b.seats??1)-1);
 async function context(identity){const data=await worker('context',{salon:identity.salon,owner:identity.user.id});if(!data||data.salon_id!==identity.salon)throw fail(409,'Refresh your business details.');return data;}
 async function subscription(data){
  if(!data.customer_id)return null;
  const values=(await all(p=>stripe().subscriptions.list(p),{customer:data.customer_id,status:'all'})).filter(value=>belongs(value,data));
  const running=values.filter(value=>!['canceled','incomplete_expired'].includes(value.status));
  if(running.length>1)throw Error('Multiple subscriptions require review.');
  const found=running[0]||values.find(value=>value.id===data.subscription_id);if(!found)return null;
  const sub=await stripe().subscriptions.retrieve(found.id,{expand:['latest_invoice','items.data.price']});
  if(!belongs(sub,data)||sub.livemode!==(env.JOVABOOK_STRIPE_MODE==='live'))throw Error('Subscription ownership mismatch.');return sub;
 }
 async function canonical(data,sub){
  const empty={customer_id:data.customer_id,provider_status:sub?.status||'none',paid_verified:false,trial_verified:false};if(!sub)return empty;
  if(sub.items?.data?.length!==1)throw Error('Unexpected subscription items.');
  const item=sub.items.data[0],approved=offerPriceForId(env,objectId(item.price));if(!approved)throw Error('Unapproved subscription price.');
  const selection=offerSelection(approved.plan,approved.cadence,item.quantity-1);await catalog(approved.plan,approved.cadence);
  const start=item.current_period_start||sub.current_period_start,end=item.current_period_end||sub.current_period_end;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start)throw Error('Missing verified subscription period.');
  let trial=false;
  if(selection.seats===1&&sub.status==='trialing'&&sub.collection_method==='charge_automatically'&&!sub.pause_collection&&Number.isSafeInteger(sub.trial_start)&&Number.isSafeInteger(sub.trial_end)&&sub.trial_end-sub.trial_start===PAID_TRIAL_DAYS*86400&&sub.trial_start*1000<=now()&&sub.trial_end*1000>now()&&uuid(sub.metadata?.action_id)){
   const methodId=objectId(sub.default_payment_method);
   if(methodId){const method=await stripe().paymentMethods.retrieve(methodId);trial=method.id===methodId&&objectId(method.customer)===data.customer_id&&method.type==='card'&&!!method.card&&method.livemode===(env.JOVABOOK_STRIPE_MODE==='live');}
  }
  let paid=false,referralEvidence=null;
  const invoices=(['active','canceled'].includes(sub.status)&&end*1000>now()||data.referral&&!data.referral.invoice_id)?await all(p=>stripe().invoices.list(p),{customer:data.customer_id,subscription:sub.id}):[];
  if(data.referral&&!data.referral.invoice_id&&selection.cadence==='monthly'){
   for(const invoice of [...invoices].sort((a,b)=>a.created-b.created)){
    if(invoice.status!=='paid'||invoice.currency!=='gbp'||invoice.amount_paid<=0||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||objectId(invoice.customer)!==data.customer_id||objectId(invoice.parent?.subscription_details?.subscription||invoice.subscription)!==sub.id)continue;
    const lines=await all(p=>stripe().invoices.listLineItems(invoice.id,p),{});
    const line=lines.find(line=>objectId(line.pricing?.price_details?.price||line.price)===approved.id&&line.amount>0&&!line.proration&&!line.parent?.subscription_item_details?.proration&&Number.isSafeInteger(line.period?.start)&&Number.isSafeInteger(line.period?.end)&&line.period.end-line.period.start>=27*86400&&line.period.end-line.period.start<=32*86400);
    if(line){referralEvidence={invoice_id:invoice.id,subscription_id:sub.id,amount_paid:invoice.amount_paid,plan:selection.plan,cadence:'monthly',period_start:new Date(line.period.start*1000).toISOString(),period_end:new Date(line.period.end*1000).toISOString()};break;}
   }
  }
  if(['active','canceled'].includes(sub.status)&&end*1000>now()){
   const debt=invoices.some(inv=>['open','uncollectible'].includes(inv.status)&&inv.attempted===true&&inv.amount_remaining>0&&inv.billing_reason==='subscription_cycle');
   if(!debt)for(const invoice of invoices){
    const rewardZero=selection.cadence==='monthly'&&Array.isArray(data.referral_reward_invoices)&&data.referral_reward_invoices.includes(invoice.id)&&invoice.amount_due===0&&invoice.amount_remaining===0&&invoice.total===0&&invoice.total_discount_amounts?.reduce((sum,d)=>sum+d.amount,0)===(selection.plan==='premium'?2500:2000);
    if(invoice.status!=='paid'||invoice.currency!=='gbp'||objectId(invoice.customer)!==data.customer_id||objectId(invoice.parent?.subscription_details?.subscription||invoice.subscription)!==sub.id||!(invoice.amount_paid>0||invoice.amount_due===0&&invoice.amount_remaining===0&&invoice.starting_balance<0||rewardZero))continue;
    const lines=await all(p=>stripe().invoices.listLineItems(invoice.id,p),{});
    const matching=lines.filter(line=>objectId(line.pricing?.price_details?.price||line.price)===approved.id&&line.amount>=0&&Number.isSafeInteger(line.period?.end)&&line.period.end>=end&&(!rewardZero||line.period.start===start&&line.period.end===end&&!line.proration&&!line.parent?.subscription_item_details?.proration));
    if(matching.reduce((sum,line)=>sum+(Number.isSafeInteger(line.quantity)?line.quantity:0),0)>=selection.seats){paid=true;break;}
   }
  }
  return {...empty,subscription_id:sub.id,plan:selection.plan,seats:selection.seats,cadence:selection.cadence,paid_verified:paid,trial_verified:trial,
   period_start:new Date(start*1000).toISOString(),paid_until:new Date(end*1000).toISOString(),cancel_at_period_end:sub.cancel_at_period_end===true,
   trial_started_at:trial?new Date(sub.trial_start*1000).toISOString():null,trial_ends_at:trial?new Date(sub.trial_end*1000).toISOString():null,trial_action_id:trial?sub.metadata.action_id:null,referral_evidence:referralEvidence};
 }
 async function reconcile(data){const began=await worker('sync_begin',{salon:data.salon_id});if(!began)throw Error('Business unavailable.');const sub=await subscription(data),state=await canonical(data,sub),result=await worker('sync_apply',{salon:data.salon_id,fence:began.fence,...state});if(result?.stale)throw Object.assign(fail(409,'Billing details changed. Refresh your subscription.'),{code:'billing_sync_stale'});
  observeFunnel(()=>funnel.trial(data,state));
  if(data.schedule_id){
   let schedule=await stripe().subscriptionSchedules.retrieve(data.schedule_id);
   if(objectId(schedule.customer)!==data.customer_id||objectId(schedule.subscription||schedule.released_subscription)!==sub?.id)throw Error('Schedule ownership mismatch.');
   if(schedule.status==='active'&&state.paid_verified&&state.plan===data.pending_plan&&state.seats===data.pending_seats&&state.cadence===data.pending_cadence&&Date.parse(data.pending_at)<=now()){
    await stripe().subscriptionSchedules.release(schedule.id,{preserve_cancel_date:false},{idempotencyKey:'jovabook-offer-applied-'+schedule.id});schedule=await stripe().subscriptionSchedules.retrieve(schedule.id);
   }
   if(['released','completed','canceled'].includes(schedule.status))await worker('clear_schedule',{salon:data.salon_id,verified:true});
  }
  return {sub,state,result};}
 async function status(request){const diagnostic=accessDiagnostic(request,accessLog);try{
  const b=await input(request,['salon_id']),identity=await owner(request,b,{allowNoBusiness:true,onStage:diagnostic.stage});
  if(!identity.salon)return diagnostic.finish(reply(identity.access.access==='wrong_portal'?403:200,identity.access));
  if(configured()){
   let merchantVerified=false;
   // Another tab can supersede a status refresh. Re-read its context and verify
   // Stripe again on retry; never return access from the superseded snapshot.
   for(let attempt=0;attempt<3;attempt++){
    diagnostic.stage('billing-context');const data=await context(identity);if(!data.customer_id)break;
    if(!merchantVerified){diagnostic.stage('merchant');await merchant();merchantVerified=true;}
    try{diagnostic.stage('reconcile');await reconcile(data);break;}
    catch(e){if(e.code!=='billing_sync_stale'||attempt===2)throw e;}
   }
  }
  diagnostic.stage('access-final');const access=await api('/rest/v1/rpc/owner_account_access',{},identity.token);
  return diagnostic.finish(reply(200,{...access,billing:{...access.billing,connected:configured()&&access.billing.connected===true,canCheckout:configured()&&access.access!=='deleting',annual_supported:configured()}}));
 }catch(e){return diagnostic.finish(error(e),e);}}
 async function begin(data,identity,b,kind,selection){
  if(!uuid(b.request_id))throw fail(400,'Review your plan and start a fresh billing request.');
  return worker('begin',{salon:identity.salon,owner:identity.user.id,request_id:b.request_id,kind,plan:selection.plan,seats:selection.seats,cadence:selection.cadence,hash:fingerprint({kind,plan:selection.plan,seats:selection.seats,cadence:selection.cadence,offer:OFFER_VERSION,...(kind==='checkout'?{checkout_policy:'paid-upfront-v1'}:{})}),trial:false});
 }
 async function checkout(request){try{
  const b=await input(request,['salon_id','plan','cadence','seats','request_id']),identity=await owner(request,b),choice=selected(b);
  if(choice.plan==='essential')throw fail(400,'The Free plan is free. Open your workspace without entering a card.');
  const signup=identity.access.signup_payment;
  if(signup?.managed_signup===true&&signup.onboarding_completed!==true){
   if(signup.legal_accepted!==true||signup.legal_version!==OFFER_VERSION)throw fail(409,'Agree to the current terms before continuing to payment.');
   if(signup.plan!==choice.plan||signup.cadence!==choice.cadence||signup.seats!==choice.seats)throw fail(409,'Resume the subscription selected for your signup.');
  }
  if(!configured())return unavailable();const data=await context(identity);if(!data.enabled||identity.access.access==='deleting')return unavailable();await merchant();
  const sub=await subscription(data);if(sub&&!['canceled','incomplete_expired'].includes(sub.status))throw fail(409,'Use the plan-change controls for your existing subscription.');
  let prior=data.open_action;
  if(prior?.kind==='checkout'&&prior.provider_id&&(prior.trial===true||prior.plan!==choice.plan||prior.cadence!==choice.cadence||prior.seats!==choice.seats)){
   let session=await stripe().checkout.sessions.retrieve(prior.provider_id);
   if(!belongs(session,data)||session.metadata?.action_id!==prior.id)throw Error('Checkout ownership mismatch.');
   if(session.status==='open')session=await stripe().checkout.sessions.expire(session.id,{}, {idempotencyKey:'jovabook-offer-expire-'+prior.id});
   if(session.status!=='expired'){await reconcile(data);throw fail(409,'Refresh your current subscription before choosing another plan.');}
   await worker('close_action',{salon:data.salon_id,id:prior.id,verified:true});
   prior=null;
  }
  // A valid paid Checkout from an earlier release keeps its original action
  // hash. Verify and resume it rather than reserving a second subscription.
  if(prior?.kind==='checkout'&&prior.result&&prior.provider_id&&prior.trial!==true&&prior.plan===choice.plan&&prior.cadence===choice.cadence&&prior.seats===choice.seats){
   const session=await stripe().checkout.sessions.retrieve(prior.provider_id);
   if(!belongs(session,data)||session.metadata?.action_id!==prior.id)throw Error('Checkout ownership mismatch.');
   if(session.status==='open')return reply(200,prior.result);
   if(session.status==='expired'){await worker('close_action',{salon:data.salon_id,id:prior.id,verified:true});throw fail(409,'Checkout expired. Refresh and review your plan again.');}
   await reconcile(data);return reply(200,{ok:true,kind:'verified'});
  }
  if(prior?.kind==='checkout'&&prior.plan===choice.plan&&prior.cadence===choice.cadence&&prior.seats===choice.seats)b.request_id=prior.request_id;
  const action=await begin(data,identity,b,'checkout',choice);
  if(action.trial===true)throw fail(409,'Refresh your subscription to open a payment request without a free trial.');
  if(action.result){const session=await stripe().checkout.sessions.retrieve(action.provider_id);if(!belongs(session,data)||session.metadata?.action_id!==action.id)throw Error('Checkout ownership mismatch.');if(session.status==='open')return reply(200,action.result);if(session.status==='expired'){await worker('close_action',{salon:data.salon_id,id:action.id,verified:true});throw fail(409,'Checkout expired. Refresh and review your plan again.');}await reconcile(data);return reply(200,{ok:true,kind:'verified'});}
  if(now()-Date.parse(action.created_at)>23*3600000)throw fail(409,'The earlier payment request needs reconciliation.');
  let customer=data.customer_id;if(!customer){const value=await stripe().customers.create({email:identity.user.email,metadata:{app:'jovabook',salon_id:identity.salon,offer_version:OFFER_VERSION}},{idempotencyKey:'jovabook-offer-customer-'+identity.salon});customer=value.id;await worker('bind_customer',{salon:identity.salon,customer_id:customer});}
  const price=await catalog(choice.plan,choice.cadence),metadata={app:'jovabook',salon_id:identity.salon,offer_version:OFFER_VERSION,action_id:action.id};
  const formatPrice=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
  const disclosure=`${choice.name}: ${formatPrice(choice.total)} due today, ${choice.cadence==='annual'?'per year, paid upfront':'per month'}, renewing automatically. ${choice.seats} staff ${choice.seats===1?'seat':'seats'}. 0% booking commission. Stripe processing fees are separate.`;
  const returnUrl=signup?.managed_signup===true&&signup.onboarding_completed!==true?'https://book.jovamedia.com/#signup':RETURN;
  const session=await stripe().checkout.sessions.create({mode:'subscription',customer,line_items:[{price:price.id,quantity:choice.seats}],client_reference_id:identity.salon,metadata,
   payment_method_collection:'always',allowed_payment_method_types:['card'],subscription_data:{metadata},custom_text:{submit:{message:disclosure}},success_url:returnUrl,cancel_url:returnUrl},{idempotencyKey:'jovabook-offer-checkout-'+action.id});
  const url=hosted(session.url,'checkout.stripe.com');if(!url)throw Error('Invalid hosted payment URL.');const result={ok:true,kind:'checkout',url};await worker('finish',{salon:identity.salon,id:action.id,result,provider_id:session.id});return reply(200,result);
 }catch(e){return error(e);}}

 const credit=payload=>api('/rest/v1/rpc/booking_topup_worker',{p_token:env.JOVABOOK_BILLING_WORKER_TOKEN,p_action:'credit',p_payload:payload});
 async function topup(request){try{
  const b=await input(request,['salon_id','pack','request_id']),identity=await owner(request,b),pack=MESSAGE_PACKS[b.pack];
  if(!pack)throw fail(400,'Choose one of the top-up packs.');
  if(!uuid(b.request_id))throw fail(400,'Start a fresh top-up request.');
  if(!configured())return unavailable();
  const data=await context(identity);if(!data.enabled||identity.access.access==='deleting')return unavailable();
  const account=await api('/rest/v1/rpc/owner_account_access',{},identity.token);
  if(pack.channel==='sms'&&(account.billing?.plan||'essential')==='essential')throw fail(403,'Text messages are available on Solo and Team.');
  await merchant();
  let customer=data.customer_id;if(!customer){const value=await stripe().customers.create({email:identity.user.email,metadata:{app:'jovabook',salon_id:identity.salon,offer_version:OFFER_VERSION}},{idempotencyKey:'jovabook-offer-customer-'+identity.salon});customer=value.id;await worker('bind_customer',{salon:identity.salon,customer_id:customer});}
  const metadata={app:'jovabook',salon_id:identity.salon,offer_version:OFFER_VERSION,kind:'topup',pack:b.pack,channel:pack.channel,quantity:String(pack.quantity)};
  const session=await stripe().checkout.sessions.create({mode:'payment',customer,line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:pack.pence,product_data:{name:pack.label+' top-up',description:'Added to your JovaBook balance. It does not expire.'}}}],client_reference_id:identity.salon,metadata,payment_intent_data:{metadata},allowed_payment_method_types:['card'],custom_text:{submit:{message:`${pack.label} for £${(pack.pence/100).toFixed(2)}. One-off payment, not a subscription.`}},success_url:RETURN,cancel_url:RETURN},{idempotencyKey:'jovabook-topup-'+identity.salon+'-'+b.request_id});
  const url=hosted(session.url,'checkout.stripe.com');if(!url)throw Error('Invalid hosted payment URL.');return reply(200,{ok:true,kind:'topup',url});
 }catch(e){return error(e);}}
 /** Credit is only ever added from a Stripe session that is re-read from Stripe and fully matched. */
 async function creditTopup(event){
  const metadata=event.data?.object?.metadata||{};if(metadata.app!=='jovabook'||metadata.kind!=='topup')return false;
  const session=await stripe().checkout.sessions.retrieve(event.data.object.id),pack=MESSAGE_PACKS[session.metadata?.pack];
  if(!pack||session.mode!=='payment'||session.payment_status!=='paid'||session.currency!=='gbp'||session.amount_total!==pack.pence||session.livemode!==(env.JOVABOOK_STRIPE_MODE==='live')
   ||session.metadata.channel!==pack.channel||session.metadata.quantity!==String(pack.quantity)||session.metadata.offer_version!==OFFER_VERSION||session.client_reference_id!==session.metadata.salon_id)throw Error('Unverified top-up payment.');
  const data=await worker('context',{customer:objectId(session.customer)});
  if(!data||data.salon_id!==session.metadata.salon_id)throw Error('Top-up ownership mismatch.');
  const ref=objectId(session.payment_intent);if(!/^pi_[A-Za-z0-9_]{6,200}$/.test(ref||''))throw Error('Missing payment reference.');
  await merchant();await credit({salon:data.salon_id,channel:pack.channel,quantity:pack.quantity,pence:pack.pence,ref});return true;
 }
 async function change(request){try{
  const b=await input(request,['salon_id','plan','cadence','seats','request_id']),identity=await owner(request,b),choice=selected(b);
  if(choice.plan==='essential')return cancelSelection(identity,b);if(!configured())return unavailable();await merchant();let data=await context(identity);await reconcile(data);data=await context(identity);
  const sub=await subscription(data);if(!sub||!['active','trialing'].includes(sub.status))throw fail(409,'Refresh your current subscription before changing plan.');
  if(data.schedule_id||sub.schedule||sub.cancel_at_period_end||sub.pending_update)throw fail(409,'Resolve the scheduled change before choosing another plan.');
  if(sub.status==='trialing'&&choice.seats!==1)throw fail(400,'Free trials include one staff calendar. Add extra seats after your subscription is paid.');
  const item=sub.items.data[0],current=offerPriceForId(env,objectId(item.price));if(!current)throw Error('Unknown current price.');
  if(current.plan===choice.plan&&current.cadence===choice.cadence&&item.quantity===choice.seats)throw fail(409,'You already have this plan and seat count.');
  const prior=data.open_action;
  if(prior?.kind==='change'&&prior.plan===choice.plan&&prior.cadence===choice.cadence&&prior.seats===choice.seats)b.request_id=prior.request_id;
  const price=await catalog(choice.plan,choice.cadence),action=await begin(data,identity,b,'change',choice);if(action.result)return reply(200,action.result);
  const currentChoice=offerSelection(current.plan,current.cadence,item.quantity-1);
  const upgrade=choice.cadence===current.cadence&&choice.total>currentChoice.total;
  let result,provider;
  if(upgrade||sub.status==='trialing'){
   const config=await stripe().billingPortal.configurations.retrieve(env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG);
   if(!config.active||!config.features?.subscription_update?.enabled||config.features.subscription_update.proration_behavior!=='always_invoice'||config.features.subscription_update.billing_cycle_anchor==='now'||sub.status==='trialing'&&config.features.subscription_update.trial_update_behavior!=='continue_trial')throw Error('Hosted plan confirmation is unavailable.');
   const session=await stripe().billingPortal.sessions.create({customer:data.customer_id,configuration:config.id,return_url:RETURN,flow_data:{type:'subscription_update_confirm',subscription_update_confirm:{subscription:sub.id,items:[{id:item.id,price:price.id,quantity:choice.seats}]},after_completion:{type:'redirect',redirect:{return_url:RETURN}}}},{idempotencyKey:'jovabook-offer-upgrade-'+action.id});
   const url=hosted(session.url,'billing.stripe.com');if(!url)throw Error('Invalid plan confirmation URL.');provider=session.id;result={ok:true,kind:'upgrade',url};
  }else{
   let schedule=await stripe().subscriptionSchedules.create({from_subscription:sub.id},{idempotencyKey:'jovabook-offer-schedule-'+action.id});
   if(objectId(schedule.customer)!==data.customer_id||objectId(schedule.subscription)!==sub.id)throw Error('Schedule ownership mismatch.');
   const end=item.current_period_end||sub.current_period_end,start=item.current_period_start||sub.current_period_start;
   schedule=await stripe().subscriptionSchedules.update(schedule.id,{end_behavior:'release',phases:[{start_date:start,end_date:end,items:[{price:objectId(item.price),quantity:item.quantity}],proration_behavior:'none'},{items:[{price:price.id,quantity:choice.seats}],duration:{interval:price.recurring.interval,interval_count:1},proration_behavior:'none'}]},{idempotencyKey:'jovabook-offer-phases-'+action.id});
   await worker('schedule',{salon:identity.salon,plan:choice.plan,seats:choice.seats,cadence:choice.cadence,at:new Date(end*1000).toISOString(),schedule_id:schedule.id,verified:true});
   provider=schedule.id;result={ok:true,kind:'scheduled',plan:choice.plan,seats:choice.seats,effective_at:new Date(end*1000).toISOString()};
  }
  await worker('finish',{salon:identity.salon,id:action.id,result,provider_id:provider,closed:result.kind==='scheduled'});return reply(200,result);
 }catch(e){return error(e);}}
 async function cancelSelection(identity,b){
  if(!configured())return unavailable();await merchant();const data=await context(identity);
  const sub=await subscription(data);
  if(data.open_action?.kind==='change'&&data.open_action.result?.kind==='upgrade'&&sub){await worker('close_action',{salon:identity.salon,id:data.open_action.id,verified:true});}
  const choice=offerSelection('essential'),action=await begin(data,identity,b,'cancel',choice);if(action.result)return reply(200,action.result);
  if(!sub)throw fail(409,'There is no paid subscription to cancel.');if(sub.schedule||data.schedule_id)throw fail(409,'Withdraw the scheduled plan change before cancelling.');
  const updated=await stripe().subscriptions.update(sub.id,{cancel_at_period_end:true},{idempotencyKey:'jovabook-offer-cancel-'+action.id});
  if(!belongs(updated,data)||updated.cancel_at_period_end!==true)throw Error('Cancellation is unverified.');
  const end=updated.status==='trialing'?updated.trial_end:updated.items?.data?.[0]?.current_period_end||updated.current_period_end;
  if(!Number.isSafeInteger(end))throw Error('Cancellation date unavailable.');const result={ok:true,kind:'cancellation_scheduled',effective_at:new Date(end*1000).toISOString()};
  await worker('finish',{salon:identity.salon,id:action.id,result,provider_id:sub.id,closed:true});await reconcile(data);return reply(200,result);
 }
 async function cancel(request){try{const b=await input(request,['salon_id','request_id']);return await cancelSelection(await owner(request,b),b);}catch(e){return error(e);}}
 async function cancelChange(request){try{
  const b=await input(request,['salon_id','request_id']),identity=await owner(request,b);if(!configured())return unavailable();await merchant();const data=await context(identity);
  if(!data.schedule_id)throw fail(409,'There is no scheduled plan change.');const schedule=await stripe().subscriptionSchedules.retrieve(data.schedule_id);
  if(objectId(schedule.customer)!==data.customer_id||objectId(schedule.subscription)!==data.subscription_id)throw Error('Schedule ownership mismatch.');
  const action=await begin(data,identity,b,'withdraw',offerSelection(data.plan,data.cadence,data.seats-1));if(action.result)return reply(200,action.result);
  const closed=await stripe().subscriptionSchedules.release(schedule.id,{preserve_cancel_date:false},{idempotencyKey:'jovabook-offer-withdraw-'+action.id});if(closed.status!=='released')throw Error('Schedule release is unverified.');
  await worker('clear_schedule',{salon:identity.salon,verified:true});const result={ok:true,kind:'schedule_cancelled'};await worker('finish',{salon:identity.salon,id:action.id,result,provider_id:closed.id,closed:true});return reply(200,result);
 }catch(e){return error(e);}}
 async function webhook(request){try{
  if(request.method!=='POST')return reply(405,{ok:false});if(!configured()||!env.JOVABOOK_STRIPE_WEBHOOK_SECRET)return unavailable();
  const raw=await rawBody(request,262144);let event;
  try{event=stripe().webhooks.constructEvent(raw,request.headers.get('stripe-signature'),env.JOVABOOK_STRIPE_WEBHOOK_SECRET,300);}catch{return reply(400,{ok:false,message:'Invalid billing signature.'});}
  if(event.livemode!==(env.JOVABOOK_STRIPE_MODE==='live'))return reply(400,{ok:false});
  if(!/^(checkout\.session\.|invoice\.|customer\.subscription\.|subscription_schedule\.)/.test(event.type))return reply(200,{ok:true,ignored:true});
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&await creditTopup(event))return reply(200,{ok:true,topup:true});
  const customer=objectId(event.data?.object?.customer);if(!customer)return reply(200,{ok:true,ignored:true});
  const data=await worker('context',{customer});if(data){await merchant();const checked=await reconcile(data);observeFunnel(()=>funnel.candidate(event,data,checked));}return reply(200,{ok:true});
 }catch{return reply(503,{ok:false,message:'Billing will be verified before this event is acknowledged.'});}}
 const lifecycle=async()=>reply(200,{ok:true,candidates:[],message:'Free workspaces do not expire. Automatic trial deletion is retired.'});
 return {status,checkout,topup,change,cancel,cancelChange,webhook,lifecycle,configured,worker,stripe,catalog,reconcile,owner,input,error};
}
