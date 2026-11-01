import Stripe from 'stripe';
import {timingSafeEqual} from 'node:crypto';

const PLANS={essential:{amount:2000,env:'JOVABOOK_STRIPE_PRICE_ESSENTIAL'},standard:{amount:5000,env:'JOVABOOK_STRIPE_PRICE_STANDARD'},premium:{amount:10000,env:'JOVABOOK_STRIPE_PRICE_PREMIUM'}};
export const MONTHLY_COMMISSION_TERMS_VERSION='2026-11-01-appointment-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const oid=value=>typeof value==='string'?value:value?.id;
const invoiceSub=value=>oid(value.parent?.subscription_details?.subscription||value.subscription);
const linePrice=value=>oid(value.pricing?.price_details?.price||value.price);
const itemId=value=>oid(value.parent?.invoice_item_details?.invoice_item||value.invoice_item);
const instant=seconds=>{if(!Number.isSafeInteger(seconds))throw Error('Unverified provider time.');return new Date(seconds*1000).toISOString();};
const unavailable=()=>({available:false,currency:'gbp'});
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);};

/** No browser amounts, booking copies or current-plan guesses enter this worker. */
export function createMonthlyCommission({env=process.env,send=fetch,stripe:injected,now=Date.now}={}){
 let client;
 const sdk=()=>typeof injected==='function'?injected():injected||(client||=new Stripe(env.JOVABOOK_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:0,timeout:10000}));
 const enabled=()=>env.JOVABOOK_MONTHLY_COMMISSION_ENABLED==='true'&&env.JOVABOOK_BILLING_ENABLED==='true'&&env.JOVABOOK_BILLING_APPROVED==='true'&&!!env.JOVABOOK_STRIPE_SECRET_KEY&&/^[0-9a-f]{64}$/.test(env.JOVABOOK_COMMISSION_WORKER_TOKEN||'')&&/^acct_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_ACCOUNT_ID||'')&&['test','live'].includes(env.JOVABOOK_STRIPE_MODE)&&Object.values(PLANS).every(plan=>/^price_[A-Za-z0-9]+$/.test(env[plan.env]||''))&&new Set(Object.values(PLANS).map(plan=>env[plan.env])).size===3;
 const live=()=>env.JOVABOOK_STRIPE_MODE==='live';
 const planFor=value=>Object.keys(PLANS).find(plan=>env[PLANS[plan].env]===value);
 const owned=(value,context)=>value?.livemode===live()&&oid(value.customer)===context.customer_id&&value.metadata?.app==='jovabook'&&value.metadata.salon_id===context.salon_id;
 async function rpc(name,body){const target=new URL('/rest/v1/rpc/'+name,env.JOVABOOK_SUPABASE_URL);if(target.protocol!=='https:'||target.username||target.password)throw Error('Invalid commission server.');const response=await send(target.href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Commission database is unavailable.');return response.json();}
 const work=(action,payload={})=>rpc('booking_commission_worker',{p_token:env.JOVABOOK_COMMISSION_WORKER_TOKEN,p_action:action,p_payload:payload});
 const billing=(action,payload={})=>rpc('booking_billing_worker',{p_token:env.JOVABOOK_BILLING_WORKER_TOKEN,p_action:action,p_payload:payload});
 async function list(get,params={}){const values=[];let after;for(let page=0;page<10;page++){const result=await get({...params,limit:100,...(after?{starting_after:after}:{})});if(!Array.isArray(result.data))throw Error('Invalid provider collection.');values.push(...result.data);if(!result.has_more)return values;after=result.data.at(-1)?.id;if(!after)throw Error('Invalid provider cursor.');}throw Error('Provider history exceeds safe bounds.');}
 async function merchant(){const account=await sdk().accounts.retrieveCurrent();if(account?.id!==env.JOVABOOK_STRIPE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('Expected commission merchant is not ready.');}
 async function price(plan){if(!PLANS[plan])throw Error('Unapproved subscription plan.');const value=await sdk().prices.retrieve(env[PLANS[plan].env]);if(value.id!==env[PLANS[plan].env]||!value.active||value.livemode!==live()||value.currency!=='gbp'||value.unit_amount!==PLANS[plan].amount||value.recurring?.interval!=='month'||value.recurring.interval_count!==1)throw Error('Unapproved subscription catalog.');return value;}
 async function customerCredit(context){const value=await sdk().customers.retrieve(context.customer_id);if(value?.id!==context.customer_id||value.deleted||value.livemode!==live()||value.metadata?.app!=='jovabook'||value.metadata.salon_id!==context.salon_id||!Number.isSafeInteger(value.balance)||value.balance>0)throw Error('Commission customer balance needs review.');return Math.max(0,-value.balance);}
 async function providerHistory(context){
  const sub=await sdk().subscriptions.retrieve(context.subscription_id,{expand:['items.data.price']});
  if(sub?.id!==context.subscription_id||!owned(sub,context)||sub.items?.data?.length!==1||sub.items.data[0].quantity!==1)throw Error('Commission subscription binding mismatch.');
  const item=sub.items.data[0],currentPlan=planFor(oid(item.price));await price(currentPlan);
  const start=item.current_period_start||sub.current_period_start,end=item.current_period_end||sub.current_period_end;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start)throw Error('Missing verified billing period.');
  let nextPlan=currentPlan;
  if(sub.schedule){const schedule=await sdk().subscriptionSchedules.retrieve(oid(sub.schedule));if(oid(schedule.customer)!==context.customer_id||oid(schedule.subscription)!==sub.id)throw Error('Commission schedule binding mismatch.');const next=schedule.phases?.find(phase=>phase.start_date===end);if(next){if(next.items?.length!==1||next.items[0].quantity!==1)throw Error('Unknown next billing price.');nextPlan=planFor(oid(next.items[0].price));await price(nextPlan);}}
  const subscriptions=await list(p=>sdk().subscriptions.list(p),{customer:context.customer_id,status:'all'});
  const ownedIds=new Set(subscriptions.filter(value=>owned(value,context)).map(value=>value.id));ownedIds.add(sub.id);
  const invoices=await list(p=>sdk().invoices.list(p),{customer:context.customer_id}),history=[],checked=new Set([currentPlan,nextPlan]);
  for(const invoice of invoices){
   if(oid(invoice.customer)!==context.customer_id||invoice.livemode!==live()||!ownedIds.has(invoiceSub(invoice)))throw Error('Unscoped commission invoice.');
   const balancePaid=invoice.amount_due===0&&invoice.amount_remaining===0&&invoice.starting_balance<0;
   if(invoice.status!=='paid'||invoice.currency!=='gbp'||!(invoice.amount_paid>0||balancePaid))continue;
   const lines=Array.isArray(invoice.lines?.data)&&invoice.lines.has_more===false?invoice.lines.data:await list(p=>sdk().invoices.listLineItems(invoice.id,p));
   for(const line of lines){const plan=planFor(linePrice(line));if(!plan||line.amount<=0||line.quantity!==1)continue;
    if(!checked.has(plan)){await price(plan);checked.add(plan);}
    let effective=line.period?.start;const until=line.period?.end,proration=line.parent?.subscription_item_details?.proration===true||line.proration===true;
    // First activation and paid upgrades cannot retroactively change the tier
    // before the real payment; renewal periods retain their anniversary start.
    if(proration||invoice.billing_reason!=='subscription_cycle'){const paidAt=invoice.status_transitions?.paid_at;if(!Number.isSafeInteger(paidAt))throw Error('Missing historical activation time.');effective=Math.max(effective,paidAt);}
    if(!Number.isSafeInteger(effective)||!Number.isSafeInteger(until)||until<=effective)throw Error('Unverified historical service period.');
    history.push({invoice:invoice.id,line:line.id,subscription:invoiceSub(invoice),plan,start:instant(effective),end:instant(until)});
   }
  }
  return {sub,history,period_start:instant(start),period_end:instant(end),next_plan:nextPlan,customer_credit_minor:await customerCredit(context)};
 }
 async function invoice(context,id){const value=await sdk().invoices.retrieve(id);if(value?.id!==id||oid(value.customer)!==context.customer_id||value.livemode!==live()||value.currency!=='gbp'||invoiceSub(value)!==context.subscription_id)throw Error('Commission invoice binding mismatch.');return value;}
 const meta=(context,batch)=>({app:'jovabook',kind:'monthly_commission',salon_id:context.salon_id,batch_id:batch.id});
 function matchesLine(line,context,batch){return line.amount===Number(batch.amount_minor)&&line.currency==='gbp'&&Object.entries(meta(context,batch)).every(([key,value])=>line.metadata?.[key]===value)&&(!batch.provider_item_id||itemId(line)===batch.provider_item_id);}
 async function settleBatch(context,batch,{create=false}={}){
  let current=await invoice({...context,subscription_id:batch.subscription_id},batch.invoice_id);
  let lines=await list(p=>sdk().invoices.listLineItems(current.id,p));const matches=lines.filter(line=>matchesLine(line,context,batch));
  if(matches.length>1)throw Error('Duplicate commission lines require review.');
  let found=matches[0];
  if(!found&&Number(batch.amount_minor)!==0){
   if(current.status!=='draft'){
    if(batch.provider_item_id)throw Error('A previously bound commission line disappeared.');
    await work('invoice_state',{salon:context.salon_id,batch:batch.id,invoice:batch.invoice_id,customer:context.customer_id,status:'absent_finalized'});return;
   }
   if(!create)return;
   if(now()-Date.parse(batch.created_at)>=23*3600000){await work('invoice_state',{salon:context.salon_id,batch:batch.id,invoice:batch.invoice_id,customer:context.customer_id,status:'needs_attention'});throw Error('Unknown old commission write requires reconciliation.');}
   if(!Number.isSafeInteger(current.total)||current.total+Number(batch.amount_minor)>99999999)throw Error('Invoice amount exceeds safe collection limits.');
   const added=await sdk().invoiceItems.create({customer:context.customer_id,invoice:current.id,amount:Number(batch.amount_minor),currency:'gbp',discountable:false,description:'JovaBook appointment commission before '+batch.cutoff.slice(0,10),metadata:meta(context,batch)},{idempotencyKey:'jovabook-monthly-commission-'+batch.id});
   if(!/^ii_[A-Za-z0-9]+$/.test(added?.id||'')||oid(added.customer)!==context.customer_id||oid(added.invoice)!==current.id||added.amount!==Number(batch.amount_minor)||added.currency!=='gbp'||Object.entries(meta(context,batch)).some(([key,value])=>added.metadata?.[key]!==value))throw Error('Commission invoice item is unverified.');
   await work('bind_item',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,item:added.id});
   current=await invoice({...context,subscription_id:batch.subscription_id},batch.invoice_id);lines=await list(p=>sdk().invoices.listLineItems(current.id,p));const actual=lines.filter(line=>matchesLine(line,context,{...batch,provider_item_id:added.id}));if(actual.length!==1)throw Error('Created commission line needs reconciliation.');found=actual[0];
  }
  if(found||Number(batch.amount_minor)===0)await work('bind_item',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,item:found?itemId(found):null});
  if(create&&['draft','open'].includes(current.status))current=await collectRenewal(context,batch,current,lines);
  if(current.status==='paid'){const settlement=await collectionCoverage(context,batch,current);await work('collection_state',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,state:'paid'});await work('invoice_state',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,status:'paid',settlement_kind:settlement});}
  else if(current.status==='void')await work('invoice_state',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,status:'void'});
  else if(!['draft','open','uncollectible'].includes(current.status))throw Error('Unknown commission invoice status.');
  return current.status==='paid';
 }
 async function knownCredits(context,batch,current){
  const notes=await list(p=>sdk().creditNotes.list(p),{invoice:current.id}),actions=(context.known_credits||[]).filter(credit=>credit.original_batch===batch.id&&credit.action).map(credit=>credit.action);let total=0,pre=0;
  for(const note of notes){const action=actions.find(value=>value.provider_id===note.id||note.metadata?.entry_id===value.entry_id);if(!action||!validCredit(note,context,action)){
   if(action)await work('credit_attention',{salon:context.salon_id,entry:action.entry_id});
   await work('invoice_state',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,status:'needs_attention'});
   await work('collection_state',{salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id,state:'unknown'});
   throw Error('Unknown or reversed invoice credit requires reconciliation.');
  }total+=note.amount;pre+=note.pre_payment_amount;}
  return {total,pre};
 }
 async function collectionCoverage(context,batch,current){
  const args={salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id};
  try{
   if(!Number.isSafeInteger(current.total)||current.total<0||current.amount_remaining!==0)throw Error('Invoice is not settled.');
   const credits=await knownCredits(context,batch,current),payments=await list(p=>sdk().invoicePayments.list(p),{invoice:current.id});let paid=0,applied=0;const seen=new Set();
   for(const payment of payments){if(payment.status!=='paid')continue;if(seen.has(payment.id)||oid(payment.invoice)!==current.id||payment.currency!=='gbp'||!Number.isSafeInteger(payment.amount_paid)||payment.amount_paid<=0||payment.payment?.type!=='payment_intent')throw Error('Unverified invoice payment allocation.');seen.add(payment.id);const paymentId=oid(payment.payment.payment_intent),intent=await sdk().paymentIntents.retrieve(paymentId);if(intent?.id!==paymentId||intent.status!=='succeeded'||intent.livemode!==live()||intent.currency!=='gbp'||oid(intent.customer)!==context.customer_id||!Number.isSafeInteger(intent.amount_received)||intent.amount_received<payment.amount_paid)throw Error('Unverified collected payment.');paid+=payment.amount_paid;}
   if(current.starting_balance<0){const transactions=await list(p=>sdk().customers.listBalanceTransactions(context.customer_id,p));for(const tx of transactions){if(oid(tx.invoice)!==current.id)continue;if(oid(tx.customer)!==context.customer_id||tx.currency!=='gbp'||!Number.isSafeInteger(tx.amount))throw Error('Unverified invoice balance application.');if(['applied_to_invoice','unapplied_from_invoice'].includes(tx.type))applied+=tx.amount;}}
   const required=Math.max(0,current.total-credits.total);if(paid+applied<required)throw Error('Paid label has no verified monetary or approved-credit coverage.');
   return required===0?'credit_waiver':paid>0?'payment':'customer_balance';
  }catch(e){await work('invoice_state',{...args,status:'needs_attention'});await work('collection_state',{...args,state:'unknown'});throw e;}
 }
 async function collectRenewal(context,batch,current,lines){
  if(current.billing_reason!=='subscription_cycle'||current.collection_method!=='charge_automatically')return current;
  const commission=lines.filter(line=>matchesLine(line,context,batch)),base=lines.filter(line=>planFor(linePrice(line))&&line.quantity===1&&line.parent?.subscription_item_details?.proration!==true&&line.proration!==true);
  if(base.length!==1||commission.length!==(Number(batch.amount_minor)===0?0:1)||lines.length!==base.length+commission.length)throw Error('Renewal has unapproved invoice lines.');
  const plan=planFor(linePrice(base[0]));await price(plan);
  if(base[0].currency!=='gbp'||base[0].amount!==PLANS[plan].amount||instant(base[0].period?.start)!==new Date(batch.cutoff).toISOString()||!Number.isSafeInteger(current.total)||current.total!==PLANS[plan].amount+Number(batch.amount_minor)||(current.total_taxes||[]).length||(current.total_tax_amounts||[]).length||(current.total_discount_amounts||[]).length)throw Error('Renewal totals require review.');
  const args={salon:context.salon_id,batch:batch.id,invoice:current.id,customer:context.customer_id};
  if(current.status==='draft'){
   const stage=await work('collection_begin',{...args,stage:'finalize'});if(!stage)return current;
   if(now()-Date.parse(stage.finalize_started_at)>=23*3600000)throw Error('Unknown old invoice finalization requires reconciliation.');
   await sdk().invoices.finalizeInvoice(current.id,{auto_advance:false},{idempotencyKey:'jovabook-commission-finalize-'+batch.id});current=await invoice(context,current.id);
  }
  if(current.status==='paid')return current;
  if(current.status!=='open')throw Error('Renewal is not payable.');
  const credits=await knownCredits(context,batch,current),expectedDue=Math.max(0,current.total+Math.min(0,current.starting_balance||0)-credits.pre);
  if((current.starting_balance||0)>0||!Number.isSafeInteger(current.amount_due)||current.amount_due!==expectedDue||current.amount_due>current.total)throw Error('Renewal amount due or customer debit needs review.');
  const payments=await list(p=>sdk().invoicePayments.list(p),{invoice:current.id});
  for(const payment of payments){
   if(payment.payment?.type!=='payment_intent'||!oid(payment.payment.payment_intent))throw Error('Unknown invoice payment state.');
   const intent=await sdk().paymentIntents.retrieve(oid(payment.payment.payment_intent));if(oid(intent.customer)!==context.customer_id||intent.livemode!==live()||intent.currency!=='gbp')throw Error('Renewal payment binding mismatch.');
   if(['processing','requires_capture','succeeded'].includes(intent.status)){await work('collection_state',{...args,state:'processing'});return current;}
   if(['requires_action','requires_payment_method'].includes(intent.status)&&current.attempted===true){await work('collection_state',{...args,state:'failed'});return current;}
   if(!['requires_payment_method','requires_confirmation','canceled'].includes(intent.status))throw Error('Invoice payment outcome requires reconciliation.');
  }
  const stage=await work('collection_begin',{...args,stage:'pay'});if(!stage)return current;
  if(now()-Date.parse(stage.pay_started_at)>=23*3600000)throw Error('Unknown old payment request requires reconciliation.');
  try{await sdk().invoices.pay(current.id,{}, {idempotencyKey:'jovabook-commission-pay-'+batch.id});}catch{
   const checked=await invoice(context,current.id);if(checked.status==='paid')return checked;
   await work('collection_state',{...args,state:'unknown'});throw Error('Payment result is unknown; canonical reconciliation is required.');
  }
  const checked=await invoice(context,current.id);if(checked.status!=='paid')await work('collection_state',{...args,state:'processing'});return checked;
 }
 const creditMeta=(context,entry)=>({app:'jovabook',kind:'commission_cancellation_credit',salon_id:context.salon_id,entry_id:entry});
 function validCredit(note,context,action){return /^cn_[A-Za-z0-9]+$/.test(note?.id||'')&&note.status==='issued'&&note.livemode===live()&&oid(note.customer)===context.customer_id&&oid(note.invoice)===action.invoice_id&&note.currency==='gbp'&&note.amount===Number(action.amount_minor)&&note.pre_payment_amount+note.post_payment_amount===Number(action.amount_minor)&&note.post_payment_amount===Number(action.credit_amount)&&(note.refunds||[]).length===0&&!(note.out_of_band_amount>0)&&(Number(action.credit_amount)===0||!!note.customer_balance_transaction)&&Object.entries(creditMeta(context,action.entry_id)).every(([key,value])=>note.metadata?.[key]===value)&&note.lines?.data?.length===1&&note.lines.data[0].invoice_line_item===action.line_id&&note.lines.data[0].amount===Number(action.amount_minor);}
 async function settleCredit(context,credit){
  if(!['invoiced','paid'].includes(credit.batch_status)||!credit.item_id)return;
  const current=await sdk().invoices.retrieve(credit.invoice_id);if(oid(current.customer)!==context.customer_id||current.livemode!==live()||current.currency!=='gbp')throw Error('Credit invoice binding mismatch.');
  if(current.status==='draft'||current.status==='void')return;
  if(!['open','paid'].includes(current.status)||current.status==='open'&&current.amount_paid>0)throw Error('Partial or unknown invoice needs credit review.');
  const lines=await list(p=>sdk().invoices.listLineItems(current.id,p)),line=lines.find(value=>itemId(value)===credit.item_id&&value.metadata?.batch_id===credit.original_batch&&value.metadata?.salon_id===context.salon_id);
  if(!line||line.currency!=='gbp'||line.amount<Number(credit.amount_minor))throw Error('Original commission line is unavailable.');
  const action=credit.action||await work('credit_reserve',{salon:context.salon_id,entry:credit.entry,batch:credit.original_batch,customer:context.customer_id,invoice:current.id,line:line.id,amount:credit.amount_minor,credit_amount:current.status==='paid'?credit.amount_minor:0});if(!action)return;
  let note;if(action.provider_id)note=await sdk().creditNotes.retrieve(action.provider_id);else{const notes=await list(p=>sdk().creditNotes.list(p),{invoice:current.id});const matches=notes.filter(value=>value.metadata?.entry_id===credit.entry&&value.metadata?.salon_id===context.salon_id&&value.metadata?.kind==='commission_cancellation_credit');if(matches.length>1)throw Error('Duplicate credit notes require review.');note=matches[0];}
  if(!note){if(now()-Date.parse(action.created_at)>=23*3600000)throw Error('Unknown old credit requires reconciliation.');note=await sdk().creditNotes.create({invoice:current.id,lines:[{type:'invoice_line_item',invoice_line_item:action.line_id,amount:Number(action.amount_minor)}],...(Number(action.credit_amount)>0?{credit_amount:Number(action.credit_amount)}:{}),reason:'order_change',email_type:'none',metadata:creditMeta(context,action.entry_id)},{idempotencyKey:'jovabook-commission-credit-'+action.entry_id});}
  if(!validCredit(note,context,action)){await work('credit_attention',{salon:context.salon_id,entry:action.entry_id});throw Error('Cancellation credit is unverified or was reversed.');}
  await work('credit_finish',{salon:context.salon_id,entry:action.entry_id,invoice:action.invoice_id,customer:context.customer_id,note:note.id});
 }
 async function refresh(salon,{invoiceId}={}){
  if(!enabled())return {disabled:true};if(!UUID.test(salon||''))throw Error('Invalid business.');await merchant();
  const context=await billing('context',{salon});if(!context?.customer_id||!context.subscription_id)return {available:false};
  const state=await work('context',{salon});if(!state||state.disabled||state.deletion_state||state.commission_terms_version!==MONTHLY_COMMISSION_TERMS_VERSION)return {available:false};
  const snapshot=await providerHistory(context),historyBody={salon,customer:context.customer_id,subscription:context.subscription_id,...snapshot};delete historyBody.sub;
  await work('history',historyBody);
  let collected=false,current=await work('context',{salon});if(current.review_required)throw Error('Restored commission occurrence requires financial review.');let financial={...context,known_credits:current.credits||[]};for(const batch of current.batches||[])collected=await settleBatch(financial,batch,{create:env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED==='true'&&current.invoice_enabled===true})||collected;
  if(invoiceId&&env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED==='true'&&current.invoice_enabled===true){const target=await invoice(context,invoiceId);if(target.billing_reason==='subscription_cycle'&&target.status==='draft'){
   const targetLines=await list(p=>sdk().invoices.listLineItems(target.id,p));const base=targetLines.filter(line=>planFor(linePrice(line))&&line.amount>0&&line.quantity===1&&line.parent?.subscription_item_details?.proration!==true&&line.proration!==true);
   if(base.length!==1)throw Error('Renewal invoice needs one approved base period.');
   // Invoice.period_start describes usage aggregation and can differ from the
   // new prepaid subscription line. The new base line is the arrears cutoff.
   const batch=await work('reserve',{salon,customer:context.customer_id,subscription:context.subscription_id,invoice:target.id,cutoff:instant(base[0].period?.start)});if(batch?.id)collected=await settleBatch(financial,batch,{create:true})||collected;
  }}
  await work('accrue',{salon});current=await work('context',{salon});
  if(env.JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED==='true'&&current.invoice_enabled===true)for(const credit of current.credits||[])await settleCredit(context,credit);
  // Balance credits change the next estimate, so fetch them after credit-note
  // verification instead of reducing an estimate by an unverified local number.
  historyBody.customer_credit_minor=await customerCredit(context);await work('history',historyBody);
  return {ok:true,collected,summary:await work('summary',{salon})};
 }
 async function summary(salon){if(!enabled()||!UUID.test(salon||''))return unavailable();try{return await work('summary',{salon})||unavailable();}catch{return unavailable();}}
 async function event(value,context){if(!enabled()||!context?.salon_id)return;const invoiceId=value.type==='invoice.created'?value.data?.object?.id:undefined;return refresh(context.salon_id,{invoiceId});}
 async function acceptTerms(salon,action,plan,version){if(!enabled())return;if(version!==MONTHLY_COMMISSION_TERMS_VERSION)throw Object.assign(Error('Review the current subscription and appointment commission before continuing.'),{status:400});const result=await work('accept_terms',{salon,action,plan,version});if(result?.ok!==true)throw Error('Billing terms receipt could not be verified.');}
 async function handler(request){try{
  const secret=env.JOVABOOK_COMMISSION_HTTP_TOKEN;if(!/^[0-9a-f]{64}$/.test(secret||'')||!same(request.headers.get('authorization'),'Bearer '+secret))return reply(401,{ok:false});
  if(request.method!=='POST')return reply(405,{ok:false});const raw=await request.text();if(raw.length>8192)return reply(400,{ok:false});let body;try{body=JSON.parse(raw||'{}');}catch{return reply(400,{ok:false});}
  if(!body||Array.isArray(body)||Object.keys(body).some(key=>!['salon','invoice'].includes(key))||!UUID.test(body.salon||'')||body.invoice&&!/^in_[A-Za-z0-9]+$/.test(body.invoice))return reply(400,{ok:false});
  if(!enabled())return reply(503,{ok:false,disabled:true});return reply(200,await refresh(body.salon,{invoiceId:body.invoice}));
 }catch{return reply(503,{ok:false,message:'Commission remains uncollected until provider reconciliation succeeds.'});}}
 return {summary,event,refresh,handler,enabled,acceptTerms,termsVersion:MONTHLY_COMMISSION_TERMS_VERSION};
}
