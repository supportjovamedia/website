/** Public guest/account choice with actual scripts and local-only fictional APIs. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium,expect} from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),errors=[],external=[],calls=[];
const {pathToRegexp}=createRequire(import.meta.url)('next/dist/compiled/path-to-regexp'),rewrite=pathToRegexp(JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8')).rewrites.find(r=>r.destination==='/index.html').source);
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,pathname==='/'||rewrite.test(pathname)?'index.html':'.'+decodeURIComponent(pathname));assert(file.startsWith(root+path.sep));const bytes=await readFile(file);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const today='2026-11-02',date='2026-11-12',owner={access_token:'fixture-owner-token',refresh_token:'fixture-owner-refresh',expires_at:Date.now()/1000+3600,user:{id:'30000000-0000-4000-8000-000000000001'}};
const salon={id:'20000000-0000-4000-8000-000000000001',slug:'choice-studio',name:'Fictional Choice Studio',settings:{timezone:'Europe/London',hours:{start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]}},staff:[{id:'staff',name:'Fictional Professional',active:true}],services:[{id:'visit',name:'Fictional visit',duration:30,price:25,staffIds:['staff']}],categories:[],busy:[],payments:{enabled:false,deposit:0},booking_window:{today,max_date:'2027-01-16',days:75,timezone:'Europe/London',server_now:today+'T12:00:00Z'}};
let browser;
async function create(width,demo=false){
 const context=await browser.newContext({viewport:{width,height:950}});
 await context.addInitScript(value=>{if(location.protocol==='http:')localStorage.setItem('jovabook-auth',JSON.stringify(value));},owner);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external.push(req.url());return route.abort();}
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:`window.JOVA_SUPABASE={url:'${base}/mock',key:'fictional-public'};`});
  if(!url.pathname.startsWith('/mock/'))return route.continue();
  const name=url.pathname.split('/').at(-1),body=req.postDataJSON();calls.push({name,body});
  const answer=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  if(name==='public_salon')return answer(salon);
  if(name==='public_sms_reminder_info')return answer({available:false,consent_required:true,reminder_hours:24});
  if(name==='create_booking')return answer({ok:true,booking:{id:'bk_'+'a'.repeat(32),date:body.p_date,time:body.p_time,duration:30,staffId:'staff',serviceName:'Fictional visit',price:25,deposit:0}});
  errors.push('Unexpected API '+url.pathname);return answer({ok:false});
 });
 const page=await context.newPage();page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(String(error)));await page.clock.setFixedTime(new Date(today+'T12:00:00Z'));
 await page.goto(base+'/?'+(demo?'demo=jova-demo':'salon=choice-studio')+'#book/service');
 return {context,page};
}
async function choose(page){await page.locator('[data-action=select-service]').first().click();await page.locator('[data-change=booking-date]').fill(date);await page.locator('[data-change=booking-date]').dispatchEvent('change');const slot=page.locator('[data-action=select-time]').first(),time=await slot.getAttribute('data-time');await slot.click();await page.getByRole('link',{name:'Continue',exact:true}).click();await expect(page.getByRole('heading',{name:'How would you like to book?',exact:true})).toBeVisible();return time;}
async function noOverflow(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');}
try{
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 for(const width of [1440,390,360]){
  const {context,page}=await create(width);try{
   const time=await choose(page),summary=await page.locator('.booking-layout>aside').innerText(),bookingUrl=page.url();await noOverflow(page);await expect(page.locator('input[type=password]')).toHaveCount(0);
   for(const [label,route] of [['Log in','login'],['Create account','register']]){
    const link=page.locator('.booking-layout>section').getByRole('link',{name:label,exact:true}),url=new URL(await link.getAttribute('href'));
    assert.equal(url.pathname,'/'+salon.slug+'/account/'+route);assert.equal(url.search,'');assert.equal(url.hash,'');await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel',/noopener/);
    const popupPromise=context.waitForEvent('page');await link.click();const popup=await popupPromise;popup.on('pageerror',error=>errors.push(String(error)));await popup.waitForLoadState();await expect(popup.locator('[data-cp-form='+route+']')).toBeVisible();assert.equal(await popup.evaluate(()=>window.opener),null);assert.equal(page.url(),bookingUrl);assert.equal(await page.locator('.booking-layout>aside').innerText(),summary);assert.equal(await popup.evaluate(()=>localStorage.getItem('jovabook-auth')),JSON.stringify(owner));await popup.close();
   }
   await page.getByRole('link',{name:'Back to date and time',exact:true}).click();await expect(page.locator('[data-change=booking-date]')).toHaveValue(date);await expect(page.locator('[data-action=select-time][data-time="'+time+'"]')).toHaveAttribute('aria-pressed','true');await page.getByRole('link',{name:'Continue',exact:true}).click();await page.getByRole('link',{name:'Continue as guest',exact:true}).click();
   const form=page.locator('[data-form=customer-details]');await expect(form).toBeVisible();await noOverflow(page);await form.locator('[name=name]').fill('Fictional Guest');await form.locator('[name=email]').fill('guest@example.test');await form.locator('input[type=checkbox][required]').check();await form.getByRole('button',{name:'Review booking',exact:true}).click();await page.locator('[data-action=confirm-booking]').click();await expect(page.getByRole('heading',{name:'You’re booked in.',exact:true})).toBeVisible();
   const saved=calls.findLast(call=>call.name==='create_booking');assert.equal(saved.body.p_slug,salon.slug);assert.equal(saved.body.p_service,'visit');assert.equal(saved.body.p_date,date);assert.equal(saved.body.p_time,time);assert.equal(await page.evaluate(()=>localStorage.getItem('jovabook-auth')),JSON.stringify(owner));await noOverflow(page);console.log('PASS guest/account choice '+width);
  }finally{await context.close();}
 }
 const start=calls.length,{context,page}=await create(360,true);try{await choose(page);await expect(page.getByText('Customer accounts are unavailable in this demo.',{exact:false})).toBeVisible();await expect(page.locator('a[href*="portal=customer"]')).toHaveCount(0);await page.getByRole('link',{name:'Continue as guest',exact:true}).click();await expect(page.locator('[data-form=customer-details]')).toBeVisible();await noOverflow(page);assert.equal(calls.length,start,'Demo does not call live APIs');console.log('PASS demo guest choice without Auth');}finally{await context.close();}
 assert(!calls.some(call=>/token|signup|recover|portal_identity|customer_/.test(call.name)),'Guest choice and account page openings never submit Auth/customer data');assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
