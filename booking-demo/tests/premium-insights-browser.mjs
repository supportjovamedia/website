/** Real application/browser, explicitly mocked private API fixtures, no external requests or writes. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,expect}=require('@playwright/test');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),out=path.resolve(process.env.PREMIUM_INSIGHTS_QA_DIR||path.join(root,'test-results/premium-insights'));
const KEY='jovabook-essential-demo-v2',today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const plus=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const start=plus(today,-6),end=plus(today,6),sid='20000000-0000-4000-8000-000000000001';
const state={id:sid,owner:'premium-fixture-owner',plan:'premium',capabilityPlan:'premium',workspace:{plan:'premium',appearance:{theme:'jova-blue'}}};
const token=owner=>({access_token:'access-'+owner,refresh_token:'refresh-'+owner,expires_at:Date.now()/1000+3600,user:{id:owner}});
const b=(id,offset,price,status='completed',staff='a',service='consultation')=>({salon_id:state.id,id:'bk_'+id.padEnd(32,'0'),service_id:service,service_name:service==='consultation'?'Consultation':service==='colour'?'Colour session':'Archived care',price,duration:30,date:plus(today,offset),time:'10:00',staff_id:staff,customer_id:'c'+id,name:'Fictional Client '+id,email:'client'+id+'@example.test',phone:'',notes:'',source:'Manual',status,deposit:10});
function fixture(){const bookings=[b('1',-6,50),b('2',-6,25),b('3',-3,100,'completed','a','colour'),b('4',-2,40,'completed','b','colour'),b('5',-1,15,'completed','deleted','archived'),b('6',1,999),b('7',-3,500,'confirmed'),b('8',-3,900,'cancelled'),b('9',-3,800,'no-show'),b('10',-13,20),b('11',-10,30,'completed','a','colour'),b('12',-7,50)];return {categories:[],staff:[{salon_id:state.id,id:'a',name:'Sam',role:'Owner',active:true,color:'#235789',hours:null},{salon_id:state.id,id:'b',name:'Jordan',role:'Stylist',active:false,color:'#286b55',hours:null}],services:[{salon_id:state.id,id:'consultation',name:'Consultation',price:999,duration:30,category_id:'',staff_ids:['a']},{salon_id:state.id,id:'colour',name:'Colour session',price:999,duration:30,category_id:'',staff_ids:['a','b']}],customers:bookings.map(row=>({salon_id:state.id,id:row.customer_id,name:row.name,email:row.email,phone:'',notes:''})),bookings,email_log:[],payments:[{salon_id:state.id,id:'demo-payment',booking_id:'ignored',amount:5000,fee:0,net:5000,method:'demo'}]};}
let tables=fixture();
const salon=()=>({id:state.id,owner_id:state.owner,name:'Fictional Insights Business',slug:'fictional-insights',owner_name:'Fictional Owner',email:'owner@example.test',phone:'020 7946 0123',address:'Fictional address',status:'active',plan:state.plan,settings:{seeded:true,hours:{start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]},workspace:state.workspace},payments:{enabled:false,deposit:0},usage:{}});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,p==='/'?'index.html':'.'+decodeURIComponent(p));assert(file.startsWith(root+path.sep));const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const report={checks:[],pageErrors:[],external:[],requests:[],screenshots:[],limitations:['All private API responses are explicit local fixtures. This is not hosted-backend verification.']};
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})}),context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());if(u.origin!==base){report.external.push(r.url());return route.abort();}
 if(u.pathname==='/config.js')return route.fulfill({contentType:'application/javascript',body:`window.JOVA_SUPABASE={url:'${base}/mock',key:'local-public'};`});
 if(!u.pathname.startsWith('/mock/')&&u.pathname!=='/api/jovabook/billing/status')return route.continue();
 const p=u.pathname==='/api/jovabook/billing/status'?u.pathname:u.pathname.slice(5),method=r.method();report.requests.push({path:p,method});
 const answer=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 if(p==='/api/jovabook/billing/status'){assert.equal(method,'POST');assert.equal(r.headers().authorization,'Bearer access-'+state.owner);const s=salon();return answer({ok:true,access:'active',reason:'paid',business:{id:s.id,name:s.name,slug:s.slug,plan:s.plan,status:s.status},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:false,canCheckout:false},staff_limit:{essential:1,standard:5,premium:10}[s.plan]});}
 if(p==='/auth/v1/token')return answer(token(state.owner));
 if(p==='/rest/v1/salons')return answer([salon()]);
 if(p.endsWith('/rpc/owner_capabilities'))return answer({version:1,plan:state.capabilityPlan,staff_limit:{essential:1,standard:5,premium:10}[state.capabilityPlan],per_day_hours:true,booking_series:true});
 if(p.endsWith('/rpc/email_delivery_info'))return answer({enabled:false,provider:'Resend',reminder_hours:24});
 const table=p.split('/').at(-1);
 if(Object.hasOwn(tables,table)&&method==='GET'){assert.equal(u.searchParams.get('salon_id'),'eq.'+state.id);return answer(tables[table]);}
 report.unexpected={method,path:p};return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unexpected local test API request'})});
});
await context.addInitScript(auth=>{if(!sessionStorage.getItem('premium-qa')){localStorage.clear();localStorage.setItem('jovabook-auth',JSON.stringify(auth));sessionStorage.setItem('jovabook-owner','1');sessionStorage.setItem('premium-qa','1');}},token(state.owner));
const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>report.pageErrors.push(String(error)));
const panel=()=>page.locator('[data-premium-compare]');
async function go(){await page.goto(base+'/#insights');await page.reload();await expect(page.locator('.ot-insights,[data-insights-upgrade]')).toBeVisible();}
async function apply(from=start,to=end,staff='all'){const form=page.locator('[data-form=owner-insights]');await form.locator('[name=period]').selectOption('custom');await form.locator('[name=start]').fill(from);await form.locator('[name=end]').fill(to);await form.locator('[name=staff]').selectOption(staff);await form.getByRole('button',{name:'Apply',exact:true}).click();}
async function total(name,text){await expect(panel().locator('[data-premium-total='+name+']')).toHaveText(text);}
async function check(name,fn){await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);}
async function shot(name,locator){if(!locator)await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));const filename=name+'.png';await (locator||page).screenshot({path:path.join(out,filename),...(locator?{}:{fullPage:true}),animations:'disabled'});const bytes=await readFile(path.join(out,filename)),metadata=[];for(let i=8;i+12<=bytes.length;i+=bytes.readUInt32BE(i)+12){const type=bytes.toString('ascii',i+4,i+8);if(['eXIf','iTXt','tEXt','zTXt','caBX'].includes(type))metadata.push(type);}assert.deepEqual(metadata,[]);report.screenshots.push({filename,metadata});}
const recordSnapshot=()=>page.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key)),s=state.salons.find(s=>s.id===state.active);return JSON.stringify({staff:s.staff,services:s.services,customers:s.customers,bookings:s.bookings,payments:s.payments,workspace:s.workspace});},KEY);
try{
 await mkdir(out,{recursive:true});await go();await apply();
 await check('Verified Premium shows matched observed windows and actual paired series below all Standard panels',async()=>{
  await expect(panel()).toBeVisible();await expect(page.locator('[data-client-visits]')).toHaveCount(1);await expect(page.locator('.ot-line-chart')).toHaveCount(1);
  await expect(panel().locator('[data-premium-series]')).toHaveCount(2);await expect(panel().locator('[data-current-date]')).toHaveCount(7);
  await total('value','£230.00');await total('completed','5');await total('averageValue','£46.00');
  await expect(panel().locator('[data-premium-change=value]')).toHaveText('+£130.00 · +130%');
  await expect(panel().locator('.ot-compare-window')).toContainText('first 7 observed days');await expect(panel()).toContainText('not collected cash');await expect(panel()).not.toContainText('£999.00');
  const labels=await panel().locator('[data-current-date]').evaluateAll(nodes=>nodes.map(n=>({current:n.dataset.currentDate,previous:n.dataset.previousDate})));assert.equal(labels[0].current,start);assert.equal(labels[0].previous,plus(today,-13));assert.equal(labels.at(-1).current,today);
  assert(await page.evaluate(()=>document.querySelector('[data-client-visits]').compareDocumentPosition(document.querySelector('[data-premium-compare]'))&Node.DOCUMENT_POSITION_FOLLOWING));
 });
 await check('Keyboard toggles change chart values, preserve focus and never save records',async()=>{
  const before=await recordSnapshot(),beforeRequests=report.requests.length;const button=panel().getByRole('button',{name:'Completed bookings',exact:true});await button.focus();await page.keyboard.press('Space');
  await expect(panel()).toHaveAttribute('data-compare-metric','completed');await expect(panel().getByRole('button',{name:'Completed bookings',exact:true})).toBeFocused();
  await expect(panel().getByRole('button',{name:'Completed bookings',exact:true})).toHaveAttribute('aria-pressed','true');
  assert.equal(await panel().locator('[data-current-date]').first().getAttribute('data-current-value'),'2');
  await page.keyboard.press('Tab');await panel().getByRole('button',{name:'Completed value',exact:true}).focus();await page.keyboard.press('Enter');await expect(panel()).toHaveAttribute('data-compare-metric','value');
  assert.equal(await panel().locator('[data-current-date]').first().getAttribute('data-current-value'),'75');assert.equal(await recordSnapshot(),before);assert.equal(report.requests.length,beforeRequests);
 });
 await check('Chart points reveal paired date/value tooltips with hover and keyboard focus',async()=>{
  const hit=panel().locator('.ot-compare-hit').first(),point=hit.locator('.ot-compare-current-point');await point.scrollIntoViewIfNeeded();await point.hover();await expect(hit.locator('.ot-compare-tooltip')).toBeVisible();
  await page.mouse.move(0,0);await point.focus();await expect(hit.locator('.ot-compare-tooltip')).toBeVisible();await expect(point).toHaveAttribute('aria-label',/Current.*Previous/);assert.equal(await point.getAttribute('data-previous-value'),'20');
 });
 await check('Staff filters, zero baselines and future-only periods are truthful and read-only',async()=>{
  const before=await recordSnapshot();await apply(start,end,'b');await total('value','£40.00');await total('completed','1');await expect(panel().locator('[data-premium-change=value]')).toHaveText('+£40.00 · No previous baseline');
  await apply(plus(today,2),plus(today,7));await expect(panel()).toContainText('This period has not started');await expect(panel().locator('[data-premium-series],[data-premium-total]')).toHaveCount(0);
  await apply(plus(today,-100),plus(today,-98));await total('value','£0.00');await total('completed','0');await expect(panel()).toContainText('No completed bookings in either comparison period');assert.equal(await recordSnapshot(),before);await apply();
 });
 await check('All six palettes fit desktop and 360px screens, with actual focused-panel proof',async()=>{
  for(const theme of ['jova-blue','rose-studio','midnight-glass','forest','warm-studio','amethyst']){
   await page.evaluate(theme=>JovaWorkspaceThemes.apply(theme),theme);
   for(const width of [1440,360]){
    await page.setViewportSize({width,height:width===1440?1000:844});await panel().scrollIntoViewIfNeeded();
    const sizes=await page.evaluate(()=>({viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(sizes.html<=width+1&&sizes.body<=width+1,JSON.stringify({theme,sizes}));
    await expect.poll(async()=>panel().getByRole('button',{name:'Completed value',exact:true}).evaluate(button=>{const color=document.createElement('span');color.style.background='var(--theme-primary)';color.style.color='var(--theme-on-primary)';button.append(color);const expected=getComputedStyle(color).backgroundColor,onPrimary=getComputedStyle(color).color;color.remove();return getComputedStyle(button).backgroundColor===expected&&getComputedStyle(button).color===onPrimary;})).toBe(true);
    await shot(theme+'-'+width+'-premium',panel());
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>JovaWorkspaceThemes.apply('jova-blue'));await shot('1440-premium-full');await page.setViewportSize({width:360,height:844});await shot('360-premium-full');await page.setViewportSize({width:1440,height:1000});
 });
 await check('Standard is a locked static preview with no Premium data, controls or forged-action access',async()=>{
  state.plan='premium';state.capabilityPlan='standard';await go();await apply();await expect(page.locator('[data-premium-locked]')).toBeVisible();await expect(page.locator('[data-client-visits]')).toHaveCount(1);await expect(page.locator('[data-premium-compare],[data-premium-series],[data-premium-total],[data-action=premium-compare-metric]')).toHaveCount(0);
  await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='premium-compare-metric';b.dataset.metric='completed';document.querySelector('#workspace-main').append(b);b.click();});await expect(page.locator('[data-premium-compare],[data-premium-series],[data-premium-total]')).toHaveCount(0);await expect(page.locator('[data-premium-locked]')).toBeVisible();await shot('1440-standard-locked',page.locator('[data-premium-locked]'));
 });
 await check('Downgrading Premium or switching business removes stale comparison data and metric state',async()=>{
  state.plan='premium';state.capabilityPlan='premium';await go();await apply();await panel().getByRole('button',{name:'Completed bookings',exact:true}).click();await expect(panel()).toHaveAttribute('data-compare-metric','completed');
  state.capabilityPlan='essential';await go();await expect(page.locator('[data-insights-upgrade]')).toBeVisible();await expect(page.locator('[data-premium-compare],[data-premium-locked],[data-client-visits]')).toHaveCount(0);
  state.id='20000000-0000-4000-8000-000000000002';state.owner='second-premium-owner';state.capabilityPlan='premium';state.plan='premium';tables=fixture();tables.bookings=[b('second',-2,17)];tables.customers=[];tables.payments=[];
  await page.evaluate(auth=>{const key='jovabook-auth',oldValue=localStorage.getItem(key),newValue=JSON.stringify(auth);localStorage.setItem(key,newValue);dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue,storageArea:localStorage,url:location.href}));},token(state.owner));await expect(page.locator('[data-form=login]')).toBeVisible();await expect(page.locator('[data-premium-compare]')).toHaveCount(0);
  await page.locator('[data-form=login] [name=email]').fill('owner@example.test');await page.locator('[data-form=login] [name=password]').fill('Fictional123');await page.locator('[data-form=login] button.primary').click();await expect(page).toHaveURL(/#dashboard$/);await go();await apply();await total('value','£17.00');await total('completed','1');await expect(panel()).toHaveAttribute('data-compare-metric','value');await expect(panel()).not.toContainText('£230.00');
 });
 const allowedPost=new Set(['/api/jovabook/billing/status','/rest/v1/rpc/owner_capabilities','/rest/v1/rpc/email_delivery_info','/auth/v1/token']);
 const writes=report.requests.filter(r=>r.method!=='GET'&&!allowedPost.has(r.path));assert.deepEqual(writes,[]);assert.equal(report.unexpected,undefined);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.external,[]);report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);console.error(report.error);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.pageErrors,external:report.external,out}));}
