import {test,expect} from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../booking-demo/',import.meta.url));
let base,server;
test.beforeAll(async()=>{
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
 server=http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,pathname==='/'?'index.html':'.'+decodeURIComponent(pathname));
  if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
const id='30000000-0000-4000-8000-000000000001';
const sid='20000000-0000-4000-8000-000000000001';
const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
const business={id:sid,name:'Fictional Deposit Studio',slug:'deposit-fixture',address:'Example test address',settings:{hours:{start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]},buffer:0,notice:0,timezone:'Europe/London'},booking_window:{today:new Date().toISOString().slice(0,10),max_date:new Date(Date.now()+75*86400000).toISOString().slice(0,10),days:75,timezone:'Europe/London',server_now:new Date().toISOString()},services:[{id:'haircut',name:'Haircut',price:50,duration:30,staffIds:['owner']}],categories:[],staff:[{id:'owner',name:'Test Owner',active:true,hours:null}],busy:[],payments:{enabled:true,deposit:0,deposit_percent:20},deposit_checkout_available:true};

test('guest deposit checkout and verified return work without calling the unpaid booking RPC',async({page})=>{
 const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*.supabase.co/**',async route=>{const rpc=new URL(route.request().url()).pathname.split('/').at(-1);calls.push(rpc);const data=rpc==='public_salon'?business:rpc==='public_sms_reminder_info'?{available:false,consent_required:true,reminder_hours:24}:null;await route.fulfill({json:data});});
 await page.route('**/api/jovabook/deposits/start',route=>route.fulfill({json:{ok:true,id,stage:'pending',url:'https://checkout.stripe.com/c/pay/fixture'}}));
 await page.route('https://checkout.stripe.com/c/pay/fixture',route=>route.fulfill({contentType:'text/html',body:'<h1>Isolated Stripe checkout fixture</h1>'}));
 await page.route('**/api/jovabook/deposits/status',route=>route.fulfill({json:{ok:true,id,stage:'paid',booking:{id:'bk_'+'a'.repeat(32),serviceName:'Haircut',date,time:'12:00',duration:30,staffId:'owner',status:'confirmed',price:50,deposit:10}}}));
 await page.goto(base+'/?salon=deposit-fixture#book/service');
 await page.locator('[data-action="select-service"][data-id="haircut"]').click();
 const dateInput=page.locator('[data-change="booking-date"]');await dateInput.fill(date);await dateInput.dispatchEvent('change');
 await page.locator('[data-action="select-time"]').first().click();
 await page.getByRole('link',{name:/continue/i}).click();
 await expect(page.getByRole('heading',{name:'How would you like to book?',exact:true})).toBeVisible();
 await expect(page.locator('[data-form="customer-details"]')).toHaveCount(0);
 const guestChoice=page.getByRole('link',{name:'Continue as guest',exact:true});
 await expect(guestChoice).toHaveAttribute('href','#book/details');
 await guestChoice.click();
 await expect(page.getByRole('heading',{name:'Your details',exact:true})).toBeVisible();
 await page.locator('[data-form="customer-details"] [name="name"]').fill('Synthetic Guest');
 await page.locator('[data-form="customer-details"] [name="email"]').fill('guest@example.test');
 await page.locator('[data-form="customer-details"] input[type="checkbox"]').check();
 await page.getByRole('button',{name:'Review booking',exact:true}).click();
 await expect(page.getByText('Deposit due now',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Pay £10.00 deposit',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Pay £10.00 deposit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Isolated Stripe checkout fixture'})).toBeVisible();
 await page.goto(base+'/?salon=deposit-fixture#book/deposit');
 await expect(page.getByRole('heading',{name:'Your booking is confirmed',exact:true})).toBeVisible();
 await expect(page.getByText('Deposit paid',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Your booking is confirmed',exact:true})).toBeVisible();
 expect(calls).not.toContain('create_booking');expect(calls).not.toContain('create_booking_with_sms');expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('pending checkout actions fit a narrow screen and cancellation expires only the unpaid checkout',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const requests=[];let expired=false;
 await page.route('**/*.supabase.co/**',route=>route.fulfill({json:business}));
 await page.route('**/api/jovabook/deposits/status',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  if(body.cancel)expired=true;
  await route.fulfill({json:{ok:true,id,stage:expired?'expired':'pending',...(expired?{}:{url:'https://checkout.stripe.com/c/pay/fixture'})}});
 });
 await page.addInitScript(({id})=>sessionStorage.setItem('jovabook-deposit-deposit-fixture',JSON.stringify({id,request_id:id,verifier:'a'.repeat(64)})),{id});
 await page.goto(base+'/?salon=deposit-fixture#book/deposit');
 await expect(page.getByRole('link',{name:'Continue payment',exact:true})).toBeVisible();
 for(const name of ['Cancel checkout','Check payment'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Cancel checkout',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Checkout cancelled',exact:true})).toBeVisible();
 expect(requests.filter(r=>r.cancel===true)).toHaveLength(1);
 await expect(page.getByRole('link',{name:'Continue payment',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('deposit settings are readable on mobile and show unsaved changes before saving',async({page})=>{
 await page.route(base+'/deposit-settings-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/deposits.css"><main id="app" style="max-width:1080px;margin:auto;padding:20px"></main><div id="modal-root"></div><script src="/dirty-forms.js"></script><script src="/deposits.js"></script>'}));
 await page.goto(base+'/deposit-settings-fixture');
 await page.evaluate(({sid})=>{
  const salon={id:sid,slug:'fixture-studio',name:'Test Business'};window.savedDeposit=null;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let module;const draw=()=>document.getElementById('app').innerHTML=module.page();
  module=window.JovaDeposits.create({salon:()=>salon,esc:escape,money:n=>'£'+Number(n||0).toFixed(2),isLive:()=>true,ownerIdentity:()=>sid,render:draw,integrationRequest:async(path,body)=>({ok:true,data:{ok:true,salon_id:sid,connected:true,ready:true,payments:{enabled:true,deposit:0,deposit_percent:body.deposit_percent??20}}}),depositsSaved:(id,p)=>{window.savedDeposit=p.deposit_percent;},toast:()=>{},error:(form,message)=>form.querySelector('.error').textContent=message});
  document.addEventListener('submit',event=>{event.preventDefault();module.submit(event.target.dataset.form,event.target,Object.fromEntries(new FormData(event.target)));});
  location.hash='payments';draw();
 },{sid});
 await expect(page.getByLabel('Deposit percentage (%)',{exact:true})).toBeEnabled();
 await page.getByLabel('Deposit percentage (%)',{exact:true}).fill('30');
 await expect(page.locator('[data-form="jd-settings"]')).toHaveAttribute('data-dirty','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.savedDeposit)).toBe(30);
 await expect(page.getByLabel('Deposit percentage (%)',{exact:true})).toHaveValue('30');
});

test('refunded and exceptional deposits do not invite another payment',async({page})=>{
 await page.route('**/*.supabase.co/**',route=>route.fulfill({json:business}));
 let stage='needs_attention';await page.route('**/api/jovabook/deposits/status',route=>route.fulfill({json:{ok:true,id,stage}}));
 await page.addInitScript(({id})=>sessionStorage.setItem('jovabook-deposit-deposit-fixture',JSON.stringify({id,request_id:id,verifier:'a'.repeat(64)})),{id});
 await page.goto(base+'/?salon=deposit-fixture#book/deposit');
 await expect(page.getByRole('heading',{name:'Contact the business',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Continue payment',exact:true})).toHaveCount(0);
 stage='refunded';await page.getByRole('button',{name:'Check payment',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your deposit was refunded',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check payment',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Continue payment',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
