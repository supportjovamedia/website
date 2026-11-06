import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap,OMITTED_SOURCE_FILES} from '../scripts/jovabook-test-db.mjs';

const browser={};vm.runInNewContext(await readFile(new URL('../booking-demo/business-locale.js',import.meta.url),'utf8'),browser);
const locale=browser.JovaBusinessLocale;
const hours={start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]};

test('international database migration preserves local booking and payment contracts',async t=>{
 const db=new PGlite();
 const q=async(sql,args)=>{try{return await db.query(sql,args);}catch(error){throw Error(error.message,{cause:{code:error.code}});}};
 const scalar=async(sql,args)=>(await q(sql,args)).rows[0].value;
 async function business(settings={}){
  const owner=randomUUID(),id=randomUUID(),slug='fixture-'+id.slice(0,8),email='owner-'+id.slice(0,8)+'@example.test';
  await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[owner,email]);
  await q("insert into public.salons(id,owner_id,name,slug,owner_name,email,email_norm,status,settings) values($1,$2,'Fictional International Studio',$3,'Test Owner',$4,$4,'active',$5)",[id,owner,slug,email,JSON.stringify({hours,color:'#77504e',...settings})]);
  await q("insert into public.staff(salon_id,id,name,role) values($1,'owner','Test Owner','Owner')",[id]);
  await q("insert into public.services(salon_id,id,name,price,duration,staff_ids) values($1,'service','Test service',25,30,array['owner'])",[id]);
  return {id,owner,slug};
 }
 try{
  try{await bootstrap(db,await sources());}catch(error){throw Error('Migration bootstrap failed: '+error.message);}
  const us=await business();
  await t.test('legacy settings have UK defaults and the unchanged onboarding RPC accepts new locale keys',async()=>{
   const old=await scalar("select settings as value from public.salons where id=$1",[us.id]);
   assert.equal(old.country,'GB');assert.equal(old.timezone,'Europe/London');assert.equal(old.currency,'GBP');
   await q("select set_config('request.jwt.claim.sub',$1,false)",[us.owner]);await db.exec('set role authenticated');
   const access=await scalar('select public.owner_account_access() as value');
   assert.equal(access.access,'setup');assert.equal(access.setup.country,'GB');assert.equal(access.setup.timezone,'Europe/London');
   await q('select public.save_setup($1,$2,$3)',['123 Test Street','+12125550123',JSON.stringify({hours,color:'#77504e',country:'US',timezone:'America/New_York',currency:'USD'})]);
   await q('select public.save_setup($1,$2,$3)',['123 Test Street','+12125550123',JSON.stringify({hours,color:'#77504e'})]);
   await db.exec('reset role');
   const saved=await scalar('select settings as value from public.salons where id=$1',[us.id]);
   assert.equal(saved.country,'US');assert.equal(saved.timezone,'America/New_York');assert.equal(saved.currency,'USD');
  });

  await t.test('server country-zone and service-currency validation matches the browser choices',async()=>{
   assert.deepEqual(Object.keys(locale.countries).sort(),['GB','US']);
   for(const [country,zones] of Object.entries(locale.zones))for(const zone of zones){
    assert.equal(await scalar('select jovabook_private.locale_valid($1,$2,$3) as value',[country,zone,locale.countries[country].currency]),true,country+':'+zone);
   }
   for(const values of [['US','America/Sao_Paulo','USD'],['CA','America/Toronto','USD'],['AU','Australia/Sydney','USD'],['DE','Europe/Berlin','EUR'],['GB','Europe/London','EUR']]){
    assert.equal(await scalar('select jovabook_private.locale_valid($1,$2,$3) as value',values),false,values.join('/'));
   }
   await assert.rejects(q("update public.salons set settings=settings||'{\"country\":\"US\",\"timezone\":\"America/Sao_Paulo\"}' where id=$1",[us.id]),/supported business country/);
  });

  await t.test('DST gaps, folds and intervals crossing an offset change are refused',async()=>{
   for(const [date,time,zone] of [['2027-03-14','02:30','America/New_York'],['2027-11-07','01:30','America/New_York'],['2027-03-28','01:30','Europe/London'],['2027-10-31','01:30','Europe/London']]){
    assert.equal(await scalar('select jovabook_private.business_instant($1,$2,$3) as value',[date,time,zone]),null,[date,time,zone].join(' '));
   }
   assert.equal(await scalar("select public.slot_free($1,'owner','2027-03-14','02:00',30,null) as value",[us.id]),false);
   assert.equal(await scalar("select public.slot_free($1,'owner','2027-03-14','01:30',120,null) as value",[us.id]),false);
   assert.equal(await scalar("select public.slot_free($1,'owner','2027-03-14','10:00',30,null) as value",[us.id]),true);
   const cases=[['2027-03-07','12:00','America/New_York','2027-03-07T17:00:00.000Z'],['2027-03-14','12:00','America/New_York','2027-03-14T16:00:00.000Z'],['2027-03-14','12:00','Europe/London','2027-03-14T12:00:00.000Z'],['2027-03-28','12:00','Europe/London','2027-03-28T11:00:00.000Z'],['2027-01-15','10:00','America/Phoenix','2027-01-15T17:00:00.000Z'],['2027-07-15','10:00','America/Phoenix','2027-07-15T17:00:00.000Z'],['2027-01-15','10:00','Pacific/Honolulu','2027-01-15T20:00:00.000Z']];
   for(const [date,time,zone,want] of cases){const actual=await scalar('select jovabook_private.business_instant($1,$2,$3) as value',[date,time,zone]);assert.equal(actual.toISOString(),want);}
  });

  await t.test('booking windows use the business date and expose the authoritative UTC offset',async()=>{
   const bounds=await scalar("select jovabook_private.online_booking_window($1,'2027-01-01T00:30:00Z') as value",[us.id]);
   assert.equal(bounds.today,'2026-12-31');assert.equal(bounds.timezone,'America/New_York');assert.equal(bounds.utc_offset_minutes,-300);
   const pacific=await business({country:'US',timezone:'America/Los_Angeles',currency:'USD'});
   const local=await scalar("select jovabook_private.online_booking_window($1,'2027-01-01T00:30:00Z') as value",[pacific.id]);
   assert.equal(local.today,'2026-12-31');assert.equal(local.utc_offset_minutes,-480);
  });

  await t.test('committed bookings snapshot trusted email locale and prevent later reinterpretation',async()=>{
   const date=await scalar("select ((now() at time zone 'America/New_York')::date+14)::text as value");
   const booking=await scalar("select public.create_booking($1,'service','owner',$2,'10:00','Test Customer','customer@example.test','','','Card') as value",[us.slug,date]);
   assert.equal(booking.ok,true,JSON.stringify(booking));
   const payload=await scalar("select payload as value from jovabook_private.email_queue where salon_id=$1 and kind='confirmed' and audience='customer' order by created_at limit 1",[us.id]);
   assert.equal(payload.timezone,'America/New_York');assert.equal(payload.currency,'USD');assert.equal(payload.country,'US');
   const reminder=await scalar("select due_at as value from jovabook_private.email_queue where salon_id=$1 and kind='reminder' limit 1",[us.id]);
   const start=await scalar("select jovabook_private.business_instant($1,'10:00','America/New_York') as value",[date]);
   assert.equal(start.getTime()-reminder.getTime(),86400000);
   assert.equal(await scalar("select public.slot_free($1,'owner',$2,'10:00',30,null) as value",[us.id,date]),false);
   for(const change of [{timezone:'America/Los_Angeles'},{currency:'GBP'},{country:'GB',timezone:'Europe/London'}])await assert.rejects(q('update public.salons set settings=settings||$2::jsonb where id=$1',[us.id,JSON.stringify(change)]),/locked after appointments/);
   const portal=await scalar('select public.public_salon($1) as value',[us.slug]);assert.equal(portal.settings.currency,'USD');
  });

  await t.test('paid service deposit minimums follow currency while the Free plan stays deposit-free',async()=>{
   for(const [country,timezone,currency,min] of [['GB','Europe/London','GBP',30],['US','America/New_York','USD',50]]){
    const b=await business({country,timezone,currency});
    await q("update jovabook_private.offer_accounts set plan='standard',provider_status='active',paid_until=now()+interval '30 days' where salon_id=$1",[b.id]);
    await q("update public.salons set payments='{\"enabled\":true,\"deposit_percent\":100}' where id=$1",[b.id]);
    assert.equal(await scalar('select jovabook_private.online_deposit_pence($1,$2) as value',[b.id,(min-1)/100]),0);
    assert.equal(await scalar('select jovabook_private.online_deposit_pence($1,$2) as value',[b.id,min/100]),min);
    assert.equal(await scalar('select jovabook_private.service_currency($1) as value',[b.id]),currency.toLowerCase());
    await q("update jovabook_private.offer_accounts set plan='essential' where salon_id=$1",[b.id]);
    assert.equal(await scalar('select jovabook_private.online_deposit_pence($1,25) as value',[b.id]),0);
   }
  });

  await t.test('private locale and deposit internals remain unavailable to public callers',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(q("select jovabook_private.locale_valid('US','America/New_York','USD')"),/permission denied/);
    await assert.rejects(q('select * from jovabook_private.deposit_checkouts'),/permission denied/);
    await assert.rejects(q('select jovabook_private.international_before_save_setup($1,$2,$3)',['Test address','+12125550123',JSON.stringify({hours,color:'#77504e'})]),/permission denied/);
    await db.exec('reset role');
   }
   assert(OMITTED_SOURCE_FILES.includes('migrations/20261105211920_skip_idle_funnel_and_report_message_topups.sql'));
   const raw=await readFile(new URL('../booking-demo/supabase/migrations/20261106170125_international_business_locale.sql',import.meta.url),'utf8');
   assert.doesNotMatch(raw,/add column units|international_release_sms_units|set enabled=true/);
  });

  await t.test('hosted checkout and capture preserve each trusted service currency',async()=>{
   const token='a'.repeat(64),worker=(action,payload={})=>scalar('select public.booking_deposit_worker($1,$2,$3) as value',[token,action,JSON.stringify(payload)]);
   await q("update jovabook_private.customer_config set payments_enabled=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
   for(const [country,timezone,currency] of [['GB','Europe/London','GBP'],['US','America/New_York','USD']]){
    const b=await business({country,timezone,currency}),account='acct_'+country,provider='cs_test_'+country;
    await q("update jovabook_private.offer_accounts set plan='standard',provider_status='active',paid_until=now()+interval '30 days' where salon_id=$1",[b.id]);
    await q("update public.salons set status='active',plan='standard' where id=$1",[b.id]);
    await q("insert into jovabook_private.business_integrations(salon_id,provider,encrypted,summary) values($1,'stripe','{\"v\":1}',jsonb_build_object('connection_method','provider_login','account_id',$2::text))",[b.id,account]);
    await worker('owner_verify',{salon_id:b.id,user_id:b.owner,account_id:account,ready:true});
    await worker('owner_save',{salon_id:b.id,user_id:b.owner,deposit_percent:40});
    const quote=await worker('quote',{slug:b.slug});assert.equal(quote.currency,currency.toLowerCase());
    const date=await scalar('select ((now() at time zone $1)::date+14)::text as value',[timezone]);
    const request={slug:b.slug,request_id:randomUUID(),verifier_hash:'b'.repeat(64),network_hash:'c'.repeat(64),service_id:'service',staff_id:'owner',date,time:'12:00',name:'Test Customer',email:'deposit@example.test',phone:'',notes:'',currency:'gbp'};
    const hold=await worker('begin',request);assert.equal(hold.currency,currency.toLowerCase());assert.equal(hold.amount,1000);
    assert.equal((await worker('begin',request)).id,hold.id);
    await worker('attach',{id:hold.id,account_id:account,provider_id:provider,url:'https://checkout.stripe.com/c/pay/fixture'});
    const proof={id:hold.id,account_id:account,provider_id:provider,payment_intent:'pi_'+country,amount:1000,currency:currency.toLowerCase(),captured_at:Math.floor(Date.now()/1000)};
    await assert.rejects(worker('paid',{...proof,currency:'eur'}),/proof mismatch/);
    const paid=await worker('paid',proof);assert.equal(paid.booking.status,'confirmed');
    assert.equal(await scalar('select currency as value from jovabook_private.customer_deposits where salon_id=$1 and booking_id=$2',[b.id,hold.booking_id]),currency.toLowerCase());
   }
  });

  await t.test('fresh and cached SMS preparations carry only the trusted business identifier',async()=>{
   const b=await business(),token='d'.repeat(64),worker=(action,payload={})=>scalar('select public.booking_sms_worker($1,$2,$3) as value',[token,action,JSON.stringify(payload)]);
   await q("update jovabook_private.offer_accounts set plan='standard',provider_status='active',paid_until=now()+interval '30 days' where salon_id=$1",[b.id]);
   await q("update public.salons set status='active',plan='standard' where id=$1",[b.id]);
   await q("update jovabook_private.sms_config set enabled=true,provider_configured=true,sender='JovaBook',monthly_segment_limit=1000,max_segments_per_message=3,worker_token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
   await q("update jovabook_private.sms_business_settings set enabled=true,monthly_segment_limit=1000,max_segments_per_message=3,message_template=$2 where salon_id=$1",[b.id,'{business}: {time}, {date} ({timezone}). '+ 'x'.repeat(180)]);
   await q("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,phone,status,source,sms_consent) values($1,'sms-client-tag','service','Test service',25,30,((date_trunc('hour',now())+interval '2 hours') at time zone 'Europe/London')::date,to_char((date_trunc('hour',now())+interval '2 hours') at time zone 'Europe/London','HH24:MI'),'owner','Test Customer','sms@example.test','+447700900123','confirmed','Online',true)",[b.id]);
   const jobs=await worker('claim');assert.equal(jobs.length,1);
   const job=jobs[0],prepared=await worker('prepare',{...job,salon_id:us.id});assert.equal(prepared.salon_id,b.id);
   assert.match(prepared.content,/Europe\/London/);assert.doesNotMatch(prepared.content,/\{timezone\}/);
   await q("update jovabook_private.sms_queue set provider_payload=provider_payload-'salon_id' where id=$1",[job.id]);
   const cached=await worker('prepare',job);assert.equal(cached.salon_id,b.id);
   const begun=await worker('begin',{...job,salon_id:us.id});assert.equal(begun.salon_id,b.id);
   assert(Number(await scalar('select segments as value from jovabook_private.sms_queue where id=$1',[job.id]))>1);
   assert.equal(await scalar("select count(*)::int as value from jovabook_private.offer_message_usage where salon_id=$1 and channel='sms' and job_id=$2",[b.id,job.id]),1);
   await worker('finish',{...job,state:'Unknown'});
   assert.equal(await scalar("select count(*)::int as value from jovabook_private.offer_message_usage where salon_id=$1 and channel='sms' and job_id=$2",[b.id,job.id]),1);
   await q("insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,phone,status,source,sms_consent) values($1,'sms-unavailable','service','Test service',25,30,((date_trunc('hour',now())+interval '3 hours') at time zone 'Europe/London')::date,to_char((date_trunc('hour',now())+interval '3 hours') at time zone 'Europe/London','HH24:MI'),'owner','Test Customer','unavailable@example.test','+447700900123','confirmed','Online',true)",[b.id]);
   const blocked=(await worker('claim'))[0];assert(blocked);
   const reserved=await scalar("select reserved_segments as value from jovabook_private.sms_usage where scope='global' order by month desc limit 1");
   await worker('prepare',blocked);
   assert.equal(await worker('unavailable',{...blocked,lease:randomUUID()}),null);
   await assert.rejects(scalar('select public.booking_sms_worker($1,$2,$3) as value',['wrong','unavailable',JSON.stringify(blocked)]),/Invalid SMS worker credentials/);
   assert.deepEqual(await worker('unavailable',blocked),{ok:true,cancelled:true});
   assert.equal(await worker('unavailable',blocked),null);
   const state=(await q('select status,attempted,last_error from jovabook_private.sms_queue where id=$1',[blocked.id])).rows[0];
   assert.equal(state.status,'Cancelled');assert.equal(state.attempted,false);assert.match(state.last_error,/sender is not ready/);
   assert.equal(await scalar("select reserved_segments as value from jovabook_private.sms_usage where scope='global' order by month desc limit 1"),reserved);
   assert.equal(await scalar("select count(*)::int as value from jovabook_private.offer_message_usage where salon_id=$1 and channel='sms' and job_id=$2",[b.id,blocked.id]),0);
   assert.equal(await scalar("select count(*)::int as value from jovabook_private.message_credit_use where salon_id=$1 and channel='sms' and job_id=$2",[b.id,blocked.id]),0);
  });

  await t.test('optional time-zone token preserves legacy templates and counts the rendered parts',async()=>{
   const old='{business}: {time}, {date}.',modern='{business}: {time}, {date} ({timezone}).';
   assert.equal(await scalar('select jovabook_private.sms_template_valid($1) as value',[old]),true);
   assert.equal(await scalar('select jovabook_private.sms_template_valid($1) as value',[modern]),true);
   assert.equal(await scalar('select jovabook_private.sms_template_valid($1) as value',[modern+' {secret}']),false);
   const legacy=await scalar("select jovabook_private.sms_render_message($1,'Test Studio','','2027-01-15','10:00') as value",[old]);
   const same=await scalar("select jovabook_private.sms_render_message($1,'Test Studio','','2027-01-15','10:00','America/New_York') as value",[old]);
   assert.equal(same,legacy);assert.doesNotMatch(same,/America/);
   const next=await scalar("select jovabook_private.sms_render_message($1,'Test Studio','','2027-01-15','10:00','America/New_York') as value",[modern]);
   assert.match(next,/America\/New_York/);
   const columns=(await q("select column_name from information_schema.columns where table_schema='jovabook_private' and table_name in('offer_message_usage','message_credit_use') and column_name='units'")).rows;
   assert.deepEqual(columns,[]);
  });
 }finally{await db.close();}
});
