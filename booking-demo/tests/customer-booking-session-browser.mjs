/** Isolated customer checkout identity proof. All network is local/mocked. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
const boundary=source.indexOf('try{await mkdir(out,');if(boundary<0)throw Error('Public fixture boundary changed');
source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const kind of ['verified','owner','expired','foreign-member','foreign-business']){
  const saved=kind==='expired'?{...session(),expires_at:1}:session(kind==='owner'?'owner-token':'customer-token');
  const {context,page,control}=await make(390,{saved,owner:true});
  try{
   if(kind==='owner')control.role='owner';if(kind==='foreign-member')control.member=false;
   const target=kind==='foreign-business'?'another-studio':slug;
   await page.goto(base+'/'+target+'/book');
   await expect(page.locator('.cp-public-link')).toHaveText(kind==='verified'?'My portal':'Log in');
   await page.locator('[data-action=select-service]').click();await page.locator('[data-action=select-time]').first().click();await page.getByRole('link',{name:'Continue',exact:true}).click();
   if(kind==='verified'){
    const form=page.locator('[data-form=customer-details]');await expect(form).toBeVisible();await expect(page.getByRole('heading',{name:'How would you like to book?'})).toHaveCount(0);await expect(form.locator('[name=name]')).toHaveValue('Alex Client');await expect(form.locator('[name=email]')).toHaveValue('customer@example.test');await expect(form.locator('[name=email]')).toHaveAttribute('readonly','');
    await form.locator('[name=phone]').fill('+44 (0)7700 900123');await form.locator('[name=email]').evaluate(el=>{el.removeAttribute('readonly');el.value='forged@example.test';});await form.locator('[type=checkbox]').check();await form.locator('button.primary').click();await expect(page.getByRole('heading',{name:'Review your booking'})).toBeVisible();
    const request=page.waitForRequest(req=>new URL(req.url()).pathname.endsWith('/create_booking'));await page.locator('[data-action=confirm-booking]').click();const data=(await request).postDataJSON();assert.equal(data.p_email,'customer@example.test');assert.equal(data.p_phone,'+44 (0)7700 900123');
   }else{await expect(page.getByRole('heading',{name:'How would you like to book?'})).toBeVisible();await page.getByRole('link',{name:'Continue as guest'}).click();await expect(page.locator('[name=email]')).toHaveValue('');await expect(page.locator('[name=name]')).toHaveValue('');}
   assert(await page.evaluate(()=>localStorage.getItem('jovabook-auth')));console.log('PASS customer checkout '+kind);
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log('PASS no external requests or live messages');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
