/** Actual owner app, real controls, intercepted synthetic Auth and account APIs only. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./billing-access-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
const boundary=source.indexOf('await mkdir(out,{recursive:true});try{');
if(boundary<0)throw Error('Billing fixture boundary changed');
source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href)).replace('../output/billing-access-','../output/pristine-navigation-');
const checks=String.raw`
async function active(){const fixture=await context();fixture.mock.access=status('active','paid');await login(fixture.page);await expect(fixture.page.locator('.workspace')).toBeVisible();return fixture;}
async function go(page,route){await page.evaluate(route=>{location.hash=route;},route);await expect(page).toHaveURL(new RegExp('#'+route+'$'));}
async function clean(page,save){await expect(save).toBeDisabled();assert.equal(await page.evaluate(()=>JovaDirtyForms.hasChanges(document)),false);await expect(page.locator('[data-unsaved-warning]')).toHaveCount(0);}
async function leaveClean(page){await go(page,'customers');await expect(page.locator('.rf-customers')).toBeVisible();await expect(page.locator('[data-unsaved-warning]')).toHaveCount(0);}
await mkdir(out,{recursive:true});try{
await test('Opening settings sections and focusing or tabbing never creates unsaved changes',async()=>{
 const {ctx,page}=await active();try{await go(page,'settings');const form=page.locator('[data-form=settings]'),save=form.locator('[data-bd-save]');
  for(const section of ['information','hours','rules']){await page.locator('[data-bd-open="'+section+'"]').click();await expect(save).toBeVisible();await clean(page,save);const input=form.locator('[data-bd-section="'+section+'"] input:not([type=hidden]):visible, [data-bd-section="'+section+'"] textarea:visible').first();if(await input.count()){await input.focus();await page.keyboard.press('Tab');await clean(page,save);}await page.locator('[data-bd-open=home]').click();}
  await leaveClean(page);
 }finally{await ctx.close();}
});
await test('Settings edit and revert disables Save and leaves without a prompt; real edit prompts',async()=>{
 const {ctx,page}=await active();try{await go(page,'settings');await page.locator('[data-bd-open=information]').click();const form=page.locator('[data-form=settings]'),name=form.locator('[name=name]'),save=form.locator('[data-bd-save]'),original=await name.inputValue();await name.fill(original+' edited');await expect(save).toBeEnabled();await name.fill(original);await clean(page,save);await leaveClean(page);
  await go(page,'settings');await page.locator('[data-bd-open=information]').click();await page.locator('[data-form=settings] [name=name]').fill(original+' edited');await expect(page.locator('[data-bd-save]')).toBeEnabled();await page.evaluate(()=>{location.hash='customers';});await expect(page.locator('[data-unsaved-warning]')).toBeVisible();await expect(page).toHaveURL(/#settings$/);await page.locator('[data-action=unsaved-keep]').click();await page.locator('[data-form=settings] [name=name]').fill(original);await clean(page,page.locator('[data-bd-save]'));await leaveClean(page);
 }finally{await ctx.close();}
});
await test('Personalise tabs and website sections stay pristine after focus, blur and opening controls',async()=>{
 const {ctx,page}=await active();try{await go(page,'scheduling');const save=page.locator('[data-action=ws-save-personalise]');await clean(page,save);await page.locator('[data-action=bw-setting][data-section=hero]').click();const headline=page.locator('[data-form=bw-website] [name=headline]');await headline.focus();await page.keyboard.press('Tab');await clean(page,save);await page.locator('[data-action=bw-setting][data-section=home]').click();
  await page.locator('[data-action=ws-personalise-section][data-section=booking]').click();await clean(page,save);await page.locator('[data-action=ws-booking-setting][data-section=appearance]').click();const combobox=page.locator('#personalise-booking .jws-trigger').first();if(await combobox.count()){await combobox.click();await page.keyboard.press('Escape');}await clean(page,save);await page.locator('[data-action=ws-personalise-section][data-section=website]').click();await clean(page,save);await leaveClean(page);
 }finally{await ctx.close();}
});
await test('Website and booking page edits revert cleanly, while real booking changes require a leave decision',async()=>{
 const {ctx,page}=await active();try{await go(page,'scheduling');const save=page.locator('[data-action=ws-save-personalise]');await page.locator('[data-action=bw-setting][data-section=hero]').click();const headline=page.locator('[data-form=bw-website] [name=headline]'),oldHeadline=await headline.inputValue();await headline.fill(oldHeadline+' edited');await expect(save).toBeEnabled();await headline.fill(oldHeadline);await clean(page,save);await leaveClean(page);
  await go(page,'scheduling');await page.locator('[data-action=ws-personalise-section][data-section=booking]').click();if(!await page.locator('[data-form=ws-booking-page] [name=title]').isVisible())await page.locator('[data-action=ws-booking-setting][data-section=content]').click();const title=page.locator('[data-form=ws-booking-page] [name=title]'),oldTitle=await title.inputValue();await title.fill(oldTitle+' edited');await expect(save).toBeEnabled();await title.fill(oldTitle);await clean(page,save);await leaveClean(page);
  await go(page,'scheduling');await page.locator('[data-action=ws-personalise-section][data-section=booking]').click();if(!await page.locator('[data-form=ws-booking-page] [name=title]').isVisible())await page.locator('[data-action=ws-booking-setting][data-section=content]').click();await page.locator('[data-form=ws-booking-page] [name=title]').fill(oldTitle+' edited');await expect(save).toBeEnabled();await page.evaluate(()=>{location.hash='customers';});await expect(page.locator('[data-unsaved-warning]')).toBeVisible();await expect(page).toHaveURL(/#scheduling$/);await page.locator('[data-action=unsaved-discard]').click();await expect(page.locator('.rf-customers')).toBeVisible();await expect(page).toHaveURL(/#customers$/);
 }finally{await ctx.close();}
});
await test('One initial customer read supplies 1000 cached rows; search and page navigation cause no new reads',async()=>{
 const {ctx,page,mock}=await context(),reads=[];mock.access=status('active','paid');const rows=Array.from({length:1000},(_,index)=>({id:'customer-'+index,salon_id:sid,name:'Client '+String(index).padStart(4,'0'),email:'client'+index+'@example.test',phone:'',notes:''})),body=JSON.stringify(rows);
 await ctx.route('**/rest/v1/customers?*',route=>{reads.push({url:route.request().url(),rows:rows.length,bytes:Buffer.byteLength(body)});return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});});
 try{await login(page);await expect(page.locator('.workspace')).toBeVisible();await go(page,'customers');await expect(page.locator('.rf-customers h1 .mg-count')).toHaveText('1000');await expect(page.locator('.jg-client-table tbody tr')).toHaveCount(20);assert.equal(reads.length,1);const query=new URL(reads[0].url).searchParams;assert.equal(query.get('limit'),'5000');assert.equal(query.get('select'),'*');assert.equal(query.get('salon_id'),'eq.'+sid);
  await page.locator('#customer-search').fill('Client 0999');await expect(page.locator('.jg-client-table tbody tr')).toHaveCount(1);await expect(page.locator('.jg-client-table')).toContainText('Client 0999');await page.locator('#customer-search').fill('');await expect(page.locator('.jg-client-table tbody tr')).toHaveCount(20);await page.locator('[data-action=list-page][data-direction="1"]').click();await expect(page.locator('.jg-pagination')).toContainText('Page 2 of 50');await go(page,'dashboard');await go(page,'customers');assert.equal(reads.length,1);report.customerReads=reads.map(({url,...measurement})=>({...measurement,query:new URL(url).search}));
 }finally{await ctx.close();}
});
assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.tests.filter(row=>row.passed).length,failed:report.tests.filter(row=>!row.passed).length,errors:report.errors.length}));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
