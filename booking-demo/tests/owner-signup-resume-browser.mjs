/** Verified owner continuation. Fictional records and intercepted endpoints only. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./existing-business-browser.mjs',import.meta.url);let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');const boundary=source.indexOf('await mkdir(out,');if(boundary<0)throw Error('Owner fixture boundary changed');source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 for(const mode of ['matched','slug-conflict','foreign-draft','unverified']){
  const {ctx,page,mock}=await context(390);let creates=0;
  try{
   await ctx.addInitScript(mode=>{localStorage.setItem('jovabook-owner-signup-draft-v1',JSON.stringify({email:mode==='foreign-draft'?'someone-else@example.test':'returning@example.test',name:'Fictional Resume Studio',slug:'fictional-resume-studio',owner:'Returning Owner'}));},mode);
   if(mode==='unverified')mock.userConfirmed=false;
   if(mode==='slug-conflict')await ctx.route('**/rest/v1/rpc/create_business_for_existing_user',async route=>{creates++;if(creates===1)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,field:'slug',message:'This booking address is already taken.'})});mock.access=status('active','trial_active');mock.access.business.status='setup';mock.access.business.name=route.request().postDataJSON().p_name;mock.access.business.slug=route.request().postDataJSON().p_slug;return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,salon_id:sid})});});
   await page.goto(base+'/?portal=owner#login');await page.locator('[name=email]').fill('returning@example.test');await page.locator('[name=password]').fill('FixtureOnly2026');await page.locator('[data-form=login] button.primary').click();
   if(mode==='matched'){await expect(page).toHaveURL(/#setup$/);await expect(page.locator('[data-form=existing-business]')).toHaveCount(0);assert.equal(mock.createBody.p_name,'Fictional Resume Studio');assert.equal(mock.createBody.p_slug,'fictional-resume-studio');assert.equal(mock.calls.filter(p=>p.endsWith('create_business_for_existing_user')).length,1);}
   else if(mode==='slug-conflict'){const f=page.locator('[data-form=existing-business]');await expect(f).toBeVisible();await expect(f.locator('.error')).toContainText('already taken');await expect(f.locator('[name=name]')).toHaveValue('Fictional Resume Studio');await expect(f.locator('[name=slug]')).toHaveValue('fictional-resume-studio');await f.locator('[name=slug]').fill('fictional-resume-retry');await f.locator('button.primary').click();await expect(page).toHaveURL(/#setup$/);assert.equal(creates,2);}
   else if(mode==='foreign-draft'){await expect(page.locator('[data-form=existing-business]')).toBeVisible();await expect(page.locator('[data-form=existing-business] [name=name]')).toHaveValue('');assert(!mock.calls.some(p=>p.endsWith('create_business_for_existing_user')));}
   else{await expect(page.locator('[data-form=login] .error')).toContainText('Verify your email');assert(!mock.calls.some(p=>p.endsWith('create_business_for_existing_user')));}
   console.log('PASS verified owner resume '+mode);
  }finally{await ctx.close();}
 }
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
