/** Offline owner/public regression suite. Run: node booking-demo/tests/acuity-workflows.mjs
 * Optional BASE_URL (existing local server), BOOKING_QA_DIR, PLAYWRIGHT_MODULE,
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE. Default evidence: booking-demo/test-results.
 * No package installation or live account access. All data belongs to a fresh browser context.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';

const require = createRequire(import.meta.url);
const demoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qaDir = path.resolve(process.env.BOOKING_QA_DIR || path.join(demoDir, 'test-results'));
const base = process.env.BASE_URL || 'http://127.0.0.1:4317';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'BASE_URL must be a local offline preview');
const KEY = 'jovabook-essential-demo-v2';
const remoteAdapter = process.env.BOOKING_QA_REMOTE_ADAPTER === '1';
const report = {startedAt:new Date().toISOString(), scope:'Simplified owner workspace', baseURL:base, offline:true, remoteAdapter, tests:[], pageErrors:[], externalRequests:[], screenshots:[], limitations:[]};
let server, browser, context, page, baseline;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const requirePlaywright = () => {
  const candidates = [process.env.PLAYWRIGHT_MODULE, '@playwright/test'].filter(Boolean);
  for (const candidate of candidates) {try {return require(candidate);} catch {}}
  throw Error('Playwright is unavailable. Point this script at an existing @playwright/test installation.');
};
async function serverReady() {
  try {const r=await fetch(base, {signal:AbortSignal.timeout(1500)});return r.ok && /JovaBook|JovaMedia|Jova Media/.test(await r.text());} catch {return false;}
}
async function startServer() {
  if (await serverReady()) {
    const remote=await fetch(new URL('/app.js',base)).then(r=>r.text());
    assert(remote===await readFile(path.join(demoDir,'app.js'),'utf8'),'Existing server serves a different app.js. Stop that server yourself or set BASE_URL to this checkout preview.');
    report.server='existing';return;
  }
  assert(!process.env.BASE_URL, 'The specified BASE_URL is not a running JovaBook preview');
  server=spawn(process.execPath, ['server.mjs'], {cwd:demoDir,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
  for(let i=0;i<40;i++) {if(await serverReady()){report.server='spawned';return;}if(server.exitCode!==null)break;await delay(150);}
  throw Error('Local preview server did not start: '+log);
}
async function go(route) {await page.goto(`${base}/#${route}`);await page.locator('#app h1').first().waitFor();}
async function stored() {return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function activeSalon() {const state=await stored();return state.salons.find(s=>s.id===state.active);}
async function replaceState(value, route) {await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:KEY,value});await page.reload();await go(route);}
async function reset(route='calendar') {
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:KEY,value:baseline});
  await page.reload();
  await go(route);
}
async function closeDialogs() {if(await page.getByRole('dialog').count())await page.getByRole('button',{name:'Close dialog',exact:true}).click();}
async function screenshot(filename) {
  await page.screenshot({path:path.join(qaDir,filename),fullPage:true,animations:'disabled'});
  const png=await readFile(path.join(qaDir,filename)),chunks=[];
  for(let p=8;p+12<=png.length;p+=png.readUInt32BE(p)+12)chunks.push(png.toString('ascii',p+4,p+8));
  const metadataChunks=[...new Set(chunks.filter(type=>['eXIf','iTXt','tEXt','zTXt','caBX'].includes(type)))];
  report.screenshots.push({filename,width:(await page.viewportSize()).width,route:new URL(page.url()).hash,modalOpen:await page.getByRole('dialog').count()>0,metadataChunks});
}
async function scenario(name,run) {
  const started=Date.now(),errorStart=report.pageErrors.length;
  const result={name,status:'passed'};
  try {await reset();await run();assert.equal(report.pageErrors.length,errorStart,'Unexpected browser exception');}
  catch(error) {result.status='failed';result.error=String(error.stack||error);process.exitCode=1;}
  result.durationMs=Date.now()-started;
  try {await closeDialogs();const filename=name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.png';await screenshot(filename);result.screenshot=filename;}catch(error){result.screenshotError=String(error);}
  report.tests.push(result);console.log(`${result.status.toUpperCase()} ${name}${result.error?'\n'+result.error:''}`);
}
function futureDate(weekday, weeks=1) {const d=new Date();d.setDate(d.getDate()+7*weeks);while(d.getDay()!==weekday)d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function serviceTime(date) {
  await go('book/service');await page.locator('[data-action="select-service"]').first().click();
  await page.locator('[data-change="booking-date"]').fill(date);
  await page.locator('[data-change="booking-date"]').dispatchEvent('change');
}
async function noOverflow(label) {
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert(bounds.scroll<=bounds.width+1&&bounds.body<=bounds.width+1,`${label}: page overflow ${JSON.stringify(bounds)}`);
}

try {
  await mkdir(qaDir,{recursive:true});await startServer();
  const {chromium,expect}=requirePlaywright();
  const launchOptions=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?[{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}]:[{}, {channel:'chrome'}, {channel:'msedge'}];
  let launchError;
  for(const options of launchOptions) {
    try {browser=await chromium.launch({headless:true,downloadsPath:path.join(qaDir,'downloads'),...options});report.browser=options.channel||options.executablePath||'playwright-chromium';break;}
    catch(error) {launchError=error;}
  }
  if(!browser)throw launchError;
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  // The optional remote adapter uses the served config, but never permits API traffic.
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(!remoteAdapter&&url.pathname==='/config.js')return route.fulfill({status:200,contentType:'application/javascript',body:''});
    if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(base).origin) {report.externalRequests.push({url:url.origin+url.pathname,method:route.request().method()});return route.abort('blockedbyclient');}
    return route.continue();
  });
  page=await context.newPage();page.setDefaultTimeout(7000);
  page.on('pageerror',error=>report.pageErrors.push(String(error)));
  await go('login');
  assert.equal(await page.evaluate(()=>!!window.JOVA_SUPABASE),remoteAdapter,'Requested account adapter must be active');
  await page.locator('[data-form="login"] [name="email"]').fill('demo@jovamedia.com');
  await page.locator('[data-form="login"] [name="password"]').fill('Salon2026');
  await page.locator('[data-form="login"] button[type="submit"], [data-form="login"] button.primary').click();
  await expect(page).toHaveURL(/#calendar$/);baseline=await stored();
  assert(baseline?.salons?.length,'Actual demo login must produce local demo data');
  report.authentication='Actual demo form login succeeded';

  async function demoLogin(password='Salon2026') {
    await page.locator('[data-form="login"] [name="email"]').fill('demo@jovamedia.com');
    await page.locator('[data-form="login"] [name="password"]').fill(password);
    await page.locator('[data-form="login"] .primary').click();
  }
  await scenario('Old saved demo credentials recover without deleting diary data',async()=>{
    const fixture=structuredClone(baseline),salon=fixture.salons.find(s=>s.id==='drink');
    salon.customMarker='keep-demo-diary';
    const account=fixture.accounts.find(a=>a.salonId==='drink');account.hash='obsolete-demo-hash';
    await page.evaluate(()=>sessionStorage.removeItem('jovabook-owner'));
    await replaceState(fixture,'login');await demoLogin('Wrong2026');
    await expect(page.locator('[data-form="login"] .error')).toContainText('do not match');
    await demoLogin();await expect(page).toHaveURL(/#calendar$/);
    const updated=await stored();assert.equal(updated.salons.find(s=>s.id==='drink').customMarker,'keep-demo-diary');
    assert.equal(updated.accounts.find(a=>a.salonId==='drink').id,account.id);
    assert.notEqual(updated.accounts.find(a=>a.salonId==='drink').hash,'obsolete-demo-hash');
  });
  await scenario('Demo sign-in restores only a missing fictional salon',async()=>{
    const fixture=structuredClone(baseline);fixture.salons[0].id='legacy-local-salon';fixture.salons[0].customMarker='preserve-other-salon';fixture.active='legacy-local-salon';fixture.accounts=[];
    await page.evaluate(()=>sessionStorage.removeItem('jovabook-owner'));
    await replaceState(fixture,'login');await demoLogin();await expect(page).toHaveURL(/#calendar$/);
    const updated=await stored();assert.equal(updated.active,'drink');assert.equal(updated.salons.find(s=>s.id==='legacy-local-salon').customMarker,'preserve-other-salon');
    assert.equal(updated.salons.filter(s=>s.id==='drink').length,1);
  });

  await scenario('Four owner links and collapsed settings',async()=>{
    const nav=page.getByRole('navigation',{name:'Workspace'});
    await expect(nav.locator('.jb-nav-section a')).toHaveText(['Calendar','Appointments','Clients','Booking setup']);
    const extras=nav.locator('details');await expect(extras).not.toHaveAttribute('open','');
    for(const href of ['staff','settings','notifications','payments','billing'])await expect(nav.locator(`a[href="#${href}"]`)).toBeHidden();
    for(const [route,label] of [['calendar','Your calendar'],['appointments','Appointments'],['customers','Clients'],['booking-setup','Set up your bookings']]) {
      await nav.locator(`a[href="#${route}"]`).click();await expect(page).toHaveURL(new RegExp(`#${route}$`));await expect(page.locator('h1')).toContainText(label);
    }
    await nav.locator('summary').click();await expect(nav.getByRole('link',{name:'Business details',exact:true})).toBeVisible();
    await nav.locator('summary').click();await expect(nav.getByRole('link',{name:'Business details',exact:true})).toBeHidden();
    assert.equal(await nav.locator('[href="#intake"], [href="#reports"]').count(),0);
  });
  await scenario('Three booking setup steps',async()=>{
    await go('booking-setup');await expect(page.locator('.ws-setup-card')).toHaveCount(3);
    for(const [route,title] of [['services','Services'],['availability','Working hours'],['scheduling','Booking page']]) {
      await page.locator(`.ws-setup-card[href="#${route}"]`).click();await expect(page).toHaveURL(new RegExp(`#${route}$`));await expect(page.locator('h1')).toContainText(title);
      await page.getByRole('link',{name:'Back to booking setup',exact:false}).click();await expect(page).toHaveURL(/#booking-setup$/);
    }
  });
  await scenario('Workspace colour persists separately from public colour',async()=>{
    const publicColour=(await activeSalon()).color;
    await page.locator('.jb-more-settings summary').click();await page.locator('[data-action="workspace-appearance"]').click();
    const form=page.locator('[data-form="workspace-appearance"]');await form.locator('[name="accent"][value="#286b64"]').check();
    await form.getByRole('button',{name:'Save colour',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal((await activeSalon()).workspace.appearance.accent,'#286b64');
    await page.reload();const appearance=await page.locator('.shell').evaluate(el=>({accent:getComputedStyle(el).getPropertyValue('--workspace-accent').trim(),blue:getComputedStyle(el).getPropertyValue('--blue').trim()}));
    assert.equal(appearance.accent,'#286b64');assert.equal(appearance.blue,'#286b64');await screenshot('workspace-forest-colour.png');
    await page.locator('.jb-more-settings summary').click();await page.locator('[data-action="workspace-appearance"]').click();
    await expect(page.locator('[data-form="workspace-appearance"] [name="accent"][value="#286b64"]')).toBeChecked();await closeDialogs();
    await go('book/service');assert.equal((await activeSalon()).color,publicColour);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--salon').trim()),publicColour);
  });
  await scenario('Essential previews email reminders only',async()=>{
    await go('notifications');await expect(page.getByRole('heading',{name:'Email reminders',exact:true})).toBeVisible();
    await expect(page.locator('[data-action="sms-preview"]')).toHaveCount(0);assert(!/SMS|TextBee/i.test(await page.locator('#workspace-main').innerText()));
    const before=(await activeSalon()).emails.filter(e=>e.kind==='reminder').length;
    await page.getByRole('button',{name:'Preview due reminders',exact:true}).click();
    const after=(await activeSalon()).emails.filter(e=>e.kind==='reminder');assert(after.length>before,'Preview action saves local reminder examples');
    await page.getByRole('button',{name:'Preview due reminders',exact:true}).click();assert.equal((await activeSalon()).emails.filter(e=>e.kind==='reminder').length,after.length,'Preview action does not duplicate reminders');
    await page.locator(`[data-action="email"][data-id="${after[0].id}"]`).click();await expect(page.getByRole('dialog')).toContainText('See you soon');
    await screenshot('email-reminder-preview.png');await closeDialogs();
  });
  await scenario('Calendar time grid and date jump',async()=>{
    const date=futureDate(2);await go('calendar');
    const jump=page.locator('[data-change="calendar-date"]');await jump.fill(date);await jump.dispatchEvent('change');
    await page.locator('[data-action="cal-view"][data-value="week"]').click();
    assert(await page.locator(`[data-action="calendar-slot"][data-date="${date}"]`).count()>0,'Week grid exposes dated time-slot controls');
    const slot=page.locator(`[data-action="calendar-slot"][data-date="${date}"][data-time="11:00"]:not([disabled])`).first(),time=await slot.getAttribute('data-time');assert.match(time,/^\d{2}:\d{2}$/);
    await slot.click();await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('[data-form="manual-booking"] [name="date"]')).toHaveValue(date);await expect(page.locator('[data-form="manual-booking"] [name="time"]')).toHaveValue(time);
    await closeDialogs();await page.locator('[data-action="cal-view"][data-value="day"]').click();await expect(jump).toHaveValue(date);
    await page.locator('[data-action="cal-view"][data-value="month"]').click();await expect(jump).toHaveValue(date);
    await page.locator('[data-action="cal-view"][data-value="week"]').click();
  });
  await scenario('Working hours change public slots',async()=>{
    const date=futureDate(1);await serviceTime(date);assert(await page.locator('[data-action="select-time"]').count()>0,'Monday initially has slots');
    await go('availability');const form=page.locator('[data-form="ws-business-hours"]');
    await expect(form.locator('details')).not.toHaveAttribute('open','');await expect(page.locator('.ws-team-details')).not.toHaveAttribute('open','');
    await form.locator('[name="days"][value="1"]').uncheck();await form.getByRole('button',{name:'Save hours',exact:true}).click();
    assert(!(await activeSalon()).hours.days.includes(1),'Closed weekday persisted');
    await serviceTime(date);assert.equal(await page.locator('[data-action="select-time"]').count(),0,'Closed Monday cannot be booked');
  });
  await scenario('Booking page settings reach public booking',async()=>{
    await go('scheduling');const form=page.locator('[data-form="ws-booking-page"]');
    await expect(form.locator('details')).not.toHaveAttribute('open','');await expect(form.locator('[name="showPrices"]')).toBeHidden();
    await form.locator('[name="color"]').fill('#29634b');await form.locator('[name="title"]').fill('Your next moment of calm');
    await form.locator('[name="intro"]').fill('Choose your treatment with our friendly salon team.');
    await form.locator('summary').click();await form.locator('[name="showPrices"]').uncheck();await form.locator('[name="buttonLabel"]').fill('Find my appointment');
    await form.getByRole('button',{name:'Save booking page',exact:true}).click();await expect(page.locator('[data-form="ws-booking-page"] details')).not.toHaveAttribute('open','');
    await go('book/service');await expect(page.getByRole('heading',{name:'Your next moment of calm',exact:true})).toBeVisible();await expect(page.getByText('Choose your treatment with our friendly salon team.',{exact:true})).toBeVisible();
    assert(!(await page.locator('[data-action="select-service"]').allTextContents()).some(text=>text.includes('£')),'Saved price visibility is applied publicly');
    const actions=page.locator('[data-action="select-service"] .jb-service-action small');assert(await actions.count()>0);
    for(const text of await actions.allTextContents())assert(text.includes('Find my appointment'),'Each service uses saved booking button text');
    const summary=page.locator('.booking-layout > aside');await expect(summary.getByText('Total',{exact:true})).toHaveCount(0);assert(!(await summary.innerText()).includes('£'));
    const brand=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--salon').trim());assert.equal(brand,'#29634b');await screenshot('public-customised-hidden-prices.png');
    await go('scheduling');await page.locator('[data-form="ws-booking-page"] summary').click();await page.locator('[name="showPrices"]').check();await page.getByRole('button',{name:'Save booking page',exact:true}).click();
    await go('book/service');assert((await page.locator('[data-action="select-service"]').allTextContents()).some(text=>text.includes('£')),'Prices return after saving');await expect(page.locator('.booking-layout > aside').getByText('Total',{exact:true})).toBeVisible();
  });
  await scenario('Customer booking reschedule and cancellation',async()=>{
    const date=futureDate(2,2),newDate=futureDate(3,2);await serviceTime(date);
    const chosen=page.locator('[data-action="select-time"]').first(),time=await chosen.getAttribute('data-time');await chosen.click();await page.getByRole('link',{name:'Continue',exact:true}).click();
    const details=page.locator('[data-form="customer-details"]');await details.locator('[name="name"]').fill('QA Booking Guest');await details.locator('[name="email"]').fill('qa-booking@example.com');await details.locator('input[type="checkbox"]').check();await details.getByRole('button',{name:'Review booking',exact:true}).click();
    await expect(page).toHaveURL(/#book\/payment$/);await expect(page.getByText('Appointment total',{exact:true})).toBeVisible();await page.locator('[data-action="confirm-booking"]').click();await expect(page).toHaveURL(/#book\/confirmation$/);
    let booking=(await activeSalon()).bookings.find(b=>b.email==='qa-booking@example.com');assert(booking);assert.equal(booking.date,date);assert.equal(booking.time,time);assert.equal(booking.status,'confirmed');await screenshot('customer-booking-confirmed.png');
    await page.getByRole('link',{name:'Manage appointment',exact:true}).click();await page.getByRole('button',{name:'Reschedule',exact:true}).click();
    const reschedule=page.locator('[data-form="reschedule"]');await reschedule.locator('[name="date"]').fill(newDate);await reschedule.locator('[name="date"]').dispatchEvent('change');const newTime=await reschedule.locator('[name="time"]').inputValue();assert(newTime);
    await reschedule.getByRole('button',{name:'Save new time',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    booking=(await activeSalon()).bookings.find(b=>b.id===booking.id);assert.equal(booking.date,newDate);assert.equal(booking.time,newTime);
    await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();await page.locator('[data-action="cancel-confirm"]').click();
    const salon=await activeSalon();assert.equal(salon.bookings.find(b=>b.id===booking.id).status,'cancelled');assert(salon.emails.some(e=>e.kind==='confirmed')&&salon.emails.some(e=>e.kind==='rescheduled')&&salon.emails.some(e=>e.kind==='cancelled'),'Lifecycle creates local notification previews');await screenshot('customer-booking-cancelled.png');
    await serviceTime(newDate);assert(await page.locator(`[data-action="select-time"][data-time="${newTime}"]`).count()>0,'Cancellation releases slot');
  });
  await scenario('Mobile pages and forms stay within 390 pixels',async()=>{
    await page.setViewportSize({width:390,height:844});
    for(const route of ['calendar','appointments','customers','booking-setup','services','availability','scheduling','notifications','book/service','book/time']) {
      await closeDialogs();await go(route);await expect(page.getByRole('dialog')).toHaveCount(0);await noOverflow(route);await screenshot(`mobile-${route.replace('/','-')}.png`);
    }
    await go('calendar');const menu=page.getByRole('button',{name:'Toggle workspace navigation',exact:true});await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await noOverflow('open owner navigation');await screenshot('mobile-owner-navigation-open.png');
    await menu.click();await expect(menu).toHaveAttribute('aria-expanded','false');await page.getByRole('button',{name:'+ New appointment',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await noOverflow('manual appointment form');await screenshot('mobile-appointment-form.png');await closeDialogs();await expect(page.getByRole('dialog')).toHaveCount(0);
  });
} catch(error) {report.fatal=String(error.stack||error);process.exitCode=1;console.error(report.fatal);}
finally {
  report.finishedAt=new Date().toISOString();report.passed=report.tests.filter(t=>t.status==='passed').length;report.failed=report.tests.filter(t=>t.status==='failed').length;
  await mkdir(qaDir,{recursive:true});await writeFile(path.join(qaDir,'acuity-workflows-report.json'),JSON.stringify(report,null,2));
  await context?.close();await browser?.close();if(server&&server.exitCode===null)server.kill();
  console.log(`QA report: ${path.join(qaDir,'acuity-workflows-report.json')} (${report.passed} passed, ${report.failed} failed)`);
}
