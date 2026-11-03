/* Real portal controls with isolated local responses. No email, Stripe or live database traffic. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
source=source.slice(0,source.indexOf('try{await mkdir(out,')).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{browser=await chromium.launch({headless:true,channel:'chrome'});await mkdir(path.join(root,'../output'),{recursive:true});
 for(const width of [1440,390,320]){
  const {context,page}=await make(width,{saved:session()});let phone='07700 900123',writes=0;
  const now=Date.parse('2026-11-03T09:00:00Z'),booking=(id,date,time,status='confirmed')=>({id,date,time,status,service_name:id,staff_name:'Alex',price:25,duration:45,can_cancel:false,cancellation_cutoff:'2026-11-02T10:00:00Z',ends_at:date+'T'+time+':00Z'});
  await context.route('**/mock/rest/v1/rpc/customer_portal_bookings',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,server_now:new Date(now).toISOString(),business:{name:salon.name,slug,phone:'020 7946 0123',email:'hello@studio.example.test',timezone:'Europe/London'},customer:{email:'customer@example.test',first_name:'Alex',last_name:'Client',phone},bookings:[booking('Tomorrow','2026-11-04','10:00'),booking('Today','2026-11-03','10:00'),booking('Yesterday','2026-11-02','10:00'),booking('Cancelled','2026-11-05','10:00','cancelled')]})}));
  await context.route('**/mock/rest/v1/rpc/customer_portal_register',r=>{phone=r.request().postDataJSON().p_phone;writes++;return r.fulfill({contentType:'application/json',body:'{"ok":true}'});});
  try{
   await page.goto(base+'/'+slug+'/account/profile');await expect(page.locator('[name=phone]')).toBeVisible();await expect(page.locator('[name=phone]')).toHaveValue(phone);await expect(page).toHaveTitle('My account · Choice Studio');
   const form=page.locator('[data-cp-form=account]');await form.locator('[name=phone]').fill('abc');await form.getByRole('button',{name:'Save details',exact:true}).click();await expect(form.locator('.cp-error')).toContainText('7 to 15 digits');assert.equal(writes,0);
   await form.locator('[name=phone]').fill('+44 7700 900456');await form.getByRole('button',{name:'Save details',exact:true}).click();await expect(page.locator('.cp-notice')).toContainText('Your details have been updated');await expect(page.locator('[name=phone]')).toHaveValue('+44 7700 900456');assert.equal(writes,1);
   await page.reload();await expect(page.locator('[name=phone]')).toHaveValue('+44 7700 900456');
   const spacing=await page.locator('.cp-account').evaluate(el=>({heading:el.querySelector('h2').getBoundingClientRect().bottom,first:el.querySelector('form').getBoundingClientRect().top}));assert(spacing.first-spacing.heading>=20);
   for(const target of await page.locator('.cp-portal a,.cp-portal button').all()){const box=await target.boundingBox();assert(box.height>=44-0.1,await target.textContent());}
   await fit(page);await page.screenshot({path:path.join(root,'../output/customer-account-'+width+'.png'),fullPage:true});
   await page.getByRole('link',{name:'My bookings',exact:true}).click();await expect(page.locator('.cp-booking-group').first().locator('h3')).toHaveText(['Today','Tomorrow']);await expect(page.locator('.cp-booking-group').last().locator('h3')).toHaveText(['Cancelled','Yesterday']);
   await expect(page.locator('.cp-booking').first()).toContainText('£25.00');await expect(page.locator('.cp-booking').first()).toContainText('45 minutes');await expect(page.locator('.cp-booking').first().locator('a[href="tel:02079460123"]')).toBeVisible();await expect(page.locator('.cp-booking').first().locator('a[href="mailto:hello@studio.example.test"]')).toBeVisible();
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');await fit(page);await page.screenshot({path:path.join(root,'../output/customer-bookings-'+width+'.png'),fullPage:true});
   await page.getByRole('link',{name:'My account',exact:true}).click();await page.getByRole('link',{name:'Reset password',exact:true}).click();await expect(page).toHaveTitle('Reset password · Choice Studio');await expect(page.getByRole('link',{name:'Back to account',exact:true})).toBeVisible();
   await page.getByRole('link',{name:'Book now',exact:true}).click();await expect(page.locator('[data-action=select-service]')).toBeVisible();await expect(page.locator('meta[data-customer-portal]')).toHaveCount(0);
   console.log('PASS account phone, chronological groups, contacts, spacing and tap sizes '+width);
  }finally{await context.close();}
 }
 {const {context,page}=await make();try{
   let release;const held=new Promise(r=>release=r);await context.route('**/mock/rest/v1/rpc/public_salon',async r=>{await held;return r.fulfill({contentType:'application/json',body:JSON.stringify(salon)});});
   await page.goto(base+'/'+slug+'/account/login');await expect(page.locator('.cp-brand-placeholder')).toBeVisible();assert(!await page.locator('.cp-header').innerText().then(v=>v.includes('Your customer account')));release();await expect(page).toHaveTitle('Log in · Choice Studio');
   for(const [path,title] of [['login','Log in'],['register','Create an account'],['forgot','Reset password']]){await page.goto(base+'/'+slug+'/account/'+path);await expect(page).toHaveTitle(title+' · Choice Studio');await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, nofollow');for(const a of await page.locator('.cp-portal a').all())assert((await a.boundingBox()).height>=44-0.1);}
   console.log('PASS guest titles, noindex, links and business-name loading');
  }finally{await context.close();}}
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+checks).toString('base64'));
