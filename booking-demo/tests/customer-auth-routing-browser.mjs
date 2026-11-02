/** Verified auth navigation, contextual reset return links, no live requests. */
import {readFile} from 'node:fs/promises';const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');const boundary=source.indexOf('try{await mkdir(out,');if(boundary<0)throw Error('Public fixture boundary changed');source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 {
 const {context,page}=await make(390,{saved:session()});let sends=0;
 await context.route('**/api/jovabook/customer/recovery',route=>{assert.equal(new URL(route.request().url()).origin,'https://www.jovamedia.com');assert.deepEqual(route.request().postDataJSON(),{salon:slug,email:'customer@example.test'});sends++;return route.fulfill({contentType:'application/json',body:'{"ok":true}'});});
 try{
  for(const route of ['login','register']){await page.goto(base+'/'+slug+'/account/'+route);await expect(page.getByRole('heading',{name:'My account',exact:true})).toBeVisible();await expect(page).toHaveURL(base+'/'+slug+'/account/profile');}
  await page.goto(base+'/'+slug+'/account/forgot');await expect(page.locator('[name=email]')).toHaveValue('customer@example.test');await expect(page.getByRole('link',{name:'Back to account',exact:true})).toHaveAttribute('href',base+'/'+slug+'/account/profile');assert.equal(sends,0);await page.getByRole('button',{name:'Send reset link'}).click();await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();await expect(page.getByRole('link',{name:'Back to account',exact:true})).toBeVisible();assert.equal(sends,1);
  await page.goto(base+'/'+slug+'/account/reset');await expect(page.getByRole('heading',{name:'Reset link unavailable'})).toBeVisible();await expect(page.getByRole('link',{name:'Back to account',exact:true})).toBeVisible();
  await page.goto(base+'/'+slug+'/account/login'+jwt('recovery'));await expect(page.getByRole('heading',{name:'Choose a new password'})).toBeVisible();await expect(page.getByRole('link',{name:'Back to account',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to account',exact:true}).click();await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();await page.goto(base+'/'+slug+'/account/register');await expect(page.locator('[data-cp-form=register]')).toBeVisible();console.log('PASS verified login/register redirect account, canonical reset endpoint, contextual forgot/sent/reset links, logout');
 }finally{await context.close();}
 }
 for(const kind of ['forged','expired','owner','foreign-member','signedout']){
 const saved=kind==='signedout'?undefined:kind==='expired'?{...session(),expires_at:1,refresh_token:''}:session(kind==='owner'?'owner-token':kind==='forged'?'forged':'customer-token');const {context,page,control}=await make(390,{saved});if(kind==='foreign-member')control.member=false;
 try{await page.goto(base+'/'+slug+'/account/login');await expect(page.locator('[data-cp-form=login]')).toBeVisible();await expect(page.getByRole('heading',{name:'My account',exact:true})).toHaveCount(0);await page.goto(base+'/'+slug+'/account/forgot');await expect(page.getByRole('link',{name:'Back to log in',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Back to account',exact:true})).toHaveCount(0);await expect(page.locator('[name=email]')).toHaveValue('');console.log('PASS unverified auth navigation '+kind);}finally{await context.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log('PASS no live email or external traffic');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
