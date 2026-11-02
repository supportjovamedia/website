/** Local-only account presentation and retired payment entry-point proof. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');const boundary=source.indexOf('try{await mkdir(out,');if(boundary<0)throw Error('Public fixture boundary changed');source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});const {context,page}=await make(390,{saved:session()});let resetRequests=0;
 await context.route('**/api/jovabook/customer/recovery',route=>{resetRequests++;return route.fulfill({contentType:'application/json',body:'{"ok":true}'});});
 try{
  for(const address of [base+'/'+slug+'/account/payments',base+'/?portal=customer&salon='+slug+'#customer/payments']){await page.goto(address);await expect(page.getByRole('heading',{name:'My bookings',exact:true})).toBeVisible();await expect(page).toHaveURL(base+'/'+slug+'/account');await expect(page.getByRole('link',{name:'Payment methods',exact:true})).toHaveCount(0);}
  for(const address of [base+'/'+slug+'/account/profile',base+'/?portal=customer&salon='+slug+'#customer/profile']){await page.goto(address);await expect(page.getByRole('heading',{name:'My account',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'My account',exact:true})).toBeVisible();}await page.getByRole('link',{name:'My account',exact:true}).click();await expect(page.getByRole('heading',{name:'My account',exact:true})).toBeVisible();await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Alex Client');await expect(page.getByLabel('Verified email',{exact:true})).toHaveValue('customer@example.test');await expect(page.getByLabel('Verified email',{exact:true})).toHaveAttribute('readonly','');assert.equal(resetRequests,0);
  await page.evaluate(()=>{const form=document.createElement('form');form.dataset.cpForm='payments';form.innerHTML='<button>Forged payment setup</button>';document.querySelector('#app').append(form);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});await expect(page.getByRole('heading',{name:'My account',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Reset password',exact:true}).click();await expect(page.locator('[data-cp-form=forgot] [name=email]')).toHaveValue('customer@example.test');assert.equal(resetRequests,0);await page.getByRole('button',{name:'Send reset link',exact:true}).click();await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();assert.equal(resetRequests,1);
  assert(!calls.some(c=>/payment-status|payment-method/.test(c.name)));assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log('PASS retired payment URLs, no payment setup, readonly account profile, explicit reset confirmation; no external traffic');
 }finally{await context.close();}
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
