import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

test('actual local customer stories accept touch and mouse swipes without taking vertical scroll or taps',async()=>{
 const base=process.env.STORY_TEST_URL||'http://127.0.0.1:3000',origin=new URL(base).origin;
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  for(const width of [360,390,1440]){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<701,reducedMotion:'reduce'}),page=await context.newPage();
   await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.vp-unified-calculator').waitFor();
   const grid=page.locator('.cs-grid'),featured=()=>page.locator('.cs-card[data-story-state=featured] .cs-author strong').innerText();
   const check=name=>page.waitForFunction(name=>document.querySelector('.cs-card[data-story-state=featured] .cs-author strong').textContent===name,name);
   const cdp=await context.newCDPSession(page);
   async function touch(dx,dy){await grid.scrollIntoViewIfNeeded();const box=await grid.boundingBox(),x=box.x+box.width*.65,y=Math.max(100,box.y+90);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let step=1;step<=6;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/6,y:y+dy*step/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   await touch(-110,4);await check('Charmaine Dias');await touch(110,4);await check('Keith Loddy');
   await touch(-70,100);assert.equal(await featured(),'Keith Loddy','Diagonal movement keeps the story');
   await grid.scrollIntoViewIfNeeded();const scrollBefore=await page.evaluate(()=>scrollY);await touch(4,-110);assert.equal(await featured(),'Keith Loddy','Vertical movement keeps the story');assert(Math.abs(await page.evaluate(()=>scrollY)-scrollBefore)>20,'Vertical movement scrolls the page');
   await grid.scrollIntoViewIfNeeded();const box=await grid.boundingBox(),x=box.x+box.width*.7,y=box.y+90;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-110,y+2,{steps:6});await page.mouse.up();await check('Charmaine Dias');
   await page.mouse.move(x-110,y);await page.mouse.down();await page.mouse.move(x,y+2,{steps:6});await page.mouse.up();await check('Keith Loddy');
   await page.getByRole('button',{name:'Next customer story',exact:true}).click();await check('Charmaine Dias');await page.getByRole('button',{name:'Previous customer story',exact:true}).click();await check('Keith Loddy');
   await grid.focus();await page.keyboard.press('End');await check('Paul Smith');await page.keyboard.press('Home');await check('Keith Loddy');
   assert.equal(await grid.evaluate(el=>getComputedStyle(el).touchAction),'pan-y pinch-zoom');assert.equal(await page.locator('.cs-story-body').first().evaluate(el=>getComputedStyle(el).animationName),'none');
   if(width<701){for(const selector of ['.vp-reason-track','.ex-capabilities.vp-swipe-track','.vp-industry-photos']){const track=page.locator(selector),navigation=track.locator('xpath=following-sibling::*[1]');await track.scrollIntoViewIfNeeded();await page.waitForTimeout(220);const before=await track.getAttribute('data-active-index');assert.equal(await navigation.locator('.vp-swipe-arrow').count(),2);await navigation.locator('.vp-swipe-arrow').last().click();await page.waitForTimeout(240);assert.notEqual(await track.getAttribute('data-active-index'),before,'Next arrow changes '+selector);await navigation.locator('.vp-swipe-arrow').first().click();await page.waitForTimeout(240);assert.equal(await track.getAttribute('data-active-index'),before,'Previous arrow restores '+selector);}}
   else assert.equal(await page.locator('.vp-swipe-navigation:visible').count(),0,'Desktop grids have no carousel controls');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await context.close();
  }
 }finally{await browser.close();}
});
