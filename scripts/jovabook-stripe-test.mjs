#!/usr/bin/env node
/** Opt-in Stripe TEST transport with an ephemeral local database. Never a deploy hook. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import Stripe from 'stripe';
import {SOURCE_FILES,prepareSchemaSql} from './jovabook-test-db.mjs';
import {createJovaBookBillingHandlers} from '../lib/jovabook-billing.mjs';
import {createMonthlyCommission,MONTHLY_COMMISSION_TERMS_VERSION} from '../lib/jovabook-monthly-commission.mjs';
import {subscriptionPrice,validateSubscriptionPrice} from '../lib/jovabook-subscription-catalog.mjs';

const require=createRequire(import.meta.url),ROOT=fileURLToPath(new URL('..',import.meta.url));
const LOCAL='https://jovabook-local.invalid',API_VERSION='2026-09-30.endive';
const objectId=value=>typeof value==='string'?value:value?.id;
const id=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9]+$').test(value);
const fail=code=>{throw Object.assign(Error(code),{harnessCode:code});};
const check=(condition,code)=>{if(!condition)fail(code);};
export const GAPS=Object.freeze(['Hosted Checkout and portal interaction','Genuine signed webhook delivery/retries','Renewals, annual billing and commission invoice collection','Declines, SCA, refunds and credits','Guest merchant deposit checkout is not implemented','Hosted Supabase, production activation and multi-connection concurrency']);
export function parseArguments(args){
 const [command='preflight',...flags]=args;check(['preflight','catalog','run'].includes(command),'invalid_command');
 check(flags.every(flag=>flag==='--confirm=test-only')&&new Set(flags).size===flags.length,'invalid_option');
 const confirmed=flags.includes('--confirm=test-only');check(command!=='run'||confirmed,'test_confirmation_required');
 return {command,confirmed};
}
export function validateEnvironment(env,required=false){
 for(const [name,value] of Object.entries(env)){
  if(/STRIPE/i.test(name)&&typeof value==='string'&&(/^(?:sk|rk|pk)_live_/.test(value)||/MODE$/i.test(name)&&value.toLowerCase()==='live'))fail('live_stripe_configuration_refused');
  if(value&&/^(?:DATABASE_URL|DIRECT_URL|PGHOST|PGHOSTADDR|PGDATABASE|SUPABASE_URL|JOVABOOK_SUPABASE_URL)$/.test(name))fail('hosted_database_configuration_refused');
 }
 check(env.NODE_ENV!=='production'&&!env.VERCEL&&!env.NETLIFY&&!env.AWS_LAMBDA_FUNCTION_NAME,'hosted_runtime_refused');
 if(!required)return null;
 const key=env.JOVABOOK_TEST_STRIPE_KEY;check(/^rk_test_[A-Za-z0-9]+$/.test(key||''),'restricted_test_key_required');
 const account=env.JOVABOOK_TEST_STRIPE_ACCOUNT_ID;check(id(account,'acct'),'expected_sandbox_account_required');
 const prices=Object.fromEntries(['essential','standard','premium'].map(plan=>[plan,env['JOVABOOK_TEST_PRICE_'+plan.toUpperCase()]]));
 check(Object.values(prices).every(value=>id(value,'price'))&&new Set(Object.values(prices)).size===3,'three_distinct_test_prices_required');
 return {key,account,prices};
}
export function guardedHttpClient(base,key,confirmed){
 return {getClientName:()=> 'jovabook-test-only',async makeRequest(host,port,requestPath,method,headers,data,protocol,timeout){
  check(host==='api.stripe.com'&&Number(port)===443&&protocol==='https'&&typeof requestPath==='string'&&requestPath.startsWith('/v1/')&&!requestPath.includes('://'),'stripe_api_host_refused');
  check(headers?.Authorization==='Bearer '+key||headers?.authorization==='Bearer '+key,'stripe_auth_binding_refused');
  check(/^rk_test_[A-Za-z0-9]+$/.test(key),'restricted_test_key_required');
  check(['GET','POST','DELETE'].includes(method),'stripe_method_refused');
  check(method==='GET'||confirmed,'test_confirmation_required');
  check(!headers['Stripe-Account']&&!headers['stripe-account'],'connected_account_scope_refused');
  return base.makeRequest(host,port,requestPath,method,headers,data,protocol,Math.min(timeout||10000,10000));
 }};
}
export function createTestStripe(config,confirmed){return new Stripe(config.key,{apiVersion:API_VERSION,host:'api.stripe.com',port:443,protocol:'https',timeout:10000,maxNetworkRetries:0,telemetry:false,httpClient:guardedHttpClient(Stripe.createNodeHttpClient(),config.key,confirmed)});}
export function fixtureClockSql(source){return source.replace(/(?<![\w.])(?:now|clock_timestamp)\s*\(\s*\)/gi,'jovabook_test.fixture_time()');}
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function safeError(error){return {code:/^[a-z_]{1,80}$/.test(error?.harnessCode||'')?error.harnessCode:'stripe_test_verification_failed',...(Number.isInteger(error?.statusCode)?{http_status:error.statusCode}:{}),...(/^req_[A-Za-z0-9]+$/.test(error?.requestId||'')?{request_id:error.requestId}:{})};}

export async function createLocalLedger(runId,{read=fs.readFile}={}){
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite(),salon=randomUUID(),owner=randomUUID(),token='local-owner-'+randomUUID();
 let clock=Date.now()-4*86400000;
 const env={JOVABOOK_SUPABASE_URL:LOCAL,JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'local-fixture-only',JOVABOOK_BILLING_ENABLED:'true',JOVABOOK_BILLING_APPROVED:'true',JOVABOOK_STRIPE_MODE:'test',JOVABOOK_MONTHLY_COMMISSION_ENABLED:'true',JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED:'false',JOVABOOK_ANNUAL_COMMISSION_INVOICING_ENABLED:'false',JOVABOOK_BILLING_WORKER_TOKEN:randomBytes(32).toString('hex'),JOVABOOK_COMMISSION_WORKER_TOKEN:randomBytes(32).toString('hex')};
 const q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0].data;
 try{
  await db.exec(`create schema jovabook_test;create table jovabook_test.clock_control(instant timestamptz not null);create function jovabook_test.fixture_time() returns timestamptz language sql volatile as $$select instant from jovabook_test.clock_control$$;create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await q('insert into jovabook_test.clock_control values($1)',[new Date(clock)]);
  await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,owner uuid,owner_id text,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  for(const [index,name] of SOURCE_FILES.entries()){await db.exec(fixtureClockSql(prepareSchemaSql(await read(path.join(ROOT,'booking-demo','supabase',name),'utf8'))));if(index===0)await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select on all tables in schema public to anon;');}
  await q('insert into auth.users values($1,$2,$3)',[owner,'owner-'+runId+'@example.test',new Date(clock)]);
  await q("insert into salons(id,owner_id,name,slug,owner_name,email,status,settings) values($1,$2,'Stripe TEST fixture',$3,'Fictional Owner',$4,'active',$5)",[salon,owner,'stripe-'+runId.replaceAll('-','').slice(0,20),'owner-'+runId+'@example.test',JSON.stringify({timezone:'UTC',hours:{start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]}})]);
  await q("update jovabook_private.billing_config set enabled=true,provider_configured=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[env.JOVABOOK_BILLING_WORKER_TOKEN]);
  await q("update jovabook_private.commission_config set enabled=true,invoice_enabled=false,enabled_at=jovabook_test.fixture_time(),worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[env.JOVABOOK_COMMISSION_WORKER_TOKEN]);
 }catch(error){await db.close();throw error;}
 const work=(action,payload={})=>value('select booking_billing_worker($1,$2,$3) data',[env.JOVABOOK_BILLING_WORKER_TOKEN,action,JSON.stringify({salon,...payload})]);
 async function send(url,options={}){
  const u=new URL(url);check(u.origin===LOCAL&&!u.search&&!u.hash&&!u.username&&!u.password,'nonlocal_database_transport_refused');
  if(u.pathname==='/auth/v1/user'){check(options.method==='GET'&&options.headers?.Authorization==='Bearer '+token,'local_auth_refused');return Response.json({id:owner,email:'owner-'+runId+'@example.test',email_confirmed_at:new Date(clock).toISOString()});}
  check(options.method==='POST','local_rpc_method_refused');const body=JSON.parse(options.body||'{}');
  if(u.pathname==='/rest/v1/rpc/owner_account_access'){
   check(options.headers?.Authorization==='Bearer '+token,'local_auth_refused');await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
   try{return Response.json(await value('select owner_account_access() data'));}finally{await db.exec('reset role');}
  }
  const fn=u.pathname==='/rest/v1/rpc/booking_billing_worker'?'booking_billing_worker':u.pathname==='/rest/v1/rpc/booking_commission_worker'?'booking_commission_worker':null;
  check(fn,'local_rpc_refused');return Response.json(await value('select '+fn+'($1,$2,$3) data',[body.p_token,body.p_action,JSON.stringify(body.p_payload)]));
 }
 return {db,q,value,work,env,salon,owner,send,now:()=>clock,request:body=>new Request('https://book.jovamedia.com/api/jovabook/billing/cancel',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)}),async setClock(instant){check(Number.isFinite(instant)&&instant>=clock,'fixture_clock_refused');clock=instant;await q('update jovabook_test.clock_control set instant=$1',[new Date(clock)]);},close:()=>db.close()};
}

export async function verifyCatalog(stripe,config){
 const account=await stripe.accounts.retrieveCurrent();check(account?.id===config.account,'sandbox_account_mismatch');check(account.charges_enabled===true,'sandbox_payments_paused');
 const env={};for(const [plan,price] of Object.entries(config.prices))env['JOVABOOK_STRIPE_PRICE_'+plan.toUpperCase()]=price;
 for(const plan of Object.keys(config.prices)){const approved=subscriptionPrice(env,plan);try{validateSubscriptionPrice(await stripe.prices.retrieve(approved.id),approved,'test');}catch{fail('test_catalog_mismatch');}}
 return env;
}
function fixtureOwned(value,runId,salon){return value?.livemode===false&&value.metadata?.jovabook_test_run===runId&&value.metadata?.salon_id===salon&&value.metadata?.app==='jovabook';}
async function verifyPayment(stripe,subscription,customer,price){
 const invoiceId=objectId(subscription.latest_invoice);check(id(invoiceId,'in'),'invoice_missing');const invoice=await stripe.invoices.retrieve(invoiceId);
 check(invoice.id===invoiceId&&invoice.livemode===false&&objectId(invoice.customer)===customer&&objectId(invoice.parent?.subscription_details?.subscription||invoice.subscription)===subscription.id&&invoice.status==='paid'&&invoice.currency==='gbp'&&invoice.amount_paid===price.amount&&invoice.amount_remaining===0&&invoice.total===price.amount,'initial_payment_unverified');
 const payments=await stripe.invoicePayments.list({invoice:invoiceId,limit:100});check(Array.isArray(payments.data)&&!payments.has_more,'invoice_payments_unverified');
 const paid=payments.data.filter(payment=>payment.status==='paid');check(paid.length===1&&objectId(paid[0].invoice)===invoiceId&&paid[0].currency==='gbp'&&paid[0].amount_paid===price.amount&&paid[0].payment?.type==='payment_intent','invoice_payments_unverified');
 const paymentId=objectId(paid[0].payment.payment_intent);check(id(paymentId,'pi'),'payment_intent_missing');const intent=await stripe.paymentIntents.retrieve(paymentId);
 check(intent.id===paymentId&&intent.livemode===false&&intent.status==='succeeded'&&objectId(intent.customer)===customer&&intent.currency==='gbp'&&intent.amount_received===price.amount,'initial_payment_unverified');
 return {invoice,paymentId};
}
export async function cleanupFixtures(stripe,objects,runId,salon){
 const receipt={status:'not_needed'};if(!objects.customer){if(objects.payment_method)receipt.status='manual_review_unattached_payment_method';return receipt;}
 try{
  const customer=await stripe.customers.retrieve(objects.customer);check(customer.id===objects.customer&&fixtureOwned(customer,runId,salon),'cleanup_scope_refused');
  const list=await stripe.subscriptions.list({customer:customer.id,status:'all',limit:100});check(Array.isArray(list.data)&&!list.has_more,'cleanup_scope_refused');
  for(const subscription of list.data){check(objectId(subscription.customer)===customer.id&&fixtureOwned(subscription,runId,salon),'cleanup_scope_refused');if(!['canceled','incomplete_expired'].includes(subscription.status))await stripe.subscriptions.cancel(subscription.id,{invoice_now:false,prorate:false},{idempotencyKey:'jovabook-test-clean-'+runId+'-'+subscription.id});const actual=await stripe.subscriptions.retrieve(subscription.id);check(['canceled','incomplete_expired'].includes(actual.status),'cleanup_unverified');}
  if(objects.payment_method){const method=await stripe.paymentMethods.retrieve(objects.payment_method);check(method.id===objects.payment_method&&fixtureOwned(method,runId,salon)&&(!method.customer||objectId(method.customer)===customer.id),'cleanup_scope_refused');if(method.customer)await stripe.paymentMethods.detach(method.id,{}, {idempotencyKey:'jovabook-test-detach-'+runId});}
  const deleted=await stripe.customers.del(customer.id);check(deleted.id===customer.id&&deleted.deleted===true,'cleanup_unverified');receipt.status='cancelled_and_customer_deleted';
 }catch(error){receipt.status='needs_attention';receipt.error=safeError(error);}return receipt;
}

/** Immutable, flushed snapshots retain the last complete receipt after a crash. */
export function receiptWriter(directory,runId){
 let initial=true,sequence=0;
 return async report=>{try{
  await fs.mkdir(directory,{recursive:true});
  const content=JSON.stringify(report,null,2)+'\n';
  if(initial){await fs.writeFile(path.join(directory,runId+'.intent.json'),content,{flag:'wx',flush:true});initial=false;}
  await fs.writeFile(path.join(directory,runId+'.'+String(++sequence).padStart(4,'0')+'.progress.json'),content,{flag:'wx',flush:true});
 }catch{fail('local_receipt_write_failed');}};
}

