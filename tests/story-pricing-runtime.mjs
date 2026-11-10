import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {pricingMarkup} from '../app/jovabook/story/pricing-markup.mjs';
import {storyRuntimeSource} from './story-runtime-source.mjs';

test('standalone pricing keeps displayed totals and checkout selections together without requests',async()=>{
 const source=await storyRuntimeSource(),browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage(),requests=[],errors=[];
  await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent(`<main class="jovabook-story"><div id="jova-story-concept">${pricingMarkup}</div></main>`);
  await page.evaluate(source+';window.stopPricing=enhancePricing(document.getElementById("jova-story-concept"));');
  const selection=()=>page.evaluate(()=>({solo:document.getElementById('ex-solo-price').textContent,team:document.getElementById('ex-team-price').textContent,billing:document.getElementById('ex-team-billing').textContent,urls:[...document.querySelectorAll('[data-plan]')].map(link=>({plan:link.dataset.plan,url:link.href}))}));
  assert.equal((await selection()).team,'£25');
  await page.locator('#nv-team-plus').click();
  assert.equal((await selection()).team,'£31');
  await page.locator('[data-cadence="annual"]').click();
  let state=await selection();
  assert.equal(state.solo,'£16');assert.equal(state.team,'£24.80');assert.equal(state.billing,'£297.60 billed yearly for 2 seats.');
  for(const item of state.urls){const url=new URL(item.url);assert.equal(url.searchParams.get('cadence'),item.plan==='Free'?'monthly':'annual');assert.equal(url.hash,'#signup');if(item.plan==='Team')assert.equal(url.searchParams.get('seats'),'2');}
  await page.locator('#nv-team-count').fill('100');
  state=await selection();assert.equal(state.team,'£495.20');assert.equal(new URL(state.urls[2].url).searchParams.get('seats'),'100');assert.equal(await page.locator('#nv-team-plus').isDisabled(),true);
  await page.locator('#nv-team-count').fill('1');
  await page.locator('[data-cadence="monthly"]').click();
  state=await selection();assert.equal(state.team,'£25');assert.equal(await page.locator('#nv-team-minus').isDisabled(),true);
  await page.evaluate(()=>{window.stopPricing();window.stopPricing=enhancePricing(document.getElementById('jova-story-concept'));});
  await page.locator('#nv-team-plus').click();assert.equal((await selection()).team,'£31');
  assert.equal(await page.locator('.nr-price-details').count(),1);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 }finally{await browser.close();}
});
