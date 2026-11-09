/* Reuse the real-app account fixture; every API and authentication request is intercepted. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./billing-access-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
const boundary=source.indexOf('await mkdir(out,{recursive:true});try{');
if(boundary<0)throw Error('Billing fixture boundary changed');
source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href)).replace('../output/billing-access-','../output/dirty-save-app-');
const checks=String.raw`
await mkdir(out,{recursive:true});try{
await test('Real settings and Personalise Save are disabled until edits and disabled after reverting',async()=>{
 const {ctx,page,mock}=await context(390);mock.access=status('active','paid');
 try{
  await login(page);await expect(page.locator('.workspace')).toBeVisible();
  await page.goto(base+'/#settings');await page.locator('[data-bd-open=information]').click();
  const form=page.locator('[data-form=settings]'),save=form.locator('[data-bd-save]'),name=form.locator('[name=name]');
  await expect(save).toBeDisabled();const original=await name.inputValue();await name.fill(original+' edited');await expect(save).toBeEnabled();await name.fill(original);await expect(save).toBeDisabled();
  await page.goto(base+'/#scheduling');await expect(page.locator('.jg-personalise')).toBeVisible();
  await page.locator('[data-action=ws-personalise-section][data-section=booking]').click();
  const proxy=page.locator('[data-action=ws-save-personalise]');await expect(proxy).toBeDisabled();
  const booking=page.locator('[data-form=ws-booking-page]'),field=booking.locator('[name=buttonLabel]');
  await field.evaluate(node=>{node.value+=' edited';node.dispatchEvent(new Event('input',{bubbles:true}));});await expect(proxy).toBeEnabled();
  await field.evaluate(node=>{node.value=node.value.replace(/ edited$/,'');node.dispatchEvent(new Event('input',{bubbles:true}));});await expect(proxy).toBeDisabled();
  await shot(page,'personalise-pristine-390.png');
 }finally{await ctx.close();}
});
assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.tests.filter(row=>row.passed).length,failed:report.tests.filter(row=>!row.passed).length,errors:report.errors.length}));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