/** Exported for injected, network-free tests. CLI always supplies the guarded SDK. */
export async function runVerification(stripe,config,{runId=randomUUID(),transport='injected-test-double',confirmed=false,onProgress=async()=>{}}={}){
 check(confirmed===true,'test_confirmation_required');
 check(/^[a-f0-9-]{36}$/.test(runId),'invalid_run_id');
 const report={run_id:runId,status:'failed',provider_transport:transport,mode:'test',expected_account:config.account,api_version:API_VERSION,steps:[],provider_objects:{},provider_writes:[],coverage_gaps:[...GAPS],database:'ephemeral PGlite; no hosted tenant records',clock:'Fixture-only SQL/JS clock. No Stripe Test Clock. Registration starts four local days earlier; service occurs after actual test payment.'};
 let local;
 try{
  await onProgress(report);
  report.phase='account_and_catalog';const catalog=await verifyCatalog(stripe,config);report.steps.push('sandbox account chargeable and three exact test prices verified');
  local=await createLocalLedger(runId);await local.setClock(Date.now());Object.assign(local.env,catalog,{JOVABOOK_STRIPE_SECRET_KEY:config.key,JOVABOOK_STRIPE_ACCOUNT_ID:config.account});
  const handlers=createJovaBookBillingHandlers({env:local.env,send:local.send,stripe,now:local.now}),monthly=createMonthlyCommission({env:local.env,send:local.send,stripe,now:local.now});
  const meta={app:'jovabook',salon_id:local.salon,jovabook_test_run:runId,fixture:'test-only'},key=phase=>({idempotencyKey:'jovabook-test-'+runId+'-'+phase});
  report.fixture_scope={salon_id:local.salon,metadata:meta,plan:'essential',cadence:'monthly'};await onProgress(report);
  async function createFixture(field,operation,invoke,valid){
   const write={operation,idempotency_key:key(operation).idempotencyKey,state:'started'};report.provider_writes.push(write);await onProgress(report);
   try{const value=await invoke(key(operation));check(valid(value),operation.replaceAll('-','_')+'_unverified');report.provider_objects[field]=value.id;write.provider_id=value.id;write.state='verified';await onProgress(report);return value;}
   catch(error){write.state='outcome_unknown';await onProgress(report);throw error;}
  }
  const action=await local.work('action_begin',{owner:local.owner,request:randomUUID(),kind:'checkout',target:'essential',cadence:'monthly',hash:hash({runId,kind:'fixture_subscription',plan:'essential'})});await monthly.acceptTerms(local.salon,action.id,'essential',MONTHLY_COMMISSION_TERMS_VERSION);
  report.phase='create_payment_method';const method=await createFixture('payment_method','payment-method',options=>stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'},metadata:meta},options),value=>id(value?.id,'pm')&&fixtureOwned(value,runId,local.salon));
  report.phase='create_customer';const customer=await createFixture('customer','customer',options=>stripe.customers.create({name:'JovaBook TEST '+runId,payment_method:method.id,invoice_settings:{default_payment_method:method.id},metadata:meta},options),value=>id(value?.id,'cus')&&fixtureOwned(value,runId,local.salon));await local.work('bind_customer',{owner:local.owner,customer:customer.id});
  const attached=await stripe.paymentMethods.retrieve(method.id);check(fixtureOwned(attached,runId,local.salon)&&objectId(attached.customer)===customer.id,'payment_method_unverified');
  report.phase='create_subscription';const subscription=await createFixture('subscription','subscription',options=>stripe.subscriptions.create({customer:customer.id,items:[{price:config.prices.essential,quantity:1}],default_payment_method:method.id,payment_behavior:'error_if_incomplete',collection_method:'charge_automatically',metadata:meta,expand:['latest_invoice']},options),value=>id(value?.id,'sub')&&fixtureOwned(value,runId,local.salon)&&objectId(value.customer)===customer.id);
  report.phase='verify_actual_payment';const paid=await verifyPayment(stripe,subscription,customer.id,subscriptionPrice(catalog,'essential'));report.provider_objects.invoice=paid.invoice.id;report.provider_objects.payment_intent=paid.paymentId;await stripe.invoices.update(paid.invoice.id,{metadata:meta},key('invoice-tag'));report.steps.push('actual TEST subscription invoice and succeeded PaymentIntent verified');
  await local.work('action_finish',{id:action.id,provider_id:subscription.id,result:{ok:true,kind:'verification_fixture'}});
  report.phase='reconcile_local_owner';await local.setClock(Date.now());const reconciled=await handlers.reconcile(await local.work('context'));check(reconciled.state?.paid_verified===true,'paid_state_unverified');
  const owner=(await local.q('select ever_paid,paid_plan,paid_cadence,paid_until from jovabook_private.billing_accounts where salon_id=$1',[local.salon])).rows[0];check(owner.ever_paid===true&&owner.paid_plan==='essential'&&owner.paid_cadence==='monthly','owner_entitlement_unverified');report.local_owner={paid_verified:true,plan:owner.paid_plan,cadence:owner.paid_cadence,paid_until:owner.paid_until};report.steps.push('production billing reconciliation grants only verified local Essential entitlement');
  report.phase='local_commission_accrual';const paidAt=paid.invoice.status_transitions?.paid_at;check(Number.isSafeInteger(paidAt),'payment_time_unverified');let occurrence=Math.ceil((Math.max(paidAt*1000,local.now())+120000)/3600000)*3600000;const day=new Date(occurrence);if(day.getUTCHours()>=23){day.setUTCDate(day.getUTCDate()+1);day.setUTCHours(9,0,0,0);occurrence=+day;}
  await local.setClock(occurrence-60000);await local.q("insert into staff(salon_id,id,name) values($1,'owner','Fictional owner')",[local.salon]);await local.q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'fixture-service','Fictional service',50,30,array['owner'])",[local.salon]);
  const date=new Date(occurrence).toISOString();await local.q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source) values($1,'fixture-booking','fixture-service','Fictional service',50,30,$2,$3,'owner','Fictional client','client@example.test','confirmed','Manual')",[local.salon,date.slice(0,10),date.slice(11,16)]);await local.setClock(occurrence+31*60000);await local.q("update bookings set status='completed' where salon_id=$1 and id='fixture-booking'",[local.salon]);
  const refreshed=await monthly.refresh(local.salon),entry=(await local.q("select amount_minor,status from jovabook_private.commission_entries where salon_id=$1 and booking_id='fixture-booking' and kind='service'",[local.salon])).rows[0];check(refreshed.ok===true&&entry?.amount_minor===50&&entry.status==='open','commission_accrual_unverified');report.local_commission={amount_pence:50,status:'open',collected:false};report.steps.push('local ledger recognizes 50p on one GBP50 fixture service from real paid-tier history; no commission invoice created');
  report.phase='schedule_cancellation';const response=await handlers.cancel(local.request({salon_id:local.salon,request_id:randomUUID()}));check(response.status===200,'cancellation_unverified');const cancelled=await stripe.subscriptions.retrieve(subscription.id);check(cancelled.cancel_at_period_end===true&&fixtureOwned(cancelled,runId,local.salon),'cancellation_unverified');report.steps.push('production cancellation handler schedules period-end cancellation and reconciles it locally');report.status='passed';delete report.phase;
 }catch(error){report.error=safeError(error);}
 finally{
  report.cleanup=await cleanupFixtures(stripe,report.provider_objects,runId,local?.salon);
  const unknown=report.provider_writes.filter(write=>write.state==='outcome_unknown'&&!write.provider_id);
  if(unknown.length)report.cleanup={...report.cleanup,known_object_cleanup:report.cleanup.status,status:'manual_review_unknown_creation',unknown_operations:unknown.map(write=>({operation:write.operation,idempotency_key:write.idempotency_key})),message:'Do not rerun with a new run ID until these request outcomes are reconciled in the expected sandbox.'};
  if(!['not_needed','cancelled_and_customer_deleted'].includes(report.cleanup.status))report.status='failed';
  try{await onProgress(report);}finally{await local?.close();}
 }
 return report;
}
export async function runCli(args=process.argv.slice(2),{env=process.env,print=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n')}={}){
 try{
  const options=parseArguments(args);validateEnvironment(env);let report;
  if(options.command==='preflight'){const local=await createLocalLedger(randomUUID());try{report={status:'passed',command:'preflight',network_requests:0,provider_mutations:0,source_files:SOURCE_FILES.length,database:'ephemeral PGlite',clock:'fixture-only; no source files changed',coverage_gaps:[...GAPS]};}finally{await local.close();}}
  else{const config=validateEnvironment(env,true),stripe=createTestStripe(config,options.confirmed);if(options.command==='catalog'){await verifyCatalog(stripe,config);report={status:'passed',command:'catalog',provider_mutations:0,mode:'test',coverage_gaps:[...GAPS]};}else{const runId=randomUUID(),directory=path.join(ROOT,'.jovabook-test','stripe');report=await runVerification(stripe,config,{runId,transport:'real-stripe-sdk',confirmed:true,onProgress:receiptWriter(directory,runId)});await fs.writeFile(path.join(directory,report.run_id+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',flush:true});}}
  print(report);return report;
 }catch(error){const report={status:'failed',error:safeError(error)};print(report);return report;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCli().then(report=>{if(report.status!=='passed')process.exitCode=1;});
