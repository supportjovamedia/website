/** Isolated navigation and calendar interaction regression. No external services. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),external=[],errors=[],delayedFocus=process.env.MODAL_FOCUS_RACE!=='0';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));assert(file.startsWith(root+path.sep));res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 // Delayed initial focus models a busy browser task queue deterministically.
 if(delayedFocus)await context.addInitScript(()=>{
  const schedule=window.setTimeout.bind(window);window.__dialogFocusScheduled=0;window.__dialogFocusCompleted=0;
  window.setTimeout=(callback,delay,...args)=>{
   if(delay!==0||typeof callback!=='function'||!String(callback).includes('focus'))return schedule(callback,delay,...args);
   const sequence=++window.__dialogFocusScheduled;return schedule(()=>{callback(...args);window.__dialogFocusCompleted=sequence;},120);
  };
 });
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base+'/#login');await page.locator('[name=email]').fill('demo@jovamedia.com');await page.locator('[name=password]').fill('Salon2026');await page.locator('[data-form=login] button.primary').click();await expect(page).toHaveURL(/#dashboard$/);
 // Saving an editor while its leave warning is present must not orphan navigation.
 await page.goto(base+'/#customers');await page.locator('[data-action=add-customer]').click();
 const client=page.locator('[data-form=customer]');await client.locator('[name=name]').fill('Navigation QA');await client.locator('[name=email]').fill('navigation@example.test');
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await expect(page.locator('[data-unsaved-warning]')).toBeVisible();
 await client.locator('button.primary').click();await expect(page.locator('#modal-root .modal')).toHaveCount(0);
 await page.locator('a[href="#calendar"]').first().click();await expect(page).toHaveURL(/#calendar$/);await expect(page.locator('.db-calendar-page')).toBeVisible();
 console.log('PASS saved editor with warning leaves navigation usable');
 if(process.env.NAVIGATION_ONLY==='1'){assert.deepEqual(errors,[]);assert.deepEqual(external,[]);}
 else {
  const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jovabook-essential-demo-v2')).salons.find(s=>s.id==='drink'));
  const before=await snapshot(),date=new Date(Date.now()+14*86400000).toLocaleDateString('en-CA',{timeZone:'Europe/London'});
  await page.locator('[data-change=calendar-date]').fill(date);await page.locator('[data-change=calendar-date]').dispatchEvent('change');
  await page.locator('[data-action=cal-view][data-value=day]').click();
  const slot=page.locator('.dg-col [data-action=calendar-slot]:enabled').filter({has:page.locator('span')});
  // Find a truly free start for the default service and keep the selected column.
  let picked;
  for(let i=0;i<Math.min(await slot.count(),100);i++){
   const candidate=slot.nth(i),data=await candidate.evaluate(el=>({...el.dataset}));
   await candidate.scrollIntoViewIfNeeded();
   if(!await candidate.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}))continue;
   await candidate.click();
   const form=page.locator('[data-form=manual-booking]');
   if(await form.locator('[name=time]').inputValue()===data.time){picked=data;await expect(form.locator('[name=date]')).toHaveValue(data.date);await expect(form.locator('[name=staffId]')).toHaveValue(data.staff);await page.keyboard.press('Escape');break;}
   await page.keyboard.press('Escape');
  }
  assert(picked,'A free day slot prefilled the precise selected time');
  await page.locator('.dg-col [data-action=calendar-slot][data-staff="'+picked.staff+'"][data-time="'+picked.time+'"]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-form=manual-booking] [name=time]')).toHaveValue(picked.time);await page.keyboard.press('Escape');
  assert.deepEqual(await snapshot(),before,'Cancelling new booking must not change business data');
  // Genuine draft guards, focus restoration and sidebar navigation still work.
  await page.locator('.dg-col [data-action=calendar-slot][data-staff="'+picked.staff+'"][data-time="'+picked.time+'"]').click();
  const form=page.locator('[data-form=manual-booking]');await form.locator('[name=name]').fill('Keep this draft');
  if(delayedFocus){const scheduled=await page.evaluate(()=>window.__dialogFocusScheduled);await expect.poll(()=>page.evaluate(()=>window.__dialogFocusCompleted)).toBeGreaterThanOrEqual(scheduled);}
  await expect(form.locator('[name=name]')).toBeFocused();await page.keyboard.press('Escape');
  await expect(page.locator('[data-unsaved-warning]')).toBeVisible();await page.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(form.locator('[name=name]')).toHaveValue('Keep this draft');await expect(form.locator('[name=name]')).toBeFocused();
  await page.goto(base+'/#services');await expect(page.locator('[data-unsaved-warning]')).toBeVisible();await expect(page).toHaveURL(/#calendar$/);
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();await expect(page).toHaveURL(/#services$/);assert.deepEqual(await snapshot(),before);
  await page.locator('a[href="#calendar"]').first().click();
  // Existing events retain their normal booking-details action.
  const event=page.locator('.dg-event').first();
  assert(await event.count(),'Fixture date has existing bookings');await event.click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('[data-form=manual-booking]')).toHaveCount(0);await page.keyboard.press('Escape');
  // Select one member, preserve that filter through month/day transitions.
  await page.locator('.st-calendar-filter>summary').click();await page.locator('[data-change=calendar-staff][value=all]').uncheck();await page.locator('[data-change=calendar-staff][value="'+picked.staff+'"]').check();await page.locator('.st-calendar-filter>summary').click();
  await page.locator('[data-action=cal-view][data-value=month]').click();
  let day=page.locator('.mday[data-date="'+date+'"]');await day.click({button:'right'});await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#modal-root [data-action=calendar-slot]').click();await expect(form.locator('[name=date]')).toHaveValue(date);await expect(form.locator('[name=staffId]')).toHaveValue(picked.staff);await page.keyboard.press('Escape');
  await day.focus();await page.keyboard.press('Shift+F10');await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#modal-root [data-action=cal-goto]').click();await expect(page.locator('.dg-staff')).toHaveCount(1);await expect(page.locator('[data-change=calendar-date]')).toHaveValue(date);
  await page.locator('[data-action=cal-view][data-value=week]').click();const weekSlot=page.locator('[data-action=calendar-slot][data-date="'+date+'"][data-time="'+picked.time+'"]');await weekSlot.click();await expect(form.locator('[name=date]')).toHaveValue(date);await expect(form.locator('[name=time]')).toHaveValue(picked.time);await expect(form.locator('[name=staffId]')).toHaveValue(picked.staff);await page.keyboard.press('Escape');
  await page.locator('[data-action=cal-view][data-value=month]').click();await day.click();await expect(page.locator('.dg-staff')).toHaveCount(1);await expect(page.locator('[data-action=cal-view][data-value=day]')).toHaveAttribute('aria-pressed','true');
  // Touch has the same ordinary day tap plus the existing explicit booking button.
  await page.setViewportSize({width:390,height:844});await page.locator('[data-action=new-booking]').click();await expect(form.locator('[name=date]')).toHaveValue(date);await expect(form.locator('[name=staffId]')).toHaveValue(picked.staff);await page.keyboard.press('Escape');
  assert.deepEqual(await snapshot(),before);console.log('PASS day/week exact slots, cancel, dirty guard, booking events, month context/keyboard, filters and mobile button');
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touch.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
  const phone=await touch.newPage();phone.on('pageerror',error=>errors.push(String(error)));
  await phone.goto(base+'/#login');await phone.locator('[name=email]').fill('demo@jovamedia.com');await phone.locator('[name=password]').fill('Salon2026');await phone.locator('[data-form=login] button.primary').tap();await expect(phone).toHaveURL(/#dashboard$/);
  await phone.goto(base+'/#calendar');await phone.locator('[data-change=calendar-date]').fill(date);await phone.locator('[data-change=calendar-date]').dispatchEvent('change');await phone.locator('[data-action=cal-view][data-value=month]').tap();await phone.locator('.mday[data-date="'+date+'"]').tap();await expect(phone.locator('[data-action=cal-view][data-value=day]')).toHaveAttribute('aria-pressed','true');await phone.locator('[data-action=new-booking]').tap();await expect(phone.locator('[data-form=manual-booking] [name=date]')).toHaveValue(date);await phone.getByRole('button',{name:'Close dialog',exact:true}).tap();await expect(phone.locator('#modal-root .modal')).toHaveCount(0);await touch.close();console.log('PASS mobile touch month/day/new booking/cancel');
 }
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
