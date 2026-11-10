import {storyRuntimeSource} from './story-runtime-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {sections, dialogs} from '../app/jovabook/story/sections.mjs';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';

test('story initialization survives effect replay and replaced pricing controls', async () => {
  const source=await storyRuntimeSource();
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    // This fixture never loads the live website or any remote assets.
    await page.route('**/*',route=>route.abort());
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<div id="jova-story-concept">'+sections.join('')+dialogs+'</div>');
    await page.evaluate(({source,portalScreens})=>{
      window.portalScreens=portalScreens;
      window.eval(source+';window.enhanceStory=enhanceStory;');
      window.storyStop=window.enhanceStory(document.getElementById('jova-story-concept'));
    },{source,portalScreens});
    const snapshot=()=>page.evaluate(()=>{
      const host=document.getElementById('jova-story-concept');
      const track=host.querySelector('.vp-reason-track');
      const teamLink=new URL(host.querySelector('a[data-plan="Team"]').href);
      return {
        cards:track.children.length,
        navigations:track.parentElement.querySelectorAll('.vp-swipe-navigation').length,
        dots:[...track.parentElement.querySelectorAll('.vp-swipe-dots')].map(el=>el.children.length),
        annual:host.querySelector('[data-cadence="annual"]').getAttribute('aria-pressed'),
        solo:host.querySelector('#ex-solo-price').textContent,
        team:host.querySelector('#ex-team-price').textContent,
        seats:host.querySelector('#nv-team-count').value,
        checkoutCadence:teamLink.searchParams.get('cadence'),
        checkoutSeats:teamLink.searchParams.get('seats')
      };
    });
    const initial=await snapshot();
    assert.equal(initial.cards,12);
    assert.equal(initial.navigations,1);
    assert.deepEqual(initial.dots,[4]);
    for(let i=0;i<3;i++)await page.evaluate(()=>{
      window.storyStop();
      window.storyStop=window.enhanceStory(document.getElementById('jova-story-concept'));
    });
    assert.deepEqual(await snapshot(),initial);

    await page.locator('#nv-team-plus').click();
    await page.locator('[data-cadence="annual"]').click();
    await page.waitForFunction(()=>new URL(document.querySelector('a[data-plan="Team"]').href).searchParams.get('cadence')==='annual');
    const yearly=await snapshot();
    assert.equal(yearly.solo,'£16');
    assert.equal(yearly.team,'£24.80');
    assert.equal(yearly.seats,'2');
    assert.equal(yearly.checkoutSeats,'2');

    await page.evaluate(()=>{
      const pricing=document.getElementById('ex-pricing');
      const copy=pricing.cloneNode(true);
      copy.querySelector('#nv-team-count').value=pricing.querySelector('#nv-team-count').value;
      pricing.replaceWith(copy);
      window.storyStop=window.enhanceStory(document.getElementById('jova-story-concept'));
    });
    await page.locator('[data-cadence="monthly"]').click();
    await page.waitForFunction(()=>new URL(document.querySelector('a[data-plan="Team"]').href).searchParams.get('cadence')==='monthly');
    const monthly=await snapshot();
    assert.equal(monthly.annual,'false');
    assert.equal(monthly.solo,'£20');
    assert.equal(monthly.team,'£31');
    assert.equal(monthly.checkoutSeats,'2');
    await page.locator('#nv-team-plus').click();
    await page.locator('[data-cadence="annual"]').click();
    await page.waitForFunction(()=>new URL(document.querySelector('a[data-plan="Team"]').href).searchParams.get('cadence')==='annual');
    const replacedYearly=await snapshot();
    assert.equal(replacedYearly.annual,'true');
    assert.equal(replacedYearly.solo,'£16');
    assert.equal(replacedYearly.team,'£29.60');
    assert.equal(replacedYearly.seats,'3');
    assert.equal(replacedYearly.checkoutSeats,'3');
    assert.equal(replacedYearly.cards,12);
    assert.equal(replacedYearly.navigations,1);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});
