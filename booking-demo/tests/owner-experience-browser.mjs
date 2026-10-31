/** Integrated owner experience proof. No external requests are forwarded.
 * PLAYWRIGHT_MODULE optionally points to an existing @playwright/test package.
 * BASE_URL uses an existing local preview; otherwise starts this checkout on 4317.
 * BOOKING_QA_DIR defaults to booking-demo/test-results/owner-experience.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';

const require=createRequire(import.meta.url),demo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.BOOKING_QA_DIR||path.join(demo,'test-results/owner-experience'));
const base=process.env.BASE_URL||'http://127.0.0.1:4317',origin=new URL(base).origin,KEY='jovabook-essential-demo-v2';
assert(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname),'Only a local preview is allowed');
const report={startedAt:new Date().toISOString(),baseURL:base,configuration:'Real config.js loaded, every external request intercepted',tests:[],screenshots:[],pageErrors:[],blockedRequests:[],mockRequests:[],limitations:[]};
let browser,context,page,baseline,server,currentTest='initialization';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clone=value=>structuredClone(value);
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return key(d);};
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const future=(weekday,weeks=2)=>{let date=plus(key(new Date()),weeks*7);while(new Date(date+'T12:00:00').getDay()!==weekday)date=plus(date,1);return date;};
const selected=state=>state.salons.find(s=>s.id===state.active);
async function sourceHashes(){const files=(await readdir(demo)).filter(file=>/\.(js|css)$/.test(file)||['index.html','server.mjs'].includes(file)).sort();files.push('tests/owner-experience-browser.mjs');return Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(path.join(demo,file))).digest('hex')])));}
function playwright(){for(const name of [process.env.PLAYWRIGHT_MODULE,'@playwright/test'].filter(Boolean)){try{return require(name);}catch{}}throw Error('Set PLAYWRIGHT_MODULE to an installed @playwright/test package.');}
async function ready(){try{return /JovaBook|JovaMedia|Jova Media/.test(await fetch(base,{signal:AbortSignal.timeout(1200)}).then(r=>r.text()));}catch{return false;}}
async function start(){
 if(await ready()){assert(await fetch(new URL('/app.js',base)).then(r=>r.text())===await readFile(path.join(demo,'app.js'),'utf8'),'Existing server belongs to a different checkout');report.server='existing';return;}
 assert(!process.env.BASE_URL,'BASE_URL is not serving a local preview');server=spawn(process.execPath,['server.mjs'],{cwd:demo,windowsHide:true,stdio:'ignore'});
 for(let i=0;i<40;i++){if(await ready()){report.server='spawned';return;}if(server.exitCode!==null)break;await sleep(150);}throw Error('Local preview did not start');
}
async function newContext(mock){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await ctx.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['http:','https:'].includes(url.protocol)||url.origin===origin)return route.continue();
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Credentials':'true'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(mock){const response=await mock(request,url);if(response){report.mockRequests.push({test:currentTest,method:request.method(),path:url.pathname});return route.fulfill({headers,contentType:'application/json',status:response.status||200,body:JSON.stringify(response.body??null)});}}
  report.blockedRequests.push({test:currentTest,method:request.method(),url:url.origin+url.pathname});
  return route.fulfill({status:403,headers,contentType:'application/json',body:JSON.stringify({message:'External network disabled during local QA'})});
 });
 return ctx;
}
async function attach(ctx){const p=await ctx.newPage();p.setDefaultTimeout(7000);p.on('pageerror',error=>report.pageErrors.push({test:currentTest,message:String(error)}));return p;}
async function go(route){await closeModal();await page.goto(`${base}/#${route}`);await page.locator('#app h1').first().waitFor();}
async function closeModal(){const close=page?.getByRole('button',{name:'Close dialog',exact:true});if(close&&await close.count())await close.click();}
async function storage(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function salon(){return selected(await storage());}
async function fixture(mutate,route='calendar'){
 const state=clone(baseline);if(mutate)mutate(selected(state),state);
 await closeModal();await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.removeItem('jovabook-auth');},{key:KEY,state});
 await page.reload();await go(route);
}
async function shot(name){
 const filename=name+'.png';await page.screenshot({path:path.join(output,filename),fullPage:true,animations:'disabled'});
 const b=await readFile(path.join(output,filename)),chunks=[];for(let p=8;p+12<=b.length;p+=b.readUInt32BE(p)+12)chunks.push(b.toString('ascii',p+4,p+8));
 report.screenshots.push({filename,route:new URL(page.url()).hash,width:page.viewportSize().width,modalOpen:await page.getByRole('dialog').count()>0,metadataChunks:[...new Set(chunks.filter(t=>['eXIf','iTXt','tEXt','zTXt','caBX'].includes(t)))]});
}
async function noOverflow(label){const size=await page.evaluate(()=>({viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(size.html<=size.viewport+1&&size.body<=size.viewport+1,`${label} overflow: ${JSON.stringify(size)}`);}
async function run(name,task){
 currentTest=name;const start=Date.now(),errorIndex=report.pageErrors.length;const result={name,status:'passed'};
 try{await fixture();await task();assert.equal(report.pageErrors.length,errorIndex,'Browser exception');}
 catch(error){result.status='failed';result.error=String(error.stack||error);process.exitCode=1;}
 result.durationMs=Date.now()-start;try{await closeModal();await shot(name.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}catch(error){result.screenshotError=String(error);}
 report.tests.push(result);console.log(`${result.status.toUpperCase()} ${name}${result.error?'\n'+result.error:''}`);
}
async function login(email='demo@jovamedia.com',password='Salon2026'){
 await go('login');const form=page.locator('[data-form="login"]');await form.locator('[name="email"]').fill(email);await form.locator('[name="password"]').fill(password);await form.locator('button.primary').click();
}
function weekly(open={}){return {weekly:Object.fromEntries(Array.from({length:7},(_,day)=>[String(day),open[day]?{closed:false,start:open[day][0],end:open[day][1]}:{closed:true,start:'09:00',end:'17:00'}]))};}
function teamFixture(s,count=2,plan='Standard'){
 s.subscription.plan=plan;s.subscription.status='active';s.entitlements={plan:plan.toLowerCase(),staff_limit:plan==='Premium'?10:plan==='Standard'?5:1};
 const member=clone(s.staff[0]);s.staff=Array.from({length:count},(_,i)=>({...clone(member),id:i?'qa-staff-'+i:member.id,name:i?'QA Team '+i:member.name,active:true,hours:null}));
 s.services.forEach(service=>service.staffIds=s.staff.map(m=>m.id));
}
async function serviceTime(date,serviceId){await go('book/service');const card=serviceId?page.locator(`[data-action="select-service"][data-id="${serviceId}"]`):page.locator('[data-action="select-service"]').first();await card.click();await page.locator('[data-change="booking-date"]').fill(date);await page.locator('[data-change="booking-date"]').dispatchEvent('change');}
async function setDay(form,day,closed,start='09:00',end='17:00'){
 await form.locator(`[name="day_${day}_closed"]`).setChecked(closed);
 if(!closed){await form.locator(`[name="day_${day}_start"]`).fill(start);await form.locator(`[name="day_${day}_end"]`).fill(end);}
}
async function seriesDetails(start,count=3){
 const form=page.locator('[data-form="owner-series"]');await form.locator('[name="name"]').fill('QA Series Client');await form.locator('[name="email"]').fill('qa-series@example.com');
 await form.locator('[name="startDate"]').fill(start);await form.locator('[name="startDate"]').dispatchEvent('change');await form.locator('[name="time"]').selectOption('10:00');
 await form.locator('[name="count"]').fill(String(count));await form.locator('[name="intervalWeeks"]').fill('1');return form;
}

// A deterministic in-memory Supabase stand-in, restricted to the explicitly
// tested auth, diary, capabilities and save_salon endpoints. Never forwarded.
function mockedBackend(s,{capabilities=true,rejectTables=[]}={}){
 const uuid='10000000-0000-4000-8000-000000000001',staffId='10000000-0000-4000-8000-000000000002',serviceId='10000000-0000-4000-8000-000000000003';
 const row={id:uuid,name:'QA Connected Salon',slug:'qa-connected',owner_name:'QA Owner',email:'qa-owner@example.test',phone:'02079460123',address:'1 QA Street',status:'active',plan:'standard',settings:{seeded:true,hours:clone(s.hours),color:s.color,workspace:{}},payments:{enabled:false,deposit:0},usage:{}};
 const tables={staff:[{id:staffId,salon_id:uuid,name:'QA Owner',role:'Owner',active:true,color:'#235789',hours:null}],services:[{id:serviceId,salon_id:uuid,name:'QA Treatment',price:40,duration:30,staff_ids:[staffId],category_id:''}],categories:[],customers:[],bookings:[],email_log:[],payments:[]},writes=[],rejections=[];
 const handler=async(req,url)=>{
  if(url.pathname==='/auth/v1/token')return {body:{access_token:'qa-only-token',refresh_token:'qa-only-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uuid}}};
  if(url.pathname==='/auth/v1/logout')return {body:{}};
  if(url.pathname==='/rest/v1/rpc/owner_capabilities')return capabilities?{body:{version:1,per_day_hours:true,booking_series:true,plan:'standard',staff_limit:5}}:{status:404,body:{code:'PGRST202',message:'Function is not available'}};
  if(url.pathname==='/rest/v1/rpc/save_salon'){
   const body=req.postDataJSON();writes.push(body);row.settings=clone(body.p_settings);row.name=body.p_name||row.name;return {body:true};
  }
  if(url.pathname==='/rest/v1/salons')return {body:[row]};
  const table=url.pathname.replace('/rest/v1/','');
  if(Object.hasOwn(tables,table)){
   if(req.method()==='GET')return {body:tables[table]};
   if(req.method()==='POST'){const items=req.postDataJSON();if(rejectTables.includes(table)){rejections.push({table,items});return {status:400,body:{code:'23514',message:'QA server rejected '+table+' write'}};}for(const item of items){const at=tables[table].findIndex(x=>x.id===item.id);if(at<0)tables[table].push(item);else tables[table][at]=item;}return {status:201,body:null};}
  }
  return null;
 };
 return {handler,row,tables,writes,rejections};
}
async function withMockBackend(settings,task){
 const previous=page,mock=mockedBackend(selected(baseline),settings),ctx=await newContext(mock.handler);page=await attach(ctx);
 try{await login('qa-owner@example.test','QAOnly2026');await page.waitForURL(/#calendar$/);await task(mock);}
 finally{await ctx.close();page=previous;}
}

try{
 await mkdir(output,{recursive:true});await start();report.sourceHashesBefore=await sourceHashes();const {chromium,expect}=playwright();
 let launchError;for(const choice of process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?[{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}]:[{}, {channel:'chrome'}, {channel:'msedge'}]){try{browser=await chromium.launch({headless:true,...choice});report.browser=choice.channel||choice.executablePath||'playwright-chromium';break;}catch(error){launchError=error;}}if(!browser)throw launchError;
 context=await newContext();page=await attach(context);await login();await page.waitForURL(/#calendar$/);baseline=await storage();
 assert(await page.evaluate(()=>!!window.JOVA_SUPABASE),'Production config must remain loaded');assert.equal(report.blockedRequests.length,0,'Fresh demo login should not need remote API calls');report.demoLogin='Fresh demo login succeeds with real configuration';

 await run('Stale demo password repairs without losing records',async()=>{
  const previous=await storage(),accountId=previous.accounts[0].id;
  await page.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key));const dir=JovaAccounts.create(()=>state,()=>{});dir.seed({salonId:state.active,email:'demo@jovamedia.com',password:'OldDemo2025',owner:'Sam Taylor'});state.salons.find(s=>s.id===state.active).customers.push({id:'qa-preserved',name:'Preserved Client',email:'preserved@example.com'});localStorage.setItem(key,JSON.stringify(state));sessionStorage.removeItem('jovabook-owner');},KEY);
  await page.reload();await login();await expect(page).toHaveURL(/#calendar$/);const after=await storage();assert.equal(after.accounts[0].id,accountId);assert(selected(after).customers.some(c=>c.id==='qa-preserved'));assert.equal(report.blockedRequests.length,0);
 });
 await run('Owner navigation and real editor controls',async()=>{
  const nav=page.getByRole('navigation',{name:'Workspace'});
  await expect(nav.locator('.jb-nav-section a')).toHaveText(['Calendar','Appointments','Clients','Services','Staff','Personalise','Insights']);
  const settings=nav.locator('details');await expect(settings).not.toHaveAttribute('open','');await settings.locator('summary').click();
  for(const name of ['Working hours','Business details','Email reminders','Payments','Subscription'])await expect(settings.getByRole('link',{name,exact:true})).toBeVisible();
  for(const route of ['calendar','appointments','customers','services','staff','scheduling','insights']){await go(route);await expect(page.locator('h1')).toBeVisible();}
  await page.locator('[data-action="share-booking-link"]').click();await expect(page.getByRole('dialog',{name:'Share your booking page'})).toBeVisible();assert((await page.getByRole('dialog').locator('input[readonly]').inputValue()).includes('#book/service'));await closeModal();
  await go('customers');await page.locator('[data-action="add-customer"]').click();const client=page.locator('[data-form="customer"]');await client.locator('[name="name"]').fill('QA Editor Client');await client.locator('[name="email"]').fill('editor@example.com');await client.locator('button.primary').click();
  assert((await salon()).customers.some(c=>c.email==='editor@example.com'));
  await go('services');await page.locator('[data-action="add-service"]').click();const service=page.locator('[data-form="service"]');await service.locator('[name="name"]').fill('QA Owner Service');await service.locator('[name="price"]').fill('45');await service.locator('[name="duration"]').fill('30');await service.locator('[name="staffIds"]').first().check();await service.locator('button.primary').click();assert((await salon()).services.some(s=>s.name==='QA Owner Service'));
 });
 await run('Per-day staff service and public availability',async()=>{
  await fixture(s=>{teamFixture(s);s.bookings=[];s.hours=weekly(Object.fromEntries(Array.from({length:7},(_,i)=>[i,['08:00','18:00']])));},'services');
  const first=(await salon()).services[0];await page.locator(`[data-action="edit-service"][data-id="${first.id}"]`).click();const service=page.locator('[data-form="service"]');for(const checkbox of await service.locator('[name="staffIds"]').all())await checkbox.uncheck();await service.locator('[name="staffIds"][value="qa-staff-1"]').check();await service.locator('button.primary').click();
  await go('availability');await page.locator('.ws-team-details summary').click();await page.locator('[data-change="ws-staff"]').selectOption('qa-staff-1');let hours=page.locator('[data-form="ws-staff-hours"]');await hours.locator('[name="follow"]').uncheck();
  for(let day=0;day<7;day++)await setDay(hours,day,![0,6].includes(day),day===6?'10:00':'11:00',day===6?'14:00':'13:00');await hours.getByRole('button',{name:'Save team member hours',exact:true}).click();
  await serviceTime(future(1),first.id);assert.equal(await page.locator('[data-action="select-time"]').count(),0,'Weekend-only staff has no Monday slots');
  await serviceTime(future(6),first.id);let times=await page.locator('[data-action="select-time"]').allTextContents();assert.equal(times[0],'10:00');assert.equal(times.at(-1),'13:30');
  await serviceTime(future(0),first.id);times=await page.locator('[data-action="select-time"]').allTextContents();assert.equal(times[0],'11:00');assert.equal(times.at(-1),'12:30');
  await shot('public-weekend-staff-slots');
  await go('availability');const business=page.locator('[data-form="ws-business-hours"]');await setDay(business,6,false,'09:00','12:00');await business.getByRole('button',{name:'Save hours',exact:true}).click();
  await serviceTime(future(6),first.id);times=await page.locator('[data-action="select-time"]').allTextContents();assert.equal(times.at(-1),'11:30','Business hours constrain staff times');
 });
 await run('Calendar can select multiple staff calendars',async()=>{
  const date=future(2);await fixture(s=>{teamFixture(s,3);const template=s.bookings[0];s.bookings=s.staff.map((m,i)=>({...clone(template),id:'qa-cal-'+i,date,time:(10+i)+':00',staffId:m.id,name:'Calendar Client '+i}));});
  await page.locator('[data-change="calendar-date"]').fill(date);await page.locator('[data-change="calendar-date"]').dispatchEvent('change');await page.locator('[data-change="calendar-staff"][value="all"]').check();
  const staff=(await salon()).staff;await page.locator(`[data-change="calendar-staff"][value="${staff[0].id}"]`).uncheck();
  await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-0"]')).toHaveCount(0);await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-1"]')).toBeVisible();await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-2"]')).toBeVisible();
  await page.locator('[data-action="cal-view"][data-value="day"]').click();await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-0"]')).toHaveCount(0);await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-1"]')).toBeVisible();
  await page.locator('[data-action="cal-view"][data-value="month"]').click();await expect(page.locator(`.mday[data-date="${date}"]`)).toHaveAttribute('aria-label',/2 appointments/);await shot('calendar-month-selected-staff');
  await page.locator('[data-change="calendar-staff"][value="all"]').check();await page.locator('[data-change="calendar-staff"][value="all"]').uncheck();await expect(page.locator('.jb-calendar-main .empty')).toContainText('Select one or more staff members');
  await page.locator('[data-change="calendar-staff"][value="all"]').check();await page.locator('[data-action="cal-view"][data-value="week"]').click();await expect(page.locator('[data-action="booking-details"][data-id="qa-cal-0"]')).toBeVisible();
  await page.locator(`[data-action="calendar-slot"][data-date="${date}"][data-time="14:00"]`).first().click();await expect(page.locator('[data-form="manual-booking"] [name="date"]')).toHaveValue(date);await expect(page.locator('[data-form="manual-booking"] [name="time"]')).toHaveValue('14:00');await closeModal();
 });
 await run('Essential Standard and Premium staff caps',async()=>{
  assert.equal((await salon()).staff.length,1,'Fresh Essential demo starts with one member');await go('staff');
  const original=(await salon()).staff.length;const add=page.locator('[data-action="add-staff"]');if(await add.isEnabled())await add.click();assert.equal((await salon()).staff.length,original);assert.equal(await page.locator('[data-form="staff"]').count(),0,'Essential cannot open a second member form');
  for(const [plan,limit] of [['Standard',5],['Premium',10]]){
   await fixture(s=>teamFixture(s,limit-1,plan),'staff');await page.locator('[data-action="add-staff"]').click();const form=page.locator('[data-form="staff"]');await form.locator('[name="name"]').fill('QA Last '+plan);await form.locator('button.primary').click();assert.equal((await salon()).staff.length,limit);
   const capped=page.locator('[data-action="add-staff"]');if(await capped.isEnabled())await capped.click();await expect(page.locator('[data-form="staff"]')).toHaveCount(0);assert.equal((await salon()).staff.length,limit);
  }
 });
 await run('Insights reflect records and filter selections',async()=>{
  await fixture(s=>{teamFixture(s);const b=s.bookings[0];s.bookings=[{...clone(b),id:'i1',date:'2026-03-05',staffId:s.staff[0].id,price:40,duration:30,status:'confirmed'},{...clone(b),id:'i2',date:'2026-03-06',staffId:s.staff[0].id,price:60,duration:60,status:'completed'},{...clone(b),id:'i3',date:'2026-03-07',staffId:s.staff[1].id,price:900,duration:120,status:'cancelled'},{...clone(b),id:'i4',date:'2026-03-08',staffId:s.staff[1].id,price:800,duration:60,status:'no-show'}];},'insights');
  const form=page.locator('[data-form="owner-insights"]');await form.locator('[name="period"]').selectOption('custom');await form.locator('[name="start"]').fill('2026-03-01');await form.locator('[name="end"]').fill('2026-03-31');await form.locator('button.primary').click();
  await expect(page.locator('.ot-metric').filter({has:page.locator('span',{hasText:'Scheduled value'})}).locator('strong')).toHaveText('£100.00');await expect(page.locator('.ot-metric').filter({has:page.locator('span',{hasText:'Booked hours'})}).locator('strong')).toHaveText('1.5');
  await expect(page.locator('.ot-chart-day[aria-label="5 Mar 2026: 1 appointment"]')).toHaveCount(1);await shot('insights-actual-records');
  await form.locator('[name="staff"]').selectOption('qa-staff-1');await form.locator('button.primary').click();await expect(page.locator('.ot-metric').filter({has:page.locator('span',{hasText:'Scheduled value'})}).locator('strong')).toHaveText('£0.00');
 });
 await run('Multiple appointments are checked then saved atomically',async()=>{
  const date=future(2);await fixture(s=>{s.bookings=[];s.hours=weekly(Object.fromEntries(Array.from({length:7},(_,i)=>[i,['09:00','18:00']])));});
  await page.locator('[data-action="owner-series"]').first().click();let form=await seriesDetails(date);await form.getByRole('button',{name:'Check dates',exact:true}).click();await expect(form.locator('[data-action="owner-series-confirm"]')).toBeVisible();assert.equal((await salon()).bookings.length,0,'Preview creates no appointments');await shot('owner-series-checked-dates');
  await form.locator('[data-action="owner-series-confirm"]').click();await expect(page.getByRole('dialog')).toHaveCount(0);let s=await salon();assert.equal(s.bookings.length,3);assert.deepEqual(s.bookings.map(b=>b.date).sort(),[date,plus(date,7),plus(date,14)]);
  await page.locator('[data-action="owner-series"]').first().click();form=await seriesDetails(plus(date,-7));await form.getByRole('button',{name:'Check dates',exact:true}).click();await expect(form.locator('[data-action="owner-series-confirm"]')).toHaveCount(0);await expect(form.locator('[data-owner-series-preview]')).toContainText('Unavailable');assert.equal((await salon()).bookings.length,3,'Conflicting preview creates no ghost appointments');await closeModal();
  await go('book/service');await expect(page.locator('[data-action="owner-series"]')).toHaveCount(0);await page.locator('[data-action="select-service"]').first().click();await expect(page.locator('[data-form="owner-series"]')).toHaveCount(0);
 });
 await run('Public customer books reschedules and cancels one appointment',async()=>{
  const date=future(2),rescheduledDate=future(3);await serviceTime(date);const time=await page.locator('[data-action="select-time"]').first().getAttribute('data-time');await page.locator('[data-action="select-time"]').first().click();await page.getByRole('link',{name:'Continue',exact:true}).click();
  const form=page.locator('[data-form="customer-details"]');await form.locator('[name="name"]').fill('QA Single Booking');await form.locator('[name="email"]').fill('qa-single@example.com');await form.locator('input[type="checkbox"]').check();await form.getByRole('button',{name:'Review booking',exact:true}).click();await page.locator('[data-action="confirm-booking"]').click();await expect(page).toHaveURL(/#book\/confirmation$/);
  let booking=(await salon()).bookings.find(b=>b.email==='qa-single@example.com');assert(booking);assert.equal(booking.date,date);assert.equal(booking.time,time);await expect(page.locator('[data-action="owner-series"]')).toHaveCount(0);
  await page.getByRole('link',{name:'Manage appointment',exact:true}).click();await page.getByRole('button',{name:'Reschedule',exact:true}).click();const reschedule=page.locator('[data-form="reschedule"]');await reschedule.locator('[name="date"]').fill(rescheduledDate);await reschedule.locator('[name="date"]').dispatchEvent('change');await reschedule.getByRole('button',{name:'Save new time',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);booking=(await salon()).bookings.find(b=>b.id===booking.id);assert.equal(booking.date,rescheduledDate);
  await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();await page.locator('[data-action="cancel-confirm"]').click();assert.equal((await salon()).bookings.find(b=>b.id===booking.id).status,'cancelled');
 });
 await run('Workspace colour changes the app and preserves public branding',async()=>{
  const before=(await salon()).color;await go('scheduling');await page.getByRole('button',{name:'Change workspace colour',exact:true}).click();const form=page.locator('[data-form="workspace-appearance"]');await form.locator('[name="accent"][value="#286b64"]').check();await form.getByRole('button',{name:'Save colour',exact:true}).click();await page.reload();
  const colours=await page.evaluate(()=>({header:getComputedStyle(document.querySelector('.workspace-header')).backgroundColor,sidebar:getComputedStyle(document.querySelector('.sidebar')).backgroundColor,accent:getComputedStyle(document.querySelector('.shell')).getPropertyValue('--workspace-accent').trim()}));assert.equal(colours.accent,'#286b64');assert(colours.header!=='rgb(255, 255, 255)'||colours.sidebar!=='rgb(255, 255, 255)','Workspace colour affects a meaningful header/sidebar surface');await shot('workspace-colour-full-app');
  await go('book/service');assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--salon').trim()),before);
 });
 await run('Mock connected hours persist and survive reload',async()=>withMockBackend({},async mock=>{
  await go('availability');const form=page.locator('[data-form="ws-business-hours"]');await setDay(form,1,false,'10:00','15:00');await setDay(form,0,true);await form.getByRole('button',{name:'Save hours',exact:true}).click();
  await expect.poll(()=>mock.writes.length).toBeGreaterThan(0);const settings=mock.writes.at(-1).p_settings;assert.equal(settings.hours.weekly['1'].start,'10:00');assert.equal(settings.hours.weekly['1'].end,'15:00');assert.equal(settings.hours.weekly['0'].closed,true);
  await page.reload();await go('availability');await expect(page.locator('[name="day_1_start"]').first()).toHaveValue('10:00');await expect(page.locator('[name="day_1_end"]').first()).toHaveValue('15:00');await shot('mock-connected-persisted-hours');
 }));
 await run('Missing owner capabilities show setup guards',async()=>withMockBackend({capabilities:false},async()=>{
  await go('availability');await expect(page.locator('[data-form="ws-business-hours"] button.primary')).toBeDisabled();await expect(page.locator('.ws-capability')).toContainText('booking system update');
  await go('calendar');await page.locator('[data-action="owner-series"]').first().click();await expect(page.getByRole('dialog')).toContainText('booking update');await expect(page.locator('[data-form="owner-series"]')).toHaveCount(0);
 }));
 await run('Rejected connected writes restore records without phantom saves',async()=>withMockBackend({rejectTables:['bookings','staff']},async mock=>{
  await page.locator('[data-action="new-booking"]').first().click();const booking=page.locator('[data-form="manual-booking"]');
  await booking.locator('[name="name"]').fill('Rejected Booking Client');await booking.locator('[name="email"]').fill('rejected-booking@example.test');await booking.locator('[name="date"]').fill(future(2));await booking.locator('[name="date"]').dispatchEvent('change');await booking.locator('[name="time"]').selectOption('10:00');await booking.getByRole('button',{name:'Create appointment',exact:true}).click();
  await expect.poll(()=>mock.rejections.filter(r=>r.table==='bookings').length).toBeGreaterThan(0);await expect.poll(async()=>(await salon()).bookings.length).toBe(0);
  await expect(page.locator('#sync-status')).toContainText('not saved');assert(!/^(Saved|Saved successfully)$/i.test(await page.locator('#sync-status').innerText()));
  await expect(page.getByText('Rejected Booking Client',{exact:true})).toHaveCount(0);assert.equal(mock.tables.bookings.length,0);
  await go('staff');await page.locator('[data-action="add-staff"]').click();const staff=page.locator('[data-form="staff"]');await staff.locator('[name="name"]').fill('Rejected Staff Member');await staff.locator('button.primary').click();
  await expect.poll(()=>mock.rejections.filter(r=>r.table==='staff').length).toBeGreaterThan(0);await expect.poll(async()=>(await salon()).staff.length).toBe(1);
  await expect(page.locator('#sync-status')).toContainText('not saved');await expect(page.getByText('Rejected Staff Member',{exact:true})).toHaveCount(0);assert.equal(mock.tables.staff.length,1);
  const backup=await page.evaluate(key=>JSON.parse(localStorage.getItem(key+'-unsaved')||'null'),KEY);assert(backup,'Rejected optimistic data has a local recovery copy');await shot('connected-rejected-write-restored');
 }));
 await run('Responsive 390 768 and 1440 page and button coverage',async()=>{
  const routes=['calendar','appointments','customers','services','staff','scheduling','insights','availability','notifications'];
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const route of routes){await go(route);await expect(page.getByRole('dialog')).toHaveCount(0);await noOverflow(`${width} ${route}`);if(route==='insights'&&await page.locator('.ot-chart-fit').count()){const chart=await page.locator('.ot-chart-scroll').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert(chart.scroll<=chart.width+1,'A month of daily bars fits the chart viewport');}await shot(`${width}-${route}`);}
   await go('calendar');const menu=page.getByRole('button',{name:'Toggle workspace navigation',exact:true});if(await menu.isVisible()){await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await noOverflow(`${width} navigation`);await shot(`${width}-navigation-open`);await menu.click();}
   await page.locator('[data-action="new-booking"]').first().click();await expect(page.getByRole('dialog')).toBeVisible();await noOverflow(`${width} appointment modal`);await shot(`${width}-new-appointment`);await closeModal();
   await page.locator('[data-action="owner-series"]').first().click();await expect(page.getByRole('dialog')).toBeVisible();await noOverflow(`${width} series modal`);await shot(`${width}-series-modal`);await closeModal();
  }
 });
}catch(error){report.fatal=String(error.stack||error);process.exitCode=1;console.error(report.fatal);}
finally{
 report.sourceHashesAfter=await sourceHashes();report.sourceUnchanged=JSON.stringify(report.sourceHashesBefore)===JSON.stringify(report.sourceHashesAfter);if(!report.sourceUnchanged){report.limitations.push('Source files changed during this run. Repeat the suite against a stable revision.');process.exitCode=1;}
 report.finishedAt=new Date().toISOString();report.passed=report.tests.filter(t=>t.status==='passed').length;report.failed=report.tests.filter(t=>t.status==='failed').length;
 await mkdir(output,{recursive:true});await writeFile(path.join(output,'owner-experience-report.json'),JSON.stringify(report,null,2));await context?.close();await browser?.close();if(server&&server.exitCode===null)server.kill();console.log(`Owner QA: ${report.passed} passed, ${report.failed} failed. ${path.join(output,'owner-experience-report.json')}`);
}
