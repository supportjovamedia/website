/* Actual DOM regression: all requests are served from local source, no accounts or APIs. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'..','output','signup-save-regression');
const browser=await chromium.launch({channel:'chrome',headless:true});
let passed=0;
async function fixture(width=390){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='save-fixture.local')return route.abort();
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(root+path.sep))return route.abort();
  try{await route.fulfill({body:await readFile(target),contentType:target.endsWith('.css')?'text/css':target.endsWith('.js')?'text/javascript':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(()=>{
  const Native=MutationObserver;window.fixtureObserver={callbacks:0,capped:false};
  window.MutationObserver=class extends Native{constructor(callback){super((...args)=>{if(++window.fixtureObserver.callbacks>150){window.fixtureObserver.capped=true;this.disconnect();return;}callback(...args);});}};
 });
 await page.goto('http://save-fixture.local/tests/fixtures/save-controls.html');
 await page.evaluate(()=>window.fixtureStylesReady);
 return page;
}
const settle=page=>page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,30)));
async function mount(page){
 await page.evaluate(()=>{
  document.querySelector('#app').innerHTML=`<div class="shell"><form data-form="settings"><input name="name" value="Saved"><button type="submit" class="primary">Save changes</button></form><form data-form="staff" data-dirty="false"><input name="staff" value="Sam"><button type="submit" class="primary">Save staff</button></form><section class="jg-personalise"><button type="button" data-action="ws-save-personalise">Save changes</button><div class="jg-personalise-section"><form data-form="bw-website" data-dirty="false"><input name="website" value="Saved"><button type="submit" class="primary">Save website</button></form></div></section><form data-form="owner-series"><input name="session" value="One"><button type="submit" class="primary">Continue</button></form><form data-form="workspace-appearance"><input name="theme" value="Light"><button type="submit" class="primary">Apply theme</button></form><form data-form="sr-message" data-dirty="true"><textarea name="message">Preserved failed draft</textarea><button class="primary">Save message</button></form></div>`;
  window.JovaDirtyForms.scan();
 });await settle(page);
}
try{
 await test('Signup Continue remains separate from Save controls through Saving and recovery at mobile and desktop sizes',async()=>{
  await mkdir(output,{recursive:true});
  for(const width of [360,390,1440]){
   const page=await fixture(width);
   try{
    const button=page.locator('form button.primary');await expect(button).toBeEnabled();
    for(const label of ['Saving...','Continue']){
     await button.evaluate((node,label)=>{node.textContent=label;node.disabled=label==='Saving...';},label);await settle(page);
     assert.equal(await page.locator('.df-save-bar,.df-save-indicator,.df-save-status').count(),0);
     const box=await button.boundingBox(),form=await page.locator('form').boundingBox();assert(Math.abs(box.width-form.width)<2,'Continue keeps its full form width');
    }
    await expect(button).toBeEnabled();
    const input=page.locator('[name=booking_slug]');assert.equal(await input.evaluate(node=>getComputedStyle(node).borderTopWidth),'0px');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await button.evaluate(node=>{node.textContent='Saving...';node.disabled=true;});await settle(page);
    await page.screenshot({path:path.join(output,`signup-saving-${width}.png`),fullPage:true});
    assert.equal(await page.evaluate(()=>window.fixtureObserver.capped),false);
   }finally{await page.close();}
  }passed++;
 });
 await test('Genuine Save enables only on edits and remains dirty after failure, then disables on revert or success',async()=>{
  const page=await fixture();try{await mount(page);
   const form=page.locator('[data-form=settings]'),save=form.locator('button');await expect(save).toBeDisabled();
   await form.locator('input').fill('Changed');await expect(save).toBeEnabled();
   await page.evaluate(()=>window.JovaDirtyForms.refreshSaveIndicators());await expect(save).toBeEnabled();
   await expect(form.locator('.df-save-indicator')).toHaveText('Unsaved changes');
   assert.equal(await save.locator('.df-save-indicator').count(),0);
   await form.locator('input').fill('Saved');await expect(save).toBeDisabled();
   await form.locator('input').fill('Saved again');await expect(save).toBeEnabled();
   await form.evaluate(node=>window.JovaDirtyForms.saved(node));await expect(save).toBeDisabled();
   await form.locator('input').fill('Another edit');await expect(save).toBeEnabled();
   await save.evaluate(node=>{node.textContent='Saving...';});await settle(page);await expect(save).toBeDisabled();
   await save.evaluate(node=>{node.textContent='Save changes';});await settle(page);await expect(save).toBeEnabled();
   const theme=page.locator('[data-form=workspace-appearance]');await expect(theme.locator('button')).toBeDisabled();await theme.locator('input').fill('Dark');await expect(theme.locator('button')).toBeEnabled();
   await expect(page.locator('[data-form=owner-series] button')).toBeEnabled();
   assert.equal(await page.evaluate(()=>window.fixtureObserver.capped),false);
  }finally{await page.close();}passed++;
 });
 await test('Host eligibility and pending locks survive the pristine lock, including same-value disabled writes',async()=>{
  const page=await fixture();try{await mount(page);const form=page.locator('[data-form=settings]'),save=form.locator('button');
   await expect(save).toBeDisabled();await save.evaluate(node=>{node.disabled=true;});
   await form.locator('input').fill('Changed');await settle(page);await expect(save).toBeDisabled();
   await save.evaluate(node=>{node.disabled=false;});await settle(page);await expect(save).toBeEnabled();
   await form.evaluate(node=>node.setAttribute('aria-busy','true'));await settle(page);await expect(save).toBeDisabled();
   await form.evaluate(node=>node.removeAttribute('aria-busy'));await settle(page);await expect(save).toBeEnabled();
   await save.evaluate(node=>{node.disabled=true;});await settle(page);await expect(save).toBeDisabled();
   await form.evaluate(node=>window.JovaDirtyForms.saved(node));await expect(save).toBeDisabled();
   await save.evaluate(node=>{node.disabled=false;});await settle(page);await expect(save).toBeDisabled();
   assert.equal(await page.evaluate(()=>window.fixtureObserver.capped),false);
  }finally{await page.close();}passed++;
 });
 await test('Self-managed staff and website Save plus Personalise proxy follow authoritative dirty state',async()=>{
  const page=await fixture();try{await mount(page);
   const staff=page.locator('[data-form=staff]'),website=page.locator('[data-form=bw-website]'),proxy=page.locator('[data-action=ws-save-personalise]');
   await expect(staff.locator('button')).toBeDisabled();await expect(website.locator('button')).toBeDisabled();await expect(proxy).toBeDisabled();
   await expect(page.locator('[data-form=sr-message] button')).toBeEnabled();assert.equal(await page.locator('[data-form=sr-message]').getAttribute('data-dirty'),'true','A preserved failed SMS draft cannot be rebased as pristine');
   await staff.evaluate(node=>{node.dataset.dirty='true';});await website.evaluate(node=>{node.dataset.dirty='true';});await settle(page);
   await expect(staff.locator('button')).toBeEnabled();await expect(website.locator('button')).toBeEnabled();await expect(proxy).toBeEnabled();
   await website.evaluate(node=>{node.dataset.dirty='false';});await staff.evaluate(node=>{node.dataset.dirty='false';});await settle(page);
   await expect(staff.locator('button')).toBeDisabled();await expect(website.locator('button')).toBeDisabled();await expect(proxy).toBeDisabled();
   assert.equal(await page.evaluate(()=>window.fixtureObserver.capped),false);
  }finally{await page.close();}passed++;
 });
 await test('Repeated hidden-state synchronization settles without a MutationObserver feedback loop',async()=>{
  const page=await fixture();try{await mount(page);const save=page.locator('[data-form=settings] button');
   await save.evaluate(node=>{node.textContent='Continue';});await settle(page);
   const before=await page.evaluate(()=>window.fixtureObserver.callbacks);
   await page.evaluate(()=>{for(let i=0;i<30;i++)window.JovaDirtyForms.refreshSaveIndicators();});await settle(page);
   assert.equal(await page.evaluate(()=>window.fixtureObserver.callbacks),before);
   assert.equal(await page.evaluate(()=>window.fixtureObserver.capped),false);
  }finally{await page.close();}passed++;
 });
 console.log(`${passed} actual DOM Save regressions passed. Screenshots: ${output}`);
}finally{await browser.close();}
