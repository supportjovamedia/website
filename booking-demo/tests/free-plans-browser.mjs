/* No auth, payment, email or SMS request can leave this local intercepted proof. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.resolve(root,'../output/free-plans');
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,name==='/'?'index.html':'.'+name);assert(file.startsWith(root+path.sep));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,sid='20000000-0000-4000-8000-000000000001',uid='30000000-0000-4000-8000-000000000001',version='2026-11-free-v1';
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});await mkdir(out,{recursive:true});
const results=[];
async function fixture(width){
 const context=await browser.newContext({viewport:{width,height:900}}),calls=[],errors=[];
 const access={ok:true,access:'active',reason:'free_or_paid_plan',server_now:new Date().toISOString(),full_until:null,business:{id:sid,name:'Offer QA Business',slug:'offer-qa',plan:'essential',status:'active'},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{offer_version:version,connected:true,canCheckout:true,annual_supported:true,cadence:'monthly',seats:1,booking_limit:20,bookings_used:0,email_limit:50,emails_used:0,sms_limit:0,sms_used:0,commission_bps:0,card_required:false,trial_eligible:true,embed_allowed:false},staff_limit:1};
 const salon={id:sid,owner_id:uid,name:access.business.name,slug:'offer-qa',plan:'essential',status:'active',email:'business@example.test',phone:'02079460123',address:'Fixture High Street',settings:{seeded:true,hours:{start:'09:00',end:'18:00',days:[1,2,3,4,5]}},payments:{}};
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===base&&!url.pathname.startsWith('/api/'))return route.continue();calls.push({path:url.pathname,method:req.method(),body:req.postData()});
  const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return send({});
  if(url.pathname.startsWith('/storage/v1/object/public/'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=','base64')});
  if(url.pathname==='/api/jovabook/billing/status'||url.pathname==='/rest/v1/rpc/owner_account_access')return send(access);
  if(url.pathname==='/api/jovabook/billing/checkout')return send({ok:true,kind:'checkout',url:'https://checkout.stripe.com/c/pay/offer-fixture'});
  if(url.pathname==='/api/jovabook/billing/cancel'){access.billing.cancel_at_period_end=true;return send({ok:true,kind:'cancellation_scheduled',effective_at:access.billing.trial_ends_at});}
  if(url.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<h1>Mock secure card trial</h1>'});
  if(url.pathname==='/auth/v1/token')return send({access_token:'qa-only',refresh_token:'qa-refresh',expires_at:Date.now()/1000+3600,user:{id:uid,email:'owner@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'}});
  if(url.pathname==='/auth/v1/logout')return send({});
  if(url.pathname==='/rest/v1/salons')return send([salon]);
  if(url.pathname==='/rest/v1/rpc/owner_capabilities')return send({version:1,offer_version:version,plan:access.business.plan,staff_limit:access.staff_limit,per_day_hours:true,booking_series:true,...access.billing});
  if(url.pathname==='/rest/v1/rpc/public_salon')return send({...salon,offer_version:version,branding_required:salon.plan!=='premium',embed_allowed:salon.plan!=='essential',website_entitlement:'one-page',services:[],staff:[{id:'owner',name:'Fixture owner',active:true}],busy:[],categories:[]});
  if(url.pathname==='/rest/v1/rpc/save_salon'){salon.settings={...salon.settings,...req.postDataJSON().p_settings};return send(null);}
  if(url.pathname==='/rest/v1/rpc/save_setup'){access.access='active';access.business.status='active';salon.status='active';return send(null);}
  if(url.pathname==='/rest/v1/staff')return send([{salon_id:sid,id:'owner',name:'Fixture owner',active:true,color:'#235789'}]);
  if(url.pathname.startsWith('/rest/v1/rpc/'))return send({});if(url.pathname.startsWith('/rest/v1/'))return send([]);
  return send({ok:false},403);
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 async function login(expected='dashboard'){await page.goto(base+'/#login');await page.locator('[name=email]').fill('owner@example.test');await page.locator('[name=password]').fill('Fixture2026');await page.locator('[data-form=login] button.primary').click();await expect(page).toHaveURL(new RegExp('#'+expected+'$'));}
 return {context,page,access,salon,calls,errors,login};
}
try{
 for(const width of [320,390,1440]){
  const f=await fixture(width);try{
   await f.login();await f.page.goto(base+'/#billing');await expect(f.page.locator('[data-offer-version]')).toHaveAttribute('data-offer-version',version);
   await expect(f.page.getByRole('heading',{name:'Your plan',exact:true})).toBeVisible();
   await expect(f.page.getByRole('heading',{name:'Starter',exact:true})).toHaveCount(2);
   if(width===390){await f.page.goto(base+'/#scheduling');await f.page.getByRole('tab',{name:'Booking page',exact:true}).click();await f.page.getByText('More page options',{exact:true}).click();await expect(f.page.locator('[data-ws-copy=embed]')).toHaveCount(0);await f.page.goto(base+'/#billing');}
   await expect(f.page.locator('input[name*=card]')).toHaveCount(0);assert(!f.calls.some(c=>c.path.endsWith('/billing/checkout')));
   await expect(f.page.getByRole('button',{name:'Cancel subscription',exact:true})).toHaveCount(0);
   const team=f.page.getByRole('region',{name:'Pro Team plan',exact:true});
   await team.locator('[data-change=offer-seats]').fill('3');await team.locator('[data-change=offer-seats]').press('Tab');
   await f.page.getByRole('button',{name:'Yearly, save 20%',exact:true}).click();await expect(f.page.getByRole('region',{name:'Pro Team plan',exact:true})).toContainText('£355.20');
   await f.page.screenshot({path:path.join(out,'dashboard-'+width+'.png'),fullPage:true});
   assert(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const pro=f.page.getByRole('region',{name:'Pro Solo plan',exact:true});await pro.getByRole('button',{name:'Start 14-day trial'}).click();
   await expect(f.page.locator('[data-form=offer-confirm]')).toContainText('14 days free. Card required.');await expect(f.page.locator('[data-form=offer-confirm]')).toContainText('£192.00 per year');
   const request=f.page.waitForRequest(r=>new URL(r.url()).pathname==='/api/jovabook/billing/checkout');await f.page.locator('[data-form=offer-confirm] button.primary').click();const body=(await request).postDataJSON();assert.equal(body.plan,'standard');assert.equal(body.cadence,'annual');assert.equal(body.seats,1);assert(!('trial_days' in body));
   await expect(f.page.getByRole('heading',{name:'Mock secure card trial'})).toBeVisible();assert.deepEqual(f.errors,[]);results.push({width,passed:true});
  }finally{await f.context.close();}
 }
 const f=await fixture(390);try{
  f.access.business.plan='standard';f.access.billing={...f.access.billing,trial_eligible:false,trial_subscription:true,trial_ends_at:new Date(Date.now()+14*86400000).toISOString(),email_limit:100,sms_limit:50,embed_allowed:true};f.salon.plan='standard';
  await f.login();await f.page.goto(base+'/#billing');await expect(f.page.getByRole('button',{name:'Cancel subscription',exact:true})).toBeVisible();await expect(f.page.getByRole('heading',{name:'Bookings on your own website'})).toBeVisible();
  await f.page.getByRole('button',{name:'Cancel subscription',exact:true}).click();const request=f.page.waitForRequest(r=>new URL(r.url()).pathname==='/api/jovabook/billing/cancel');await f.page.locator('[data-form=offer-confirm] button.primary').click();await request;await expect(f.page.getByText(/Subscription ends/)).toBeVisible();assert.deepEqual(f.errors,[]);results.push({dashboardCancellation:true,passed:true});
 }finally{await f.context.close();}
 const setup=await fixture(390);try{
  setup.access.access='setup';setup.access.business.status='setup';setup.salon.status='setup';setup.salon.settings.seeded=false;
  await setup.login('setup');await setup.page.locator('[name=address]').fill('24 Fixture Street');await setup.page.locator('[name=phone]').fill('02079460123');await setup.page.locator('[data-form=setup] button.primary').click();await expect(setup.page).toHaveURL(/#dashboard$/);assert(!setup.calls.some(c=>c.path.endsWith('/billing/checkout')));assert.deepEqual(setup.errors,[]);results.push({starterSetupWithoutCard:true,passed:true});
 }finally{await setup.context.close();}
 for(const plan of ['essential','premium']){const pub=await fixture(390);try{
  pub.salon.plan=plan;pub.access.business.plan=plan;pub.access.billing.branding_required=plan!=='premium';pub.salon.settings.workspace={website:{headline:'Fixture Studio',about:'Our business details.',homeIntro:'A Team introduction',aboutHeading:'Meet our team',logoImage:'https://rffsulstatmwzvrdgvec.supabase.co/storage/v1/object/public/jovabook-website-images/'+sid+'/40000000-0000-4000-8000-000000000001.png'}};
  await pub.page.goto(base+'/?salon=offer-qa#website');await expect(pub.page.locator('.bw-site')).toBeVisible();await expect(pub.page.locator('.bw-logo')).toHaveAttribute('alt','Offer QA Business');await expect(pub.page.locator('.bw-public-footer')).toContainText('Offer QA Business');
  if(plan==='premium'){await expect(pub.page.getByText('Powered by JovaBook',{exact:true})).toHaveCount(0);await expect(pub.page.getByRole('heading',{name:'Meet our team'})).toBeVisible();}else await expect(pub.page.getByText('Powered by JovaBook',{exact:true})).toBeVisible();
  assert(await pub.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await pub.page.screenshot({path:path.join(out,'public-'+plan+'.png'),fullPage:true});assert.deepEqual(pub.errors,[]);results.push({publicWebsite:plan,passed:true});
 }finally{await pub.context.close();}}
 const payment=await browser.newContext();try{
  const script=await readFile(path.join(root,'deposits.js'),'utf8'),verifierCalls=[];
  await payment.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.pathname==='/api/jovabook/deposits/start'){const body=route.request().postDataJSON();assert.equal(body.embedded,true);verifierCalls.push(body);return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,id:'hold-fixture',stage:'pending',url:'https://checkout.stripe.com/c/pay/popup-fixture'})});}
   if(url.pathname==='/api/jovabook/deposits/status'){const body=route.request().postDataJSON();assert.equal(body.id,'hold-fixture');assert.equal(body.verifier,verifierCalls[0].verifier);return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,stage:'paid',booking:{id:'booking-fixture',status:'confirmed'}})});}
   if(url.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<script>location.replace("https://www.jovamedia.com/api/jovabook/booking/fixture#book/deposit")</script>'});
   assert.equal(url.hostname,'www.jovamedia.com');const returned=url.pathname.includes('/booking/');
   return route.fulfill({contentType:'text/html',body:'<html><body><button id="pay">Pay deposit</button><div id="result"></div><script>window.JOVA_EMBED_SLUG="fixture";window.JOVA_STANDALONE_BOOKING='+returned+';'+script+'</script><script>const api={salon:()=>({id:"fixture",slug:"fixture"}),esc:String,money:String,isLive:()=>true,ownerIdentity:()=>"",isPublic:()=>true,goDeposit:()=>{},depositConfirmed:()=>document.getElementById("result").textContent="Booking confirmed",render:()=>{if(!document.getElementById("result").textContent)deposit.pending();}};const deposit=JovaDeposits.create(api);document.getElementById("pay").onclick=()=>deposit.start({serviceId:"visit",date:"2026-11-20",time:"10:00",name:"Fixture",email:"fixture@example.test"});'+(returned?'deposit.pending();':'')+'</script></body></html>'});
  });
  const p=await payment.newPage();await p.goto('https://www.jovamedia.com/api/jovabook/embed/fixture');const opened=p.waitForEvent('popup');await p.getByRole('button',{name:'Pay deposit'}).click();const popup=await opened;await expect(popup.locator('#result')).toHaveText('Booking confirmed');assert.equal(verifierCalls.length,1);assert.equal(await popup.evaluate(()=>window.opener),null);results.push({embeddedDepositPopupAndReturn:true,passed:true});
 }finally{await payment.close();}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'dashboard-report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}
